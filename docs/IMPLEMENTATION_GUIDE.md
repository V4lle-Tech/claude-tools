# Guía de Implementación: Monitoreo de Procesos en Bun

**Referencia cruzada:** Ver `PROCESS_MONITORING_INVESTIGATION.md` para análisis detallado.

---

## Resumen Ejecutivo

Para detectar y monitorear procesos en segundo plano en Bun, hay 3 métodos prácticos:

| Método | Cuándo Usarlo | Complejidad | Costo |
|--------|---------------|-----------|-------|
| **File-based State** | Persistencia entre procesos | 🟢 Baja | Bajo (I/O) |
| **Env Variables** | Metadata pequeña/flags | 🟢 Baja | Nulo |
| **stdout/stderr Pipes** | Comunicación proceso hijo | 🟢 Baja | Bajo |
| Global Map (en-memoria) | Tracking de corta vida | 🟢 Muy Baja | Nulo |

---

## 1️⃣ Implementación: File-Based State (RECOMENDADO)

### Descripción Rápida
Guardar estado de procesos en archivos JSON con TTL automático.

**Archivos Relacionados:**
- `/workspaces/shared/utils/cache-manager.ts` ← Implementación base (reutilizar)
- `/workspaces/shared/utils/index.ts` ← Exportar nuevas utilidades

### Solución Rápida (5 minutos)

Crear `/workspaces/shared/utils/process-monitor.ts`:

```typescript
/**
 * Process Monitor - Rastrea procesos spawned usando archivos de estado
 * Reutiliza CacheManager para I/O
 */

import { CacheManager } from './cache-manager';

export interface ProcessRecord {
  pid: number;
  cmd: string[];
  startedAt: number;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
  stderr?: string;
}

export class ProcessMonitor {
  private cache: CacheManager;
  private localProcesses: Map<number, ProcessRecord> = new Map();

  constructor(cacheDir = '/tmp/process-monitor') {
    this.cache = new CacheManager(cacheDir);
  }

  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  /**
   * Registrar y ejecutar proceso spawned
   */
  async spawnProcess(cmd: string[], options?: any): Promise<number> {
    const proc = Bun.spawn(cmd, {
      stdout: options?.stdout || 'pipe',
      stderr: options?.stderr || 'pipe',
      ...options,
    });

    const record: ProcessRecord = {
      pid: proc.pid,
      cmd,
      startedAt: Date.now(),
      status: 'running',
    };

    this.localProcesses.set(proc.pid, record);
    await this.saveProcess(record);

    // Esperar completación asincronamente
    proc.exited.then(async (code) => {
      record.status = code === 0 ? 'completed' : 'failed';
      record.exitCode = code;

      if (code !== 0 && proc.stderr) {
        try {
          record.stderr = await new Response(proc.stderr).text();
        } catch {
          // Ignorar si no se puede leer stderr
        }
      }

      await this.saveProcess(record);
    });

    return proc.pid;
  }

  /**
   * Obtener procesos activos
   */
  async getActiveProcesses(): Promise<ProcessRecord[]> {
    return Array.from(this.localProcesses.values())
      .filter(p => p.status === 'running');
  }

  /**
   * Obtener historial de procesos
   */
  async getProcessHistory(): Promise<ProcessRecord[]> {
    return Array.from(this.localProcesses.values());
  }

  private async saveProcess(record: ProcessRecord): Promise<void> {
    await this.cache.set(
      `process-${record.pid}`,
      record,
      record.status === 'running' ? 300 : 3600 // 5min si activo, 1h si terminado
    );
  }
}
```

### Exportar desde shared/utils:

**Archivo:** `/workspaces/shared/utils/index.ts`:

```typescript
export { CacheManager } from './cache-manager';
export { SettingsUpdater } from './settings-updater';
export { CredentialReader } from './credential-reader';
export { ProcessMonitor, type ProcessRecord } from './process-monitor'; // NUEVO
```

### Usar en Tu Plugin:

```typescript
import { ProcessMonitor } from '@claude-tools/shared/utils';

const monitor = new ProcessMonitor();
await monitor.initialize();

// Ejecutar proceso monitorizado
const pid = await monitor.spawnProcess(['git', 'status']);

// Chequear estado
const active = await monitor.getActiveProcesses();
console.log(`${active.length} procesos activos`);
```

---

## 2️⃣ Implementación: Env Variables Tracking

### Descripción Rápida
Pasar metadata pequeña entre procesos padre-hijo vía `process.env`.

### Solución Rápida (3 minutos)

```typescript
// Crear archivo: /workspaces/shared/utils/process-env.ts

export interface ProcessMetadata {
  parentPid: number;
  sessionId: string;
  taskId?: string;
  config?: Record<string, string>;
}

export function encodeProcessMetadata(meta: ProcessMetadata): Record<string, string> {
  return {
    ...process.env,
    PROCESS_PARENT_PID: meta.parentPid.toString(),
    PROCESS_SESSION_ID: meta.sessionId,
    ...(meta.taskId && { PROCESS_TASK_ID: meta.taskId }),
    ...(meta.config && { PROCESS_CONFIG: JSON.stringify(meta.config) }),
  };
}

export function decodeProcessMetadata(): ProcessMetadata | null {
  if (!process.env.PROCESS_SESSION_ID) return null;

  return {
    parentPid: parseInt(process.env.PROCESS_PARENT_PID || '0'),
    sessionId: process.env.PROCESS_SESSION_ID,
    taskId: process.env.PROCESS_TASK_ID,
    config: process.env.PROCESS_CONFIG ? JSON.parse(process.env.PROCESS_CONFIG) : undefined,
  };
}
```

### Usar:

```typescript
import { encodeProcessMetadata } from '@claude-tools/shared/utils';

// Proceso padre
const proc = Bun.spawn(['bun', 'child.ts'], {
  env: encodeProcessMetadata({
    parentPid: process.pid,
    sessionId: 'session-123',
    taskId: 'task-456',
  }),
});

// ---

// Proceso hijo (child.ts)
import { decodeProcessMetadata } from '@claude-tools/shared/utils';

const meta = decodeProcessMetadata();
console.log(`Mi padre es: ${meta?.parentPid}`);
```

---

## 3️⃣ Implementación: Letura de State from stdin (Para Plugins)

### Descripción Rápida
Usar datos oficiales de Claude Code para detectar agentes y sesiones.

### Solución Rápida (2 minutos)

**Archivo:** `/workspaces/shared/utils/claude-session.ts`:

```typescript
/**
 * Utilidades para trackear sesiones de Claude Code
 */

import { CacheManager } from './cache-manager';
import type { ClaudeStdinData } from '../types';

export interface SessionInfo {
  sessionId: string;
  agentName?: string;
  startedAt: number;
  modelId: string;
  contextUsage: number;
}

export class SessionTracker {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager('/tmp/claude-sessions');
  }

  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  /**
   * Actualizar información de sesión desde stdin de Claude Code
   */
  async trackSession(data: ClaudeStdinData): Promise<void> {
    const sessionInfo: SessionInfo = {
      sessionId: data.session_id,
      agentName: data.agent?.name,
      startedAt: (await this.getSessionStart(data.session_id)) || Date.now(),
      modelId: data.model.id,
      contextUsage: data.context_window.used_percentage || 0,
    };

    await this.cache.set(
      `session-${data.session_id}`,
      sessionInfo,
      3600 // Session persists for 1 hour
    );
  }

  /**
   * Obtener información de sesión
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    return this.cache.get<SessionInfo>(`session-${sessionId}`);
  }

  /**
   * Detectar si hay agentes activos
   */
  async isAgentActive(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session?.agentName !== undefined && session.agentName !== null;
  }

  private async getSessionStart(sessionId: string): Promise<number | null> {
    const existing = await this.getSession(sessionId);
    return existing?.startedAt || null;
  }
}
```

### Usar en Statusline:

```typescript
import { SessionTracker } from '@claude-tools/shared/utils';
import type { ClaudeStdinData } from '@claude-tools/shared/types';

const tracker = new SessionTracker();
await tracker.initialize();

async function main() {
  const stdinText = await Bun.stdin.text();
  const data: ClaudeStdinData = JSON.parse(stdinText);

  await tracker.trackSession(data);

  const hasAgent = await tracker.isAgentActive(data.session_id);
  if (hasAgent) {
    const session = await tracker.getSession(data.session_id);
    console.log(`Agente activo: ${session?.agentName}`);
  }

  // Tu lógica del plugin aquí
}
```

---

## 4️⃣ Patrón: Global Process Registry

### Descripción Rápida
Mantener un registro en memoria de procesos activos (sin persistencia).

### Solución (Inline):

```typescript
// En tu main.ts o index.ts

interface ProcessInfo {
  pid: number;
  cmd: string[];
  startedAt: number;
}

const ACTIVE_PROCESSES = new Map<number, ProcessInfo>();

async function spawnTrackedProcess(cmd: string[]): Promise<number> {
  const proc = Bun.spawn(cmd, { /* ... */ });

  ACTIVE_PROCESSES.set(proc.pid, {
    pid: proc.pid,
    cmd,
    startedAt: Date.now(),
  });

  // Cleanup cuando termina
  proc.exited.then(() => {
    ACTIVE_PROCESSES.delete(proc.pid);
  });

  return proc.pid;
}

export function getActiveProcesses(): ProcessInfo[] {
  return Array.from(ACTIVE_PROCESSES.values());
}
```

**Ventajas:**
- ✅ Cero I/O
- ✅ Instantáneo
- ✅ Simple

**Desventajas:**
- ❌ Se pierde al reiniciar script
- ❌ No compartible entre procesos

---

## 5️⃣ Patrón: Lectura de Stdout/Stderr

### Descripción Rápida
Capturar output de procesos hijo para obtener estado.

### Solución:

```typescript
interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function executeWithCapture(
  cmd: string[],
  options?: any
): Promise<ProcessResult> {
  const proc = Bun.spawn(cmd, {
    stdout: 'pipe',
    stderr: 'pipe',
    ...options,
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

// Usar
const result = await executeWithCapture(['git', 'status']);
if (result.exitCode !== 0) {
  console.error(`Error: ${result.stderr}`);
} else {
  console.log(result.stdout);
}
```

---

## Recomendación por Caso de Uso

### "Necesito detectar procesos spawned en mi plugin"
**→ Usa Opción 2 + Opción 3:** Env vars + stdin data

```typescript
async function main() {
  const data = JSON.parse(await Bun.stdin.text());

  // Tracking
  const tracker = new SessionTracker();
  await tracker.trackSession(data);

  // Spawn con metadata
  const env = encodeProcessMetadata({
    parentPid: process.pid,
    sessionId: data.session_id,
  });

  Bun.spawn(cmd, { env });
}
```

### "Necesito persistir estado entre ejecuciones"
**→ Usa Opción 1:** File-based cache

```typescript
const monitor = new ProcessMonitor();
await monitor.spawnProcess(['build-script.ts']);
```

### "Necesito comunicar estado entre procesos spawned"
**→ Usa Opción 1 + Opción 2:** Combina cache + env

```typescript
// Parent
const cache = new CacheManager();
await cache.set('shared-state', { progress: 0 }, 300);

const env = encodeProcessMetadata({
  parentPid: process.pid,
  config: { stateKey: 'shared-state' },
});

Bun.spawn(['child.ts'], { env });

// Child
const meta = decodeProcessMetadata();
const state = await cache.get(meta.config.stateKey);
```

---

## Checklist de Implementación

### Para Opción 1 (File-based State)
- [ ] Crear `ProcessMonitor` class
- [ ] Reutilizar `CacheManager`
- [ ] Exportar desde `/workspaces/shared/utils/index.ts`
- [ ] Agregar tipos a `ProcessRecord`
- [ ] Escribir tests en package que lo use
- [ ] Documentar en README del plugin

### Para Opción 2 (Env Variables)
- [ ] Crear `process-env.ts` utilities
- [ ] Definir `ProcessMetadata` interface
- [ ] Implementar encode/decode functions
- [ ] Exportar desde `index.ts`
- [ ] Tests para encoding/decoding
- [ ] Documentar limits (8KB en env)

### Para Opción 3 (stdin Tracking)
- [ ] Crear `SessionTracker` class
- [ ] Reutilizar `CacheManager`
- [ ] Integrar con datos de stdin
- [ ] Exportar tipos `SessionInfo`
- [ ] Usar en statusline/context-analyzer
- [ ] Documentar campos disponibles

---

## Ejemplos: Plantillas Listas para Copiar

### Template 1: Plugin Monitor de Proceso

```typescript
// packages/my-plugin/src/index.ts

import { ProcessMonitor } from '@claude-tools/shared/utils';
import type { ClaudeStdinData } from '@claude-tools/shared/types';

async function main() {
  const data: ClaudeStdinData = JSON.parse(await Bun.stdin.text());

  const monitor = new ProcessMonitor();
  await monitor.initialize();

  // Ejecutar tarea
  const pid = await monitor.spawnProcess(
    ['bun', 'build'],
    { cwd: '/workspaces' }
  );

  // Reportar estado
  const active = await monitor.getActiveProcesses();
  console.log(`Procesos en ejecución: ${active.length}`);
}

if (import.meta.main) {
  main().catch(console.error);
}
```

### Template 2: Comunicación Padre-Hijo

```typescript
// parent.ts
import { encodeProcessMetadata } from '@claude-tools/shared/utils';

async function runChildTask(sessionId: string) {
  const env = encodeProcessMetadata({
    parentPid: process.pid,
    sessionId,
    taskId: `task-${Date.now()}`,
  });

  const proc = Bun.spawn(['bun', 'child.ts'], { env });
  return await proc.exited;
}

// ---

// child.ts
import { decodeProcessMetadata } from '@claude-tools/shared/utils';

const meta = decodeProcessMetadata();
console.log(`Heredé sesión: ${meta?.sessionId}`);
console.log(`Mi tarea: ${meta?.taskId}`);
```

### Template 3: Monitoreo de Agentes Claude

```typescript
// agent-watcher.ts
import { SessionTracker } from '@claude-tools/shared/utils';
import type { ClaudeStdinData } from '@claude-tools/shared/types';

async function main() {
  const data: ClaudeStdinData = JSON.parse(await Bun.stdin.text());

  const tracker = new SessionTracker();
  await tracker.initialize();

  await tracker.trackSession(data);

  if (await tracker.isAgentActive(data.session_id)) {
    const session = await tracker.getSession(data.session_id);
    console.log(`Agente detectado: ${session?.agentName}`);
    console.log(`Contexto: ${session?.contextUsage}%`);
  }
}

main().catch(console.error);
```

---

## Testing

### Test ProcessMonitor

```typescript
// tests/process-monitor.test.ts

import { describe, it, expect } from 'bun:test';
import { ProcessMonitor } from '../src/process-monitor';

describe('ProcessMonitor', () => {
  it('should track spawned processes', async () => {
    const monitor = new ProcessMonitor();
    await monitor.initialize();

    const pid = await monitor.spawnProcess(['echo', 'hello']);
    const active = await monitor.getActiveProcesses();

    setTimeout(() => {
      expect(active.length).toBe(1);
    }, 50);
  });

  it('should persist process state', async () => {
    const monitor = new ProcessMonitor();
    await monitor.initialize();

    const pid = await monitor.spawnProcess(['echo', 'test']);

    // Esperar terminar
    await new Promise(r => setTimeout(r, 100));

    const history = await monitor.getProcessHistory();
    expect(history.some(p => p.pid === pid)).toBe(true);
  });
});
```

---

## FAQ

**P: ¿Qué pasa si el proceso se finaliza de forma inesperada?**
R: El archivo en cache permanecerá con TTL. Después de expirar se eliminará automáticamente.

**P: ¿Puedo compartir el cache entre plugins?**
R: Sí, pero usa directorios diferentes para evitar conflictos de keys.

**P: ¿Es seguro usar Bun.spawn simultáneamente desde múltiples procesos?**
R: Sí, Bun maneja correctamente spawning concurrente. El estado de archivos será consistente.

**P: ¿Cuál es el overhead de usar file-based tracking?**
R: Mínimo (~1-5ms por operación con SSD). Use env vars para tracking crítico en tiempo real.

**P: ¿Cómo integro esto con CI/CD?**
R: El ProcessMonitor es agnóstico a CI/CD. Solo guarda metadata en /tmp, sin efectos secundarios.

---

**Documento Generado:** Febrero 10, 2024
**Referencia:** `/workspaces/docs/PROCESS_MONITORING_INVESTIGATION.md`
