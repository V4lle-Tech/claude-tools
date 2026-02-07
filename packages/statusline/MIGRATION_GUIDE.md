# Guía de Migración a Estructura Multi-Plugin

## 🎯 Objetivo

Convertir el proyecto actual en un workspace profesional que puede albergar múltiples plugins.

## 📊 Transformación

### Estado Actual:
```
/workspaces/
└── claude-code-statusline/
    ├── src/
    ├── .claude/
    └── ...
```

### Estado Final (Opción C):
```
/workspaces/claude-tools/
├── packages/
│   └── statusline/              # Tu proyecto actual
├── shared/                       # Código compartido
├── tools/                        # Herramientas de gestión
└── .claude/                      # Config global
```

---

## 🚀 Migración Paso a Paso

### Paso 1: Crear la estructura base

```bash
# 1. Ir al directorio padre
cd /workspaces

# 2. Crear nuevo workspace
mkdir -p claude-tools/{packages,shared,tools,docs,.claude}

# 3. Mover el proyecto actual
mv claude-code-statusline claude-tools/packages/statusline
```

### Paso 2: Configurar el workspace

```bash
cd claude-tools

# Crear package.json principal
cat > package.json << 'EOF'
{
  "name": "claude-tools",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*",
    "shared"
  ],
  "scripts": {
    "install:all": "bun run tools/install-all.ts",
    "build:all": "bun run tools/build-all.ts",
    "create-plugin": "bun run tools/scaffold.ts"
  }
}
EOF

# Instalar dependencias
bun install
```

### Paso 3: Extraer código compartido

```bash
# Crear estructura shared
mkdir -p shared/{types,utils}

# Mover tipos compartidos
cp packages/statusline/src/types/claude-stdin.ts shared/types/
cp packages/statusline/src/core/cache-manager.ts shared/utils/
cp packages/statusline/src/core/credential-reader.ts shared/utils/

# Crear package.json de shared
cat > shared/package.json << 'EOF'
{
  "name": "@claude-tools/shared",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./types": "./types/index.ts",
    "./utils": "./utils/index.ts"
  }
}
EOF
```

### Paso 4: Actualizar referencias en statusline

```bash
cd packages/statusline

# Actualizar package.json
# Agregar dependencia a shared:
# "dependencies": {
#   "@claude-tools/shared": "workspace:*"
# }

# Actualizar imports en src/
# Cambiar:
#   import { CacheManager } from '../core/cache-manager'
# Por:
#   import { CacheManager } from '@claude-tools/shared/utils'
```

### Paso 5: Crear herramientas de gestión

```bash
cd /workspaces/claude-tools

# Crear install-all.ts
# Ver contenido en WORKSPACE_STRUCTURE.md

# Crear scaffold.ts
# Ver contenido en WORKSPACE_STRUCTURE.md

# Hacer ejecutables
chmod +x tools/*.ts
```

### Paso 6: Configuración global

```bash
# Crear .claude/CLAUDE.md global
cat > .claude/CLAUDE.md << 'EOF'
# Claude Tools - Workspace Rules

Este workspace contiene múltiples herramientas para Claude Code.

## Estructura

- `packages/`: Plugins independientes
- `shared/`: Código compartido
- `tools/`: Herramientas de desarrollo

## Crear Nuevo Plugin

```bash
bun run create-plugin nombre-del-plugin
```
EOF
```

### Paso 7: Verificar instalación

```bash
# Instalar todos los plugins
bun run install:all

# Verificar que statusline funciona
cd packages/statusline
bun run scripts/test-manual.ts full
```

---

## 🧪 Script de Migración Automatizado

Puedo crear un script que haga todo esto automáticamente:

```bash
#!/bin/bash
# migrate-to-workspace.sh

set -e

echo "🔄 Migrating to multi-plugin workspace..."

# 1. Crear estructura
cd /workspaces
mkdir -p claude-tools/{packages,shared/{types,utils},tools,docs,.claude}

# 2. Mover proyecto actual
mv claude-code-statusline claude-tools/packages/statusline

# 3. Extraer código compartido
cd claude-tools
cp packages/statusline/src/types/claude-stdin.ts shared/types/
cp packages/statusline/src/core/cache-manager.ts shared/utils/
cp packages/statusline/src/core/credential-reader.ts shared/utils/

# 4. Crear configs
cat > package.json << 'EOF'
{
  "name": "claude-tools",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*", "shared"]
}
EOF

# 5. Crear shared package
cat > shared/package.json << 'EOF'
{
  "name": "@claude-tools/shared",
  "version": "1.0.0",
  "type": "module"
}
EOF

# 6. Actualizar statusline package.json
cd packages/statusline
# Agregar dependency a shared
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['@claude-tools/shared'] = 'workspace:*';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# 7. Instalar
cd /workspaces/claude-tools
bun install

echo "✅ Migration complete!"
echo "New structure at: /workspaces/claude-tools"
```

---

## ✨ Crear Tu Segundo Plugin (Ejemplo)

Una vez migrado, crear un nuevo plugin es muy fácil:

```bash
cd /workspaces/claude-tools

# Crear nuevo plugin
bun run create-plugin git-auto-commit

# Implementar
cd packages/git-auto-commit
cat > src/index.ts << 'EOF'
#!/usr/bin/env bun

import { SettingsUpdater } from '@claude-tools/shared/utils';

async function install() {
  const updater = new SettingsUpdater();

  await updater.addHook('pre-commit',
    '/workspaces/claude-tools/packages/git-auto-commit/git-auto-commit'
  );

  console.log('✅ Git auto-commit hook installed!');
}

install();
EOF

# Compilar e instalar
bun run build
bun run install
```

---

## 📊 Comparación de Estructuras

| Aspecto | Actual | Opción A (Root) | Opción C (Workspace) |
|---------|--------|-----------------|----------------------|
| Complejidad | Simple | Simple | Media |
| Escalabilidad | ❌ | ❌ | ✅ |
| Código compartido | ❌ | ❌ | ✅ |
| Múltiples plugins | ❌ | ❌ | ✅ |
| Gestión centralizada | ❌ | ❌ | ✅ |
| Curva de aprendizaje | Baja | Baja | Media |
| Ideal para | 1 plugin | 1 plugin | 2+ plugins |

---

## 🎯 Cuándo Usar Cada Opción

### Usa Opción A (Root) si:
- Solo tendrás este plugin
- Quieres máxima simplicidad
- No planeas crear más herramientas

### Usa Opción B (Subdirectorio actual) si:
- Podrías agregar 1-2 plugins más
- No necesitas compartir código
- Prefieres independencia total

### Usa Opción C (Workspace profesional) si:
- Planeas crear múltiples plugins
- Quieres compartir código/tipos
- Buscas gestión centralizada
- Quieres estructura profesional
- Vas a publicar en npm

---

## 💡 Mi Recomendación

Para tu caso específico, considerando que ya tienes un plugin robusto:

**Empieza con Opción B (actual)** y:
1. Mantén el subdirectorio actual
2. Si creas un segundo plugin, migra a Opción C
3. Usa el script de migración cuando lo necesites

**Razón**: YAGNI (You Ain't Gonna Need It) - No sobre-ingenierizar hasta que realmente necesites múltiples plugins.

Cuando llegue el momento de crear tu segundo plugin, la migración es sencilla y puedo ayudarte con el script automatizado.

---

## 🤔 ¿Quieres que Implemente Alguna?

Puedo:
1. ✅ **Crear script de migración automatizado**
2. ✅ **Migrar ahora a estructura workspace**
3. ✅ **Crear un segundo plugin de ejemplo**
4. ✅ **Solo documentar y dejar como está**

¿Qué prefieres?
