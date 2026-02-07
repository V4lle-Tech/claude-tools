# Guía de Publicación del Plugin

## Método 1: Publicar en npm

### Preparación

1. **Actualizar package.json:**
```json
{
  "name": "@tu-usuario/claude-code-statusline",
  "version": "1.0.0",
  "description": "Real-time statusline for Claude Code with token usage monitoring",
  "repository": {
    "type": "git",
    "url": "https://github.com/tu-usuario/claude-code-statusline.git"
  },
  "bin": {
    "claude-statusline": "./claude-statusline"
  },
  "files": [
    "claude-statusline",
    "src",
    "config",
    "scripts"
  ]
}
```

2. **Compilar el binario:**
```bash
bun run build
```

3. **Publicar:**
```bash
npm login
npm publish --access public
```

### Instalación por usuarios:

```bash
# Opción A: Instalar globalmente
npm install -g @tu-usuario/claude-code-statusline

# Opción B: Usar npx (sin instalación)
npx @tu-usuario/claude-code-statusline install
```

---

## Método 2: GitHub Release con Binario

### 1. Crear release en GitHub:

```bash
# Tag de versión
git tag v1.0.0
git push origin v1.0.0

# Crear release en GitHub
gh release create v1.0.0 ./claude-statusline \
  --title "v1.0.0 - Initial Release" \
  --notes "First stable release"
```

### 2. Script de instalación remota:

```bash
# Los usuarios ejecutan:
curl -fsSL https://raw.githubusercontent.com/tu-usuario/claude-code-statusline/main/install.sh | bash
```

Crear `install.sh`:
```bash
#!/bin/bash
set -e

echo "Installing Claude Code Statusline..."

# Detectar OS y arquitectura
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

# Descargar binario
DOWNLOAD_URL="https://github.com/tu-usuario/claude-code-statusline/releases/latest/download/claude-statusline-${OS}-${ARCH}"

curl -L "$DOWNLOAD_URL" -o /usr/local/bin/claude-statusline
chmod +x /usr/local/bin/claude-statusline

# Configurar Claude Code
echo "Configuring Claude Code..."
node -e "
const fs = require('fs');
const os = require('os');
const path = require('path');

const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
let settings = {};

try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch {}

settings.statusLine = {
  type: 'command',
  command: '/usr/local/bin/claude-statusline',
  padding: 2
};

fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log('✅ Installation complete!');
"
```

---

## Método 3: Git Clone Manual

### Para usuarios:

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/claude-code-statusline.git
cd claude-code-statusline

# 2. Instalar dependencias
bun install

# 3. Instalar el statusline
bun run install:statusline
```

---

## Método 4: Docker Container (Avanzado)

### Dockerfile:

```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .
RUN bun run build

ENTRYPOINT ["/app/claude-statusline"]
```

### Uso:

```bash
docker build -t claude-statusline .
docker run -i claude-statusline < stdin.json
```

---

## Recomendación de Distribución

Para **máxima facilidad de uso**:

1. **Publicar en npm** como paquete global
2. **Crear releases en GitHub** con binarios pre-compilados para:
   - Linux (x64, arm64)
   - macOS (x64, arm64)
   - Windows (x64)
3. **Proveer script de instalación** con un solo comando

### Ejemplo de instalación ideal:

```bash
# Opción 1: npm (más simple)
npm install -g @tu-usuario/claude-code-statusline

# Opción 2: Script directo
curl -fsSL https://statusline.tu-dominio.com/install.sh | bash

# Opción 3: Bun
bun install -g @tu-usuario/claude-code-statusline
```

---

## Estructura Recomendada para Distribución

```
claude-code-statusline/
├── .github/
│   └── workflows/
│       └── release.yml          # CI/CD para builds multi-plataforma
├── src/                         # Código fuente
├── dist/                        # Binarios compilados
│   ├── claude-statusline-linux-x64
│   ├── claude-statusline-linux-arm64
│   ├── claude-statusline-darwin-x64
│   ├── claude-statusline-darwin-arm64
│   └── claude-statusline-win-x64.exe
├── install.sh                   # Script de instalación Unix
├── install.ps1                  # Script de instalación Windows
├── package.json
└── README.md
```

---

## GitHub Actions para Releases Automáticos

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3

      - uses: oven-sh/setup-bun@v1

      - run: bun install

      - run: bun run build

      - name: Upload Release Asset
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ./claude-statusline
          asset_name: claude-statusline-${{ runner.os }}
          asset_content_type: application/octet-stream
```
