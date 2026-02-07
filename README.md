# Claude Tools

Professional suite of tools and plugins for Claude Code.

## 🎯 Overview

This workspace contains multiple plugins and tools that extend Claude Code's functionality:

| Plugin | Description | Status |
|--------|-------------|--------|
| **statusline** | Real-time status display with tokens, git, and metrics | ✅ Production |
| **context-analyzer** | Context usage analysis with recommendations | ✅ Demo |

## 🚀 Quick Start

### Install All Plugins

```bash
# Clone the repository
git clone https://github.com/V4lle-Tech/claude-tools.git
cd claude-tools

# Install dependencies
bun install

# Install all plugins
bun run install:all
```

### Install a Specific Plugin

```bash
# Install just the statusline plugin
bun run install statusline

# Or the context analyzer
bun run install context-analyzer
```

### Create a New Plugin

```bash
# Scaffold a new plugin
bun run create-plugin my-awesome-plugin

# Implement your plugin
cd packages/my-awesome-plugin
vim src/index.ts

# Build and install it
bun run build
bun run scripts/install.ts

# Or from workspace root
cd ../..
bun run install my-awesome-plugin
```

## 📦 Available Plugins

### Statusline

Real-time statusline for Claude Code showing:
- Token usage and context window
- Git status (branch, staged/modified files)
- Session cost and duration
- API rate limits (5h/7d windows)

[Learn more →](packages/statusline/README.md)

### Context Analyzer

Analyzes your context usage and provides:
- Health status (healthy/warning/critical)
- Token usage metrics
- Actionable recommendations
- Smart insights

[Learn more →](packages/context-analyzer/README.md)

## 🛠️ Workspace Commands

```bash
# List all available plugins
bun run list-plugins

# Install a specific plugin
bun run install <plugin-name>
# Example: bun run install statusline

# Install all plugins
bun run install:all

# Build all plugins
bun run build:all

# Create new plugin
bun run create-plugin <name>

# Clean build artifacts
bun run clean
```

## 🏗️ Architecture

```
claude-tools/
├── packages/           # Independent plugins
│   ├── statusline/    # Statusline plugin
│   └── context-analyzer/
├── shared/            # Shared code
│   ├── types/         # Common TypeScript types
│   ├── utils/         # Shared utilities
│   └── widgets/       # Base widget classes
├── tools/             # Workspace management
│   ├── install-all.ts
│   ├── scaffold.ts
│   └── build-all.ts
└── .claude/           # Global configuration
```

## 🧩 Shared Utilities

All plugins have access to shared code:

```typescript
// Shared types
import type { ClaudeStdinData } from '@claude-tools/shared/types';

// Shared utilities
import { CacheManager, SettingsUpdater } from '@claude-tools/shared/utils';

// Base widgets
import { BaseWidget } from '@claude-tools/shared/widgets';
```

## 📚 Creating Your Own Plugin

### 1. Scaffold

```bash
bun run create-plugin my-plugin
```

### 2. Implement

```typescript
// packages/my-plugin/src/index.ts
import type { ClaudeStdinData } from '@claude-tools/shared/types';
import { CacheManager } from '@claude-tools/shared/utils';

async function main() {
  const data: ClaudeStdinData = JSON.parse(await Bun.stdin.text());
  // Your logic here
}

main();
```

### 3. Install

```typescript
// packages/my-plugin/scripts/install.ts
import { SettingsUpdater } from '@claude-tools/shared/utils';

const updater = new SettingsUpdater();
await updater.setStatusLine('/path/to/binary');
```

### 4. Test & Deploy

```bash
cd packages/my-plugin
bun run build
bun run install
```

## 🎓 Documentation

- [Demo Guide](DEMO_GUIDE.md) - Workspace tutorial and examples
- [Changelog](CHANGELOG.md) - Version history and release notes
- [Publishing Guide](packages/statusline/scripts/publish.md) - Publishing plugins to npm
- [Global Rules](.claude/CLAUDE.md) - Development guidelines and standards
- Plugin-specific docs in each `packages/*/README.md`

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your plugin in `packages/`
3. Follow the coding standards in `.claude/CLAUDE.md`
4. Add tests
5. Submit a pull request

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh)
- For [Claude Code](https://code.claude.com)
- Inspired by modern monorepo tools

---

Made with ❤️ for the Claude Code community
