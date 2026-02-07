# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2025-02-07

### Fixed
- **Bun PATH Resolution** (Issue #1 - Phase 2)
  - Fixed `install.sh` to detect bun installed at `~/.bun/bin` but not in PATH
  - Script now automatically adds bun to PATH if found in standard location
  - Prevents unnecessary bun reinstallation attempts
  - Resolves "command not found" errors during standalone installation
- **Binary Path Resolution**
  - Fixed relative vs absolute path issue in `build_binary()` function
  - Binary paths now correctly resolved as absolute paths
  - Installation to `~/.local/bin` now works reliably

## [1.0.2] - 2025-02-07

### Fixed
- **Critical Installation Bug** (Issue #1 - Phase 1)
  - Renamed package.json "install" script to "plugin" to prevent conflict
  - Bun was automatically executing "install" script during dependency installation
  - This caused installation to fail when downloading and building from GitHub releases
  - Users now run `bun run plugin <plugin-name>` instead of `bun run install <plugin-name>`
  - Standalone installation scripts (install.sh/install.ps1) now work correctly

### Changed
- Updated README examples to use `bun run plugin` instead of `bun run install`

## [1.0.1] - 2025-02-07

### Added
- **Standalone Installation Scripts** (Issue #1 - Phase 1)
  - `install.sh`: One-line installation for Linux/macOS
    - Auto-detects OS and architecture
    - Downloads and builds from source
    - Configures Claude Code automatically
    - Installs to PATH with proper permissions
  - `install.ps1`: PowerShell installation script for Windows
    - Similar functionality for Windows users
    - Automatic PATH configuration
    - User-friendly colored output
  - Updated installation documentation in README
  - Users can now install without cloning repository
- Visual preview image (docs/statusline.png)

### Changed
- README installation section reorganized
  - One-line installation now recommended method
  - Repository cloning moved to "For Contributors" section

### Fixed
- Installation script logging interference (stderr redirection)
- Build error handling and output display in install.sh
- Proper error messages when build fails

## [1.0.0] - 2025-02-07

### Added

#### Workspace Infrastructure
- Initial workspace setup with Bun workspaces
- Multi-plugin monorepo architecture
- TypeScript strict mode configuration
- Comprehensive .gitignore for build artifacts and dependencies

#### Shared Utilities Package (@claude-tools/shared)
- Common TypeScript types for Claude Code integration
  - `ClaudeStdinData`: Interface for Claude Code stdin JSON data
  - `UsageLimitsResponse`: Interface for Anthropic API rate limits
- Shared utilities for all plugins
  - `CacheManager`: File-based caching with TTL support
  - `CredentialReader`: OAuth credential management
  - `SettingsUpdater`: Helper for updating ~/.claude/settings.json
- Base widget class with ANSI color utilities
- Reusable code architecture to avoid duplication across plugins

#### Statusline Plugin
- Real-time statusline display for Claude Code
- 6 comprehensive widgets:
  - **Model Widget**: Display current Claude model
  - **Workspace Widget**: Show current working directory
  - **Context Bar Widget**: Visual progress bar for token usage (color-coded)
  - **Cost Tracker Widget**: Session cost and duration
  - **Git Status Widget**: Branch, staged/modified file counts (cached)
  - **Rate Limits Widget**: API rate limits for 5h/7d windows
- Hybrid data approach: stdin + cached API calls
- Performance optimized (<50ms render time)
- File-based caching with configurable TTL
  - 5 seconds for git operations
  - 60 seconds for API calls
- OAuth integration for Anthropic API
- Multi-line layout support
- Embedded configuration for binary compilation
- Installation script for automatic setup
- Comprehensive testing infrastructure
- Addresses issue #20413 - subscription usage data in statusline

#### Context Analyzer Plugin (Demo)
- Demo plugin showcasing shared utilities usage
- Context usage analysis with health status
- Smart recommendations based on token usage
- Three status levels: healthy/warning/critical
- Actionable insights for context management
- Example implementation for creating new plugins

#### Workspace Management Tools
- `tools/install-plugin.ts`: Install individual plugins by name
- `tools/install-all.ts`: Install all workspace plugins
- `tools/build-all.ts`: Compile all plugin binaries
- `tools/scaffold.ts`: Generate new plugins from template
- `tools/list-plugins.ts`: Display available plugins with status
- Automated plugin development workflow

#### Documentation
- Comprehensive README with quick start guide
- Demo guide explaining workspace transformation
- Plugin-specific README files
- Publishing guide for distributing plugins
- Global and plugin-specific development rules (.claude/CLAUDE.md)
- Claude Code integrations:
  - Custom agent for statusline development
  - Test command for manual testing
  - Render preview skill

#### Development Features
- Zero runtime dependencies (Bun built-ins only)
- Performance-first architecture
- Fail-safe error handling
- Type safety with strict TypeScript
- Modular plugin system
- Code reuse through shared package

### Changed
- N/A (initial release)

### Removed
- Obsolete migration and reorganization guides (post-migration cleanup)
- Temporary test scripts from development phase

### Fixed
- N/A (initial release)

### Security
- No known security issues

## Project Architecture

### Workspace Structure
```
claude-tools/
├── packages/           # Independent plugins
│   ├── statusline/    # Real-time status display
│   └── context-analyzer/  # Context analysis demo
├── shared/            # Shared utilities and types
├── tools/             # Workspace management scripts
└── .claude/           # Global configuration
```

### Key Principles
1. **Modularity**: Each plugin is independent
2. **Code Reuse**: Common functionality in shared/
3. **Zero Dependencies**: Core uses only Bun built-ins
4. **Performance First**: Caching and optimization
5. **Type Safety**: Strict TypeScript throughout

### Plugin Types Supported
- **Statusline**: Real-time display in Claude Code
- **Hook**: Event-driven responses
- **Command**: Custom CLI commands
- **Skill**: Claude-usable capabilities
- **Tool**: Standalone utilities

## Installation

```bash
# Clone the repository
git clone https://github.com/V4lle-Tech/claude-tools.git
cd claude-tools

# Install dependencies
bun install

# Install all plugins
bun run install:all

# Or install specific plugin
bun run plugin statusline
```

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create your plugin in `packages/`
3. Follow coding standards in `.claude/CLAUDE.md`
4. Add tests for new features
5. Submit a pull request

## Credits

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Claude Code](https://claude.ai/code) - AI-powered development

Developed with assistance from Claude Sonnet 4.5

---

[Unreleased]: https://github.com/V4lle-Tech/claude-tools/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/V4lle-Tech/claude-tools/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/V4lle-Tech/claude-tools/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/V4lle-Tech/claude-tools/releases/tag/v1.0.0
