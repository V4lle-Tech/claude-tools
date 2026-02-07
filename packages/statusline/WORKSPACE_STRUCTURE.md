# Estructura Multi-Plugin Profesional para Claude Code

## 🎯 Concepto: Monorepo de Herramientas Claude Code

Un workspace organizado que alberga múltiples plugins/herramientas con código compartido y gestión centralizada.

## 📁 Estructura Completa

```
/workspaces/claude-tools/                    # Root del workspace
│
├── packages/                                 # Plugins independientes
│   ├── statusline/                          # Plugin actual (statusline)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── widgets/
│   │   │   ├── core/
│   │   │   └── utils/
│   │   ├── .claude/
│   │   │   ├── CLAUDE.md
│   │   │   ├── agents/
│   │   │   └── commands/
│   │   ├── config/
│   │   ├── tests/
│   │   ├── package.json                     # Dependencias específicas
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── git-hooks/                           # Nuevo plugin ejemplo
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── pre-commit.ts
│   │   │   │   ├── pre-push.ts
│   │   │   │   └── commit-msg.ts
│   │   │   └── utils/
│   │   ├── .claude/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── test-runner/                         # Otro plugin ejemplo
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── runners/
│   │   │   │   ├── jest.ts
│   │   │   │   ├── vitest.ts
│   │   │   │   └── bun.ts
│   │   │   └── reporters/
│   │   ├── .claude/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── context-manager/                     # Otro plugin ejemplo
│       ├── src/
│       │   ├── index.ts
│       │   ├── analyzers/
│       │   └── optimizers/
│       ├── .claude/
│       ├── package.json
│       └── README.md
│
├── shared/                                   # Código compartido entre plugins
│   ├── types/                               # Tipos TypeScript comunes
│   │   ├── claude-stdin.ts                  # Tipos de stdin de Claude
│   │   ├── settings.ts                      # Tipos de settings.json
│   │   └── common.ts                        # Tipos compartidos
│   │
│   ├── utils/                               # Utilidades compartidas
│   │   ├── cache-manager.ts                 # Cache compartido
│   │   ├── config-loader.ts                 # Loader de configs
│   │   ├── credential-reader.ts             # Lector de credenciales
│   │   ├── settings-updater.ts              # Actualizar settings.json
│   │   └── logger.ts                        # Logger compartido
│   │
│   ├── hooks/                               # Hooks de Claude compartidos
│   │   ├── base-hook.ts                     # Clase base para hooks
│   │   └── hook-manager.ts                  # Gestor de hooks
│   │
│   ├── widgets/                             # Widgets base compartidos
│   │   └── base-widget.ts                   # Widget base
│   │
│   ├── package.json                         # Dependencias compartidas
│   └── tsconfig.json
│
├── tools/                                    # Herramientas de desarrollo
│   ├── install-all.ts                       # Instalar todos los plugins
│   ├── uninstall-all.ts                     # Desinstalar todos
│   ├── test-all.ts                          # Correr tests de todos
│   ├── build-all.ts                         # Compilar todos
│   ├── publish-all.ts                       # Publicar a npm
│   └── scaffold.ts                          # Crear nuevo plugin
│
├── .claude/                                  # Configuración global del workspace
│   ├── CLAUDE.md                            # Reglas globales
│   ├── agents/
│   │   ├── workspace-manager.md             # Agente para gestionar workspace
│   │   └── plugin-creator.md                # Agente para crear plugins
│   ├── commands/
│   │   ├── create-plugin.md                 # Comando: crear nuevo plugin
│   │   ├── install-plugin.md                # Comando: instalar plugin
│   │   └── list-plugins.md                  # Comando: listar plugins
│   └── skills/
│       └── workspace-health.md              # Skill: verificar salud
│
├── config/                                   # Configuración global
│   ├── workspace.json                       # Config del workspace
│   └── tsconfig.base.json                   # TypeScript base config
│
├── docs/                                     # Documentación centralizada
│   ├── getting-started.md
│   ├── creating-plugins.md
│   ├── publishing.md
│   ├── architecture.md
│   └── api/
│       ├── shared-utils.md
│       └── widget-api.md
│
├── scripts/                                  # Scripts globales
│   ├── install.sh                           # Instalación completa
│   ├── setup-dev.sh                         # Setup entorno desarrollo
│   └── release.sh                           # Release workflow
│
├── package.json                              # Package principal (workspace)
├── bun.workspaces                           # Configuración workspaces Bun
├── tsconfig.json                            # TypeScript config global
├── .gitignore
├── LICENSE
└── README.md                                # Documentación principal
```

---

## 📦 Configuración de Workspaces (Bun)

### `/workspaces/claude-tools/package.json`

```json
{
  "name": "claude-tools",
  "version": "1.0.0",
  "description": "Professional suite of tools and plugins for Claude Code",
  "private": true,
  "workspaces": [
    "packages/*",
    "shared"
  ],
  "scripts": {
    "install:all": "bun run tools/install-all.ts",
    "build:all": "bun run tools/build-all.ts",
    "test:all": "bun run tools/test-all.ts",
    "clean": "rm -rf packages/*/dist packages/*/node_modules",
    "create-plugin": "bun run tools/scaffold.ts",
    "dev": "bun run --watch"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "bun-types": "latest",
    "typescript": "^5.0.0"
  }
}
```

### `/workspaces/claude-tools/bun.workspaces`

```json
{
  "workspaces": [
    "packages/*",
    "shared"
  ]
}
```

---

## 🔧 Herramientas de Gestión

### `tools/install-all.ts` - Instalar todos los plugins

```typescript
#!/usr/bin/env bun

/**
 * Instala todos los plugins del workspace en Claude Code
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

const PACKAGES_DIR = join(import.meta.dir, '../packages');

async function installAll() {
  console.log('🚀 Installing all Claude Code plugins...\n');

  const packages = readdirSync(PACKAGES_DIR).filter((name) => {
    const path = join(PACKAGES_DIR, name);
    return statSync(path).isDirectory();
  });

  console.log(`Found ${packages.length} plugins:\n`);
  packages.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
  console.log('');

  for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const installScript = join(pkgPath, 'scripts/install.ts');

    console.log(`📦 Installing ${pkg}...`);

    try {
      // Check if package has install script
      const file = Bun.file(installScript);
      if (await file.exists()) {
        await $`cd ${pkgPath} && bun run install`;
        console.log(`✅ ${pkg} installed successfully\n`);
      } else {
        console.log(`⚠️  ${pkg} has no install script, skipping\n`);
      }
    } catch (error) {
      console.error(`❌ Failed to install ${pkg}:`, error);
    }
  }

  console.log('🎉 All plugins installed!');
}

installAll();
```

### `tools/scaffold.ts` - Crear nuevo plugin

```typescript
#!/usr/bin/env bun

/**
 * Scaffold de nuevo plugin para Claude Code
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const TEMPLATE = {
  'package.json': (name: string) => `{
  "name": "@claude-tools/${name}",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "build": "bun build src/index.ts --compile --outfile=${name}",
    "test": "bun test",
    "install": "bun run scripts/install.ts"
  },
  "dependencies": {
    "@claude-tools/shared": "workspace:*"
  }
}`,

  'src/index.ts': (name: string) => `#!/usr/bin/env bun

/**
 * ${name} - Claude Code Plugin
 */

console.log('${name} plugin initialized!');
`,

  'README.md': (name: string) => `# ${name}

Claude Code plugin for ${name}.

## Installation

\`\`\`bash
cd packages/${name}
bun run install
\`\`\`

## Usage

TODO: Add usage instructions
`,

  '.claude/CLAUDE.md': (name: string) => `# ${name} Plugin - Development Rules

## Purpose

This plugin provides ${name} functionality for Claude Code.

## Development Guidelines

1. Follow shared TypeScript conventions
2. Use shared utilities from @claude-tools/shared
3. Keep the plugin focused and lightweight
4. Add tests for all features
`,
};

async function scaffold(name: string) {
  console.log(`🏗️  Creating new plugin: ${name}\n`);

  const pluginDir = join(import.meta.dir, '../packages', name);

  // Create directories
  await mkdir(join(pluginDir, 'src'), { recursive: true });
  await mkdir(join(pluginDir, '.claude'), { recursive: true });
  await mkdir(join(pluginDir, 'tests'), { recursive: true });
  await mkdir(join(pluginDir, 'scripts'), { recursive: true });

  // Create files
  for (const [file, content] of Object.entries(TEMPLATE)) {
    const filePath = join(pluginDir, file);
    await writeFile(filePath, typeof content === 'function' ? content(name) : content);
  }

  console.log(`✅ Plugin ${name} created at: ${pluginDir}`);
  console.log('\nNext steps:');
  console.log(`  1. cd packages/${name}`);
  console.log('  2. Implement your plugin in src/index.ts');
  console.log('  3. Add tests in tests/');
  console.log('  4. Run: bun run install');
}

// Get plugin name from args
const name = process.argv[2];
if (!name) {
  console.error('Usage: bun run tools/scaffold.ts <plugin-name>');
  process.exit(1);
}

scaffold(name);
```

---

## 🧩 Código Compartido

### `shared/utils/settings-updater.ts`

```typescript
/**
 * Utilidad compartida para actualizar ~/.claude/settings.json
 */

import { join } from 'path';
import { homedir } from 'os';

export interface PluginSettings {
  [key: string]: any;
}

export class SettingsUpdater {
  private readonly settingsPath: string;

  constructor() {
    this.settingsPath = join(homedir(), '.claude', 'settings.json');
  }

  async updateSettings(updates: PluginSettings): Promise<void> {
    const file = Bun.file(this.settingsPath);

    let settings: any = {};
    if (await file.exists()) {
      settings = await file.json();
    }

    // Merge updates
    settings = { ...settings, ...updates };

    await Bun.write(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  async addHook(hookName: string, command: string): Promise<void> {
    const file = Bun.file(this.settingsPath);

    let settings: any = {};
    if (await file.exists()) {
      settings = await file.json();
    }

    if (!settings.hooks) {
      settings.hooks = {};
    }

    settings.hooks[hookName] = {
      type: 'command',
      command,
    };

    await Bun.write(this.settingsPath, JSON.stringify(settings, null, 2));
  }
}
```

---

## 🎨 Configuración Global del Workspace

### `config/workspace.json`

```json
{
  "name": "claude-tools",
  "version": "1.0.0",
  "plugins": {
    "statusline": {
      "enabled": true,
      "type": "statusline",
      "binary": "packages/statusline/claude-statusline"
    },
    "git-hooks": {
      "enabled": true,
      "type": "hooks",
      "hooks": ["pre-commit", "pre-push"]
    },
    "test-runner": {
      "enabled": true,
      "type": "agent"
    },
    "context-manager": {
      "enabled": true,
      "type": "skill"
    }
  },
  "shared": {
    "cacheDirectory": "/tmp/claude-tools-cache",
    "logLevel": "info"
  }
}
```

---

## 📚 Documentación Centralizada

### `docs/creating-plugins.md`

```markdown
# Creating New Plugins

## Quick Start

1. Generate plugin scaffold:
   \`\`\`bash
   bun run create-plugin my-awesome-plugin
   \`\`\`

2. Implement your plugin in \`packages/my-awesome-plugin/src/index.ts\`

3. Use shared utilities:
   \`\`\`typescript
   import { SettingsUpdater } from '@claude-tools/shared';
   import type { ClaudeStdinData } from '@claude-tools/shared/types';
   \`\`\`

4. Test your plugin:
   \`\`\`bash
   cd packages/my-awesome-plugin
   bun test
   \`\`\`

5. Install locally:
   \`\`\`bash
   bun run install
   \`\`\`

## Plugin Types

- **Statusline**: Displays information in Claude Code statusline
- **Hook**: Responds to Claude Code events
- **Agent**: Background agent for automated tasks
- **Skill**: Custom skill that Claude can use
- **Command**: CLI command within Claude Code

## Shared APIs Available

See \`docs/api/\` for detailed API documentation.
```

---

## 🚀 Ventajas de esta Estructura

### 1. **Reutilización de Código**
```typescript
// En cualquier plugin
import { CacheManager } from '@claude-tools/shared';
import { CredentialReader } from '@claude-tools/shared';
```

### 2. **Gestión Centralizada**
```bash
# Instalar todos los plugins
bun run install:all

# Crear nuevo plugin
bun run create-plugin git-helper

# Publicar todos
bun run publish:all
```

### 3. **Tipos Compartidos**
```typescript
// Todos los plugins tienen acceso a los mismos tipos
import type { ClaudeStdinData, Config } from '@claude-tools/shared/types';
```

### 4. **Testing Unificado**
```bash
# Correr tests de todos los plugins
bun run test:all
```

### 5. **Versionado Consistente**
```bash
# Bump version de todos los plugins
bun run version-all 2.0.0
```

---

## 📝 Ejemplo de Uso

### Desarrollador crea nuevo plugin:

```bash
# 1. Crear plugin
cd /workspaces/claude-tools
bun run create-plugin session-recorder

# 2. Implementar
cd packages/session-recorder
vim src/index.ts

# 3. Usar shared utilities
import { SettingsUpdater } from '@claude-tools/shared';

# 4. Instalar
bun run install

# 5. Verificar que funciona
bun test
```

### Usuario instala el workspace completo:

```bash
# Clonar
git clone https://github.com/tu-usuario/claude-tools.git
cd claude-tools

# Instalar todo
bun install
bun run install:all

# ¡Listo! Todos los plugins instalados
```

---

## 🎯 Resumen

Esta estructura te permite:

✅ **Agregar plugins fácilmente** con scaffolding
✅ **Compartir código** entre plugins
✅ **Gestionar centralmente** todo el workspace
✅ **Publicar independientemente** cada plugin
✅ **Mantener consistencia** en todos los plugins
✅ **Escalar** a docenas de plugins sin caos

¿Te gusta esta estructura? Puedo ayudarte a reorganizar el proyecto actual en esta arquitectura.
