# Investigación: Detección y Monitoreo de Procesos en Bun

**Fecha:** Febrero 10, 2024
**Investigación:** Opciones técnicas viables para detectar y monitorear procesos/tareas en segundo plano en Bun (JavaScript Runtime)

---

## Índice
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Opciones por Viabilidad](#opciones-por-viabilidad)
3. [Análisis Detallado por Opción](#análisis-detallado-por-opción)
4. [Integración con Claude Code](#integración-con-claude-code)
5. [Patrones en Este Codebase](#patrones-en-este-codebase)
6. [Recomendación Final](#recomendación-final)
7. [Ejemplos de Código](#ejemplos-de-código)

---

## Resumen Ejecutivo

En Bun, la detección de procesos spawned en segundo plano es limitada sin mecanismos específicos. Las opciones viables se dividen en:

1. **Más Viables**: File-based tracking (cache/estado), variables de entorno, stdin data de Claude Code
2. **Moderadamente Viables**: APIs internas de Bun (limitadas), WeakMap para tracking
3. **Menos Viables**: Sockets UNIX, named pipes (no es el propósito de Bun para plugins)

La mejor práctica identificada es **file-based state tracking con CacheManager**, que es exactamente lo que este codebase ya implementa.

---

## Opciones por Viabilidad

### Tabla de Comparación Rápida

| Opción | Viabilidad | Complejidad | Costo | Claude Code Integration | Recomendé |
|--------|-----------|------------|-------|-------------------------|-----------|
| Cache File-based | ⭐⭐⭐⭐⭐ | Baja | Muy Bajo | ✅ Nativa stdin | ✅ **SÍ** |
| Variables de Entorno | ⭐⭐⭐⭐ | Baja | Muy Bajo | ✅ Heredadas | ✅ Complementaria |
| stdin Data (Claude Code) | ⭐⭐⭐⭐⭐ | Baja | Nulo | ✅ Nativa | ✅ **SÍ** |
| WeakMap Global Tracking | ⭐⭐⭐ | Media | Bajo | ❌ No-persistente | ⚠️ Parcial |
| APIs Internas de Bun | ⭐⭐ | Alta | Riesgo | ❌ Inestables | ❌ NO |
| Sockets UNIX | ⭐⭐ | Muy Alta | Medio | ⚠️ Compleja | ❌ NO |
| Named Pipes | ⭐ | Extrema | Alto | ⚠️ Muy compleja | ❌ NO |

---

## Análisis Detallado por Opción

### OPCIÓN 1: File-Based State Tracking (RECOMENDADO)

**Viabilidad:** ⭐⭐⭐⭐⭐ (Implementado en este codebase)

#### Descripción
Usar archivos JSON en `/tmp` o `~/.cache` para almacenar estado de procesos activos con TTL y metadatos.

#### Cómo funciona:
```
1. Proceso padre crea archivo JSON con datos del proceso spawned
2. Archivo incluye: PID, comando, timestamp, metadatos
3. Proceso hijo puede leer/actualizar el archivo
4. TTL automático limpia archivos antiguos
5. Múltiples procesos pueden leer el mismo archivo
```

#### Ventajas:
- ✅ Completamente funcional en Bun
- ✅ Persiste entre re-inicios de scripts
- ✅ Multi-proceso compatible (sincronización basada en archivos)
- ✅ Ya implementado en este codebase (`CacheManager`)
- ✅ Fácil de debuggear (archivos visibles)
- ✅ No requiere APIs especiales
- ✅ Cero dependencias

#### Desventajas:
- ⚠️ Requiere I/O de disco (lentitud relativa)
- ⚠️ Sincronización débil entre procesos
- ⚠️ Limpieza manual necesaria

#### Código en Codebase:
**Archivo:** `/workspaces/shared/utils/cache-manager.ts` (líneas 46-90)

```typescript
async get<T>(key: string): Promise<T | null> {
  try {
    const filePath = this.getFilePath(key);
    const file = Bun.file(filePath);

    const exists = await file.exists();
    if (!exists) return null;

    const entry: CacheEntry<T> = await file.json();

    // TTL checking
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}
```

#### Caso de Uso en Este Codebase:
- Statusline caches git status, API calls, metrics
- Session ID tracking (`cleanup-${data.session_id}`)
- Performance metrics storage

---

### OPCIÓN 2: Variables de Entorno

**Viabilidad:** ⭐⭐⭐⭐ (Funcional pero limitada)

#### Descripción
Usar `process.env` para comunicar estado entre procesos, especialmente para data pequeña y flags.

#### Cómo funciona:
```bash
# Proceso padre
export ACTIVE_PROCESSES='{"pids":[1234,5678],"updated":1707000000}'
bun run child.ts

# Proceso hijo
echo $ACTIVE_PROCESSES | jq '.'
```

#### Ventajas:
- ✅ Instantáneo (sin I/O)
- ✅ Simple de implementar
- ✅ Heredado a procesos spawned
- ✅ Visibles en `env` CLI
- ✅ No requiere permisos especiales

#### Desventajas:
- ❌ Límite de tamaño (~8KB en sistemas típicos)
- ❌ No persiste después de proceso
- ❌ No se sincroniza entre procesos independientes
- ⚠️ Requiere JSON strings (parsing overhead)
- ⚠️ No soporta caracteres especiales sin escaping

#### Caso de Uso Potencial:
- Flags de configuración
- Session IDs
- Paths compartidos

#### Ejemplo:
```typescript
// Proceso padre
const processInfo = { pid: Bun.pid, startedAt: Date.now() };
process.env.PROCESS_TRACKING = JSON.stringify(processInfo);

const proc = Bun.spawn(['bun', 'child.ts'], {
  env: process.env,
  stdout: 'pipe',
});

// Proceso hijo (child.ts)
const tracking = JSON.parse(process.env.PROCESS_TRACKING || '{}');
console.log(`Parent spawned at: ${tracking.startedAt}`);
```

---

### OPCIÓN 3: stdin Data de Claude Code (RECOMENDADO PARA PLUGINS)

**Viabilidad:** ⭐⭐⭐⭐⭐ (Nativa en Claude Code)

#### Descripción
Usar datos enviados por Claude Code a través de stdin para detectar agentes y sesiones activas.

#### Datos Disponibles:

```typescript
export interface ClaudeStdinData {
  session_id: string;           // ← Único por sesión
  agent?: {
    name: string;               // ← Nombre del agente si está activo
  };
  transcript_path: string;      // ← Acceso al historial
  version: string;              // ← Versión de Claude Code
  cwd: string;                  // ← Directorio actual
  model: {
    id: string;
    display_name: string;
  };
  context_window: { /* ... */ };
  cost: { /* ... */ };
  // ... más campos
}
```

#### Cómo funciona:
```typescript
async function main() {
  const stdinText = await Bun.stdin.text();
  const data: ClaudeStdinData = JSON.parse(stdinText);

  // Detectar agentes activos
  if (data.agent?.name) {
    console.log(`Agente activo: ${data.agent.name}`);
  }

  // Guardar estado
  const cache = new CacheManager();
  await cache.set(`session-${data.session_id}`, {
    agent: data.agent?.name || null,
    timestamp: Date.now(),
  }, 3600); // 1 hora TTL
}
```

#### Ventajas:
- ✅ Data oficial de Claude Code
- ✅ Actualización automática con cada render
- ✅ Incluye información de agentes
- ✅ Acceso a transcript_path
- ✅ Zero-costo (datos ya enviados)
- ✅ Implementado en statusline ya

#### Desventajas:
- ⚠️ Solo para plugins statusline/hooks
- ⚠️ Data solo cuando Claude Code llama
- ❌ No detecta procesos de otros plugins
- ❌ No es tiempo real para procesos internos

#### Ubicación en Codebase:
**Archivo:** `/workspaces/packages/statusline/src/types/claude-stdin.ts`

---

### OPCIÓN 4: WeakMap Global para Tracking

**Viabilidad:** ⭐⭐⭐ (Funciona pero no-persistente)

#### Descripción
Usar una variable global WeakMap para rastrear procesos activos durante la ejecución.

#### Cómo funciona:
```typescript
// shared/utils/process-registry.ts
const processRegistry = new WeakMap<any, ProcessInfo>();

export function registerProcess(handle: any, info: ProcessInfo) {
  processRegistry.set(handle, info);
}

export function getActiveProcesses(): ProcessInfo[] {
  // No hay forma de iterar WeakMap...
  // Necesitarías mantener un Set paralelo
}
```

#### Ventajas:
- ✅ Automáticamente garbage collected
- ✅ Sin impacto de memoria
- ✅ Type-safe en TypeScript

#### Desventajas:
- ❌ No iterable (WeakMap design)
- ❌ No persiste entre procesos
- ❌ No es real time para múltiples procesos
- ⚠️ Requiere Set/Map paralelo para tracking
- ⚠️ Complejidad extra

#### Verdadera Implementación Funcional:

```typescript
// Mantener registro paralelo
const activeProcesses = new Map<number, ProcessInfo>();
const processRegistry = new WeakMap<any, ProcessInfo>();

export function registerProcess(handle: any, info: ProcessInfo) {
  processRegistry.set(handle, info);
  activeProcesses.set(handle.pid, info);
}

export function getActiveProcesses(): ProcessInfo[] {
  return Array.from(activeProcesses.values())
    .filter(p => isStillRunning(p.pid));
}
```

---

### OPCIÓN 5: APIs Internas de Bun (NO RECOMENDADO)

**Viabilidad:** ⭐⭐ (Riesgoso, inestable)

#### Descripción
Usar APIs internas no documentadas de Bun para acceso a runtime internals.

#### Potenciales APIs:
```typescript
// ⚠️ TODAS ESTAS SON INTERNAS Y NO DOCUMENTADAS
const bunRuntime = (globalThis as any).Bun;
const processes = bunRuntime.__internal__?.subprocess?.active;
const tasks = bunRuntime.__internal__?.taskQueue?.pending;
```

#### Problemas:
- ❌ APIs internas, pueden cambiar sin previo aviso
- ❌ No documentadas
- ❌ Rompen entre versiones de Bun
- ⚠️ Comportamiento indefinido
- ⚠️ No soportadas

#### Ventajas Teóricas:
- ✅ Acceso directo a runtime internals
- ✅ Sin overhead de I/O

#### NO SE RECOMIENDA - Riesgo muy alto

---

### OPCIÓN 6: Sockets UNIX / Named Pipes

**Viabilidad:** ⭐⭐ (Posible pero innecesario)

#### Descripción
Usar sockets UNIX para comunicación inter-proceso persistente.

#### Cómo Funciona:
```typescript
import { createServer } from 'net';
import { join } from 'path';

const socketPath = '/tmp/process-monitor.sock';

// Servidor
const server = createServer((socket) => {
  socket.on('data', (data) => {
    const request = JSON.parse(data.toString());
    // Procesar solicitud de proceso
  });
});

server.listen(socketPath, () => {
  console.log(`Escuchando en ${socketPath}`);
});

// Cliente
import { createConnection } from 'net';

const client = createConnection(socketPath);
client.write(JSON.stringify({ action: 'register_process', pid: process.pid }));
```

#### Ventajas:
- ✅ Comunicación bidireccional
- ✅ Múltiples conexiones
- ✅ Datos en tiempo real

#### Desventajas:
- ❌ Overkill para este caso de uso
- ❌ Servidor siempre activo requerido
- ⚠️ Limpieza de sockets necesaria
- ⚠️ Permisos de acceso a gestionar
- ⚠️ Debugging más complejo

#### NO SE RECOMIENDA - Complejidad innecesaria

---

### OPCIÓN 7: Named Pipes (FIFO)

**Viabilidad:** ⭐ (Extremadamente complejo)

#### Descripción
Usar named pipes (FIFO) en Linux/macOS para comunicación.

#### Problemas:
- ❌ Requiere `mkfifo` antes de usar
- ❌ Bun no tiene soporte nativo robusto
- ❌ Bloqueante por naturaleza
- ❌ Requiere threading para multiprocess
- ❌ Altamente complejo de implementar

#### NO SE RECOMIENDA - Innecesario y complejo

---

## Integración con Claude Code

### Datos Disponibles de Claude Code

Cuando Claude Code llama al statusline, proporciona:

```json
{
  "session_id": "session_abc123def456",
  "agent": {
    "name": "Example Agent"  // ← Detecta agentes activos
  },
  "transcript_path": "/path/to/transcript.md",
  "version": "0.0.1",
  "model": { "id": "claude-opus", "display_name": "Claude Opus" },
  "workspace": { "current_dir": "/workspaces", "project_dir": "/workspaces" },
  "cwd": "/workspaces",
  "cost": {
    "total_cost_usd": 0.42,
    "total_duration_ms": 125000,
    "total_api_duration_ms": 85000,
    "total_lines_added": 1250,
    "total_lines_removed": 340
  },
  "context_window": {
    "total_input_tokens": 45000,
    "total_output_tokens": 18000,
    "context_window_size": 200000,
    "used_percentage": 31.5,
    "remaining_percentage": 68.5,
    "current_usage": {
      "input_tokens": 12000,
      "output_tokens": 5000,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 0
    }
  },
  "exceeds_200k_tokens": false,
  "output_style": { "name": "default" },
  "vim": { "mode": "NORMAL" }
}
```

### Monitoreo de Estado de Agentes

Para detectar agentes activos, combina:

1. **stdin data**: `agent?.name` del Claude Code
2. **transcript_path**: Leer última línea para detectar actividad
3. **session_id**: Usar para agrupar sesiones

```typescript
// Detectar agentes activos
const activeAgents = new Map<string, AgentSession>();

async function trackAgent(data: ClaudeStdinData) {
  const sessionKey = data.session_id;

  if (data.agent?.name) {
    activeAgents.set(sessionKey, {
      name: data.agent.name,
      startedAt: Date.now(),
      model: data.model.id,
      contextUsage: data.context_window.used_percentage || 0,
    });

    // Guardar en cache para persistencia
    await cache.set(`agent-${sessionKey}`, activeAgents.get(sessionKey), 3600);
  } else {
    // Agente inactivo, remover
    activeAgents.delete(sessionKey);
  }
}
```

---

## Patrones en Este Codebase

### 1. CacheManager (Implementación Actual)

**Ubicación:** `/workspaces/shared/utils/cache-manager.ts`

El codebase ya implementa opción #1 (File-based tracking):

```typescript
export class CacheManager {
  private readonly cacheDir: string = '/tmp/claude-statusline-cache';

  async get<T>(key: string): Promise<T | null> { /* ... */ }
  async set<T>(key: string, data: T, ttlSeconds: number) { /* ... */ }
  async delete(key: string) { /* ... */ }
  async clear() { /* ... */ }
}
```

**Uso en statusline:**
- Cache git status (5s TTL)
- Cache API calls (60s TTL)
- Cache performance metrics
- Track session cleanup

### 2. stdin Tracking

**Ubicación:** `/workspaces/packages/statusline/src/index.ts` (línea 23-24)

```typescript
const stdinText = await Bun.stdin.text();
const data: ClaudeStdinData = JSON.parse(stdinText);
```

Se usa para:
- Detectar `session_id`
- Obtener `agent?.name`
- Acceder a `transcript_path`
- Limpiar cache por sesión

### 3. Process Spawning

**Ubicación:** `/workspaces/tools/build-all.ts` (línea 35-41)

```typescript
const proc = Bun.spawn(['bun', 'run', 'build'], {
  cwd: pkgPath,
  stdout: 'inherit',
  stderr: 'inherit',
});

const exitCode = await proc.exited;
```

Patrón utilizado:
- Spawn con env/cwd específico
- Esperar `proc.exited` para sincronización
- No threads/workers necesarios

---

## Recomendación Final

### Para Plugins Claude Code (Recomendación Principal)

**Usar combinación de:**

1. **stdin Data (Opción 3)** → Información oficial de Claude Code
2. **File-based State (Opción 1)** → Persistencia entre calls
3. **Variables de Entorno (Opción 2)** → Metadata pequeña

```typescript
// Implementación Recomendada
import { CacheManager } from '@claude-tools/shared/utils';
import type { ClaudeStdinData } from '@claude-tools/shared/types';

class ProcessMonitor {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager('/tmp/process-monitor-cache');
  }

  async trackSession(data: ClaudeStdinData) {
    const sessionData = {
      sessionId: data.session_id,
      agent: data.agent?.name || null,
      startedAt: await this.getSessionStart(data.session_id),
      contextUsage: data.context_window.used_percentage,
      transcript: data.transcript_path,
    };

    await this.cache.set(`session-${data.session_id}`, sessionData, 3600);
  }

  async getActiveSessions(): Promise<SessionInfo[]> {
    // Leer directorio de cache y filtrar activos
    const sessions: SessionInfo[] = [];
    // Implementación específica...
    return sessions;
  }
}
```

### Para Procesos Internos (No-Plugin)

**Si necesitas monitorear procesos spawned en tu propio código:**

1. **Mantener globales/singletons:**
   ```typescript
   const activeProcesses = new Map<number, ProcessInfo>();

   export function spawn(cmd: string[]): ProcessHandle {
     const proc = Bun.spawn(cmd, { /* ... */ });
     activeProcesses.set(proc.pid, {
       cmd, startTime: Date.now(), handle: proc
     });
     return proc;
   }
   ```

2. **Usar file-based state para persistencia:**
   ```typescript
   const cache = new CacheManager('/tmp/my-processes');
   await cache.set(`proc-${proc.pid}`, processInfo, 300);
   ```

3. **NO usar APIs internas de Bun**
4. **NO usar sockets UNIX/named pipes** (overkill)

---

## Ejemplos de Código

### Ejemplo 1: Monitoreo de Procesos Simple

```typescript
// process-tracker.ts
import { CacheManager } from '@claude-tools/shared/utils';

interface ProcessInfo {
  pid: number;
  cmd: string[];
  startedAt: number;
  status: 'running' | 'completed' | 'failed';
  exitCode?: number;
}

export class ProcessTracker {
  private cache: CacheManager;
  private activeProcesses: Map<number, ProcessInfo> = new Map();

  constructor() {
    this.cache = new CacheManager('/tmp/process-tracker-cache');
  }

  async initialize() {
    await this.cache.initialize();

    // Restaurar procesos de cache si existen
    const activeData = await this.cache.get<ProcessInfo[]>('active-processes');
    if (activeData) {
      activeData.forEach(p => this.activeProcesses.set(p.pid, p));
    }
  }

  async spawn(cmd: string[], opts?: any): Promise<number> {
    const proc = Bun.spawn(cmd, opts);

    const processInfo: ProcessInfo = {
      pid: proc.pid,
      cmd,
      startedAt: Date.now(),
      status: 'running',
    };

    this.activeProcesses.set(proc.pid, processInfo);
    this.persistProcesses();

    // Esperar a que termine
    const exitCode = await proc.exited;
    processInfo.status = exitCode === 0 ? 'completed' : 'failed';
    processInfo.exitCode = exitCode;

    this.persistProcesses();

    return exitCode;
  }

  private async persistProcesses() {
    const processes = Array.from(this.activeProcesses.values());
    await this.cache.set('active-processes', processes, 3600);
  }

  async getActiveProcesses(): Promise<ProcessInfo[]> {
    return Array.from(this.activeProcesses.values())
      .filter(p => p.status === 'running');
  }

  async getHistory(): Promise<ProcessInfo[]> {
    return Array.from(this.activeProcesses.values());
  }
}

// Uso
const tracker = new ProcessTracker();
await tracker.initialize();

const exitCode = await tracker.spawn(['ls', '-la']);
const active = await tracker.getActiveProcesses();
console.log(`Procesos activos: ${active.length}`);
```

### Ejemplo 2: Detección de Agentes en Claude Code

```typescript
// agent-monitor.ts
import { CacheManager } from '@claude-tools/shared/utils';
import type { ClaudeStdinData } from '@claude-tools/shared/types';

interface AgentSession {
  sessionId: string;
  agentName: string | null;
  startedAt: number;
  lastActivity: number;
  contextUsage: number;
}

export class AgentMonitor {
  private cache: CacheManager;
  private activeSessions: Map<string, AgentSession> = new Map();

  constructor() {
    this.cache = new CacheManager('/tmp/agent-monitor-cache');
  }

  async initialize() {
    await this.cache.initialize();
  }

  async processData(data: ClaudeStdinData) {
    const sessionId = data.session_id;

    const session: AgentSession = {
      sessionId,
      agentName: data.agent?.name || null,
      startedAt: (await this.getSessionStart(sessionId)) || Date.now(),
      lastActivity: Date.now(),
      contextUsage: data.context_window.used_percentage || 0,
    };

    this.activeSessions.set(sessionId, session);

    // Persistir a cache
    await this.cache.set(`agent-${sessionId}`, session, 3600);

    // Log de actividad si hay agente
    if (data.agent?.name) {
      console.log(`Agent Active: ${data.agent.name} (${sessionId})`);
    }
  }

  async getActiveSessions(): Promise<AgentSession[]> {
    return Array.from(this.activeSessions.values());
  }

  async getActiveAgents(): Promise<AgentSession[]> {
    return Array.from(this.activeSessions.values())
      .filter(s => s.agentName !== null);
  }

  private async getSessionStart(sessionId: string): Promise<number | null> {
    const cached = await this.cache.get<AgentSession>(`agent-${sessionId}`);
    return cached?.startedAt || null;
  }
}

// Uso en statusline
import type { ClaudeStdinData } from '@claude-tools/shared/types';

const monitor = new AgentMonitor();
await monitor.initialize();

async function main() {
  const stdinText = await Bun.stdin.text();
  const data: ClaudeStdinData = JSON.parse(stdinText);

  await monitor.processData(data);

  const activeAgents = await monitor.getActiveAgents();
  if (activeAgents.length > 0) {
    console.log(`Agentes activos: ${activeAgents.map(a => a.agentName).join(', ')}`);
  }
}
```

### Ejemplo 3: Comunicación vía Variables de Entorno

```typescript
// proceso-padre.ts
interface ProcessConfig {
  processId: string;
  maxRetries: number;
  timeout: number;
}

const config: ProcessConfig = {
  processId: crypto.getRandomValues(new Uint32Array(1))[0].toString(),
  maxRetries: 3,
  timeout: 30000,
};

// Pasar config como variable de entorno
const proc = Bun.spawn(['bun', 'proceso-hijo.ts'], {
  env: {
    ...process.env,
    PROCESS_CONFIG: JSON.stringify(config),
  },
  stdout: 'pipe',
});

// ---

// proceso-hijo.ts
const configStr = process.env.PROCESS_CONFIG;
if (!configStr) {
  console.error('PROCESS_CONFIG not provided');
  process.exit(1);
}

const config: ProcessConfig = JSON.parse(configStr);
console.log(`Proceso hizo de: ${config.processId}`);
console.log(`Reintentos disponibles: ${config.maxRetries}`);
```

### Ejemplo 4: Syncing de Estado Entre Procesos

```typescript
// shared-state.ts
import { CacheManager } from '@claude-tools/shared/utils';

interface SharedTaskState {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  updatedAt: number;
}

export class TaskStateManager {
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager('/tmp/task-state');
  }

  async initialize() {
    await this.cache.initialize();
  }

  async updateTaskStatus(
    taskId: string,
    status: SharedTaskState['status'],
    progress: number = 0,
    meta?: any
  ) {
    const state: SharedTaskState = {
      taskId,
      status,
      progress,
      result: meta?.result,
      error: meta?.error,
      updatedAt: Date.now(),
    };

    await this.cache.set(`task-${taskId}`, state, 3600);
  }

  async getTaskStatus(taskId: string): Promise<SharedTaskState | null> {
    return await this.cache.get<SharedTaskState>(`task-${taskId}`);
  }

  async watchtask(taskId: string): Promise<SharedTaskState> {
    let state = await this.getTaskStatus(taskId);

    // Poll cada 100ms hasta completar
    while (state && state.status !== 'completed' && state.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 100));
      state = await this.getTaskStatus(taskId);
    }

    return state!;
  }
}

// Proceso 1: Actualizar estado
const manager = new TaskStateManager();
await manager.initialize();

const taskId = 'task-' + Date.now();
await manager.updateTaskStatus(taskId, 'running', 0);

// Simular progreso
for (let i = 0; i <= 100; i += 25) {
  await new Promise(r => setTimeout(r, 1000));
  await manager.updateTaskStatus(taskId, 'running', i);
}

await manager.updateTaskStatus(taskId, 'completed', 100, { result: 'success' });

// ---

// Proceso 2: Monitorear estado
const manager2 = new TaskStateManager();
await manager2.initialize();

const finalState = await manager2.watchTask(taskId);
console.log(`Tarea completada: ${finalState.progress}%`);
```

---

## Matriz de Decisión

**¿Cuál opción elegir?**

```
¿Eres un plugin de Claude Code?
├─ SÍ → Combina Opción 1 (Cache) + Opción 3 (stdin data)
└─ NO → ¿Necesitas persistencia entre procesos?
   ├─ SÍ → Opción 1 (File-based cache)
   ├─ NO → Opción 4 (WeakMap global) o simple Map<PID, Info>
   └─ ¿Necesitas comunicación inter-proceso?
       ├─ SÍ → Opción 1 (cache) o Opción 2 (env vars para metadata)
       └─ NO → Map simple en memoria
```

---

## Conclusión

**Lo Mejor para Este Proyecto: Ya está implementado**

Este codebase usa exactamente el enfoque recomendado:

1. ✅ **CacheManager** (`/workspaces/shared/utils/cache-manager.ts`) - Opción 1
2. ✅ **stdin Data de Claude Code** - Opción 3
3. ✅ **Session tracking** - Usa ambas anteriores

Para monitoreo de procesos spawned internos, simplemente:
- Usar `Map<number, ProcessInfo>` para tracking en-memoria
- Complementar con `CacheManager` para persistencia
- Usar `Bun.spawn()` con callbacks simples

No necesitas APIs internas, sockets, o named pipes. La solución es elegante y simple.

---

**Última Actualización:** Febrero 10, 2024
**Investigador:** Claude Code Analysis Agent
