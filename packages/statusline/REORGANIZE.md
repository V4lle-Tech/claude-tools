# Guía de Reorganización del Proyecto

Si prefieres mover el proyecto al root de `/workspaces/`, aquí están las opciones:

## Opción A: Mover Todo al Root

```bash
# 1. Ir al directorio actual
cd /workspaces/claude-code-statusline

# 2. Mover todo al padre (root)
mv * ..
mv .* .. 2>/dev/null || true

# 3. Subir un nivel
cd ..

# 4. Eliminar el directorio vacío
rmdir claude-code-statusline

# 5. Reinstalar desde el nuevo root
bun run install:statusline
```

**Resultado:**
```
/workspaces/
├── src/
├── .claude/
├── config/
├── package.json
└── claude-statusline
```

## Opción B: Mantener Subdirectorio (Múltiples Plugins)

**Ventajas:**
- Permite organizar múltiples plugins/herramientas
- Estructura más limpia para repositorio
- Fácil de distribuir como paquete independiente

**Estructura recomendada:**
```
/workspaces/
├── claude-statusline/          # Este plugin
│   ├── src/
│   ├── .claude/
│   └── package.json
├── claude-git-helper/          # Futuro plugin
│   └── ...
├── claude-test-runner/         # Futuro plugin
│   └── ...
└── README.md                   # Readme principal
```

## Opción C: Symlink Global

Si quieres mantener el subdirectorio pero tener acceso global:

```bash
# Crear symlink en PATH
sudo ln -s /workspaces/claude-code-statusline/claude-statusline /usr/local/bin/claude-statusline

# O en tu home bin
mkdir -p $HOME/bin
ln -s /workspaces/claude-code-statusline/claude-statusline $HOME/bin/claude-statusline
export PATH="$HOME/bin:$PATH"  # Agregar a .bashrc o .zshrc
```

## Recomendación

**Para desarrollo local:** Mantén el subdirectorio (estado actual)

**Para distribución:** Usa uno de estos métodos:

1. **GitHub + npm package** (profesional)
   - Publica en npm: `npm publish`
   - Los usuarios instalan: `npm install -g @tu-usuario/claude-statusline`

2. **GitHub Release** (simple)
   - Crea releases con binarios pre-compilados
   - Los usuarios descargan el binario

3. **Script de instalación** (flexible)
   - Los usuarios clonan y ejecutan: `./install.sh`
   - Funciona desde cualquier ubicación

## Distribución para Otros Proyectos

### Método 1: Git Submodule

En otro proyecto:
```bash
cd /otro/proyecto
git submodule add https://github.com/tu-usuario/claude-code-statusline.git tools/statusline
cd tools/statusline
./install.sh
```

### Método 2: Como Dependencia

En `package.json` del otro proyecto:
```json
{
  "dependencies": {
    "@tu-usuario/claude-statusline": "^1.0.0"
  },
  "scripts": {
    "postinstall": "claude-statusline install"
  }
}
```

### Método 3: Docker Volume

```bash
docker run -v /workspaces/claude-code-statusline:/app/statusline my-project
```

### Método 4: Copiar Binario

```bash
# Simplemente copiar el binario compilado
cp /workspaces/claude-code-statusline/claude-statusline /otro/proyecto/bin/
```

---

## ¿Cuál elegir?

| Caso de Uso | Método Recomendado |
|-------------|-------------------|
| Desarrollo local en un solo proyecto | **Opción A** (root) |
| Múltiples plugins/herramientas | **Opción B** (subdirectorio) |
| Compartir con otros desarrolladores | **npm package** |
| Instalación rápida sin npm | **install.sh** |
| Distribución comercial | **GitHub Releases** + **npm** |
