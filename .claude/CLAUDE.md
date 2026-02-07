# Claude Tools - Workspace Rules

This workspace contains multiple plugins and tools for Claude Code.

## Workspace Structure

```
claude-tools/
├── packages/        # Independent plugins
├── shared/          # Shared code between plugins
├── tools/           # Workspace management tools
└── .claude/         # Global configuration
```

## Development Guidelines

### Creating New Plugins

Use the scaffold tool:

```bash
bun run create-plugin plugin-name
```

This creates a complete plugin structure with:
- TypeScript configuration
- Package.json with workspace dependencies
- Basic implementation template
- Installation script
- README template

### Using Shared Code

All plugins should use shared utilities to avoid duplication:

```typescript
// Import shared types
import type { ClaudeStdinData } from '@claude-tools/shared/types';

// Import shared utilities
import { CacheManager, SettingsUpdater } from '@claude-tools/shared/utils';

// Import base classes
import { BaseWidget } from '@claude-tools/shared/widgets';
```

### Code Standards

1. **TypeScript Strict Mode**: All code must compile with strict mode
2. **Error Handling**: Fail gracefully, never crash Claude Code
3. **Performance**: Keep plugin execution under 100ms
4. **Documentation**: Add JSDoc comments for public APIs
5. **Testing**: Add tests for new features

### Plugin Types

Different plugins serve different purposes:

- **Statusline**: Real-time display in Claude Code bottom bar
- **Hook**: Responds to Claude Code events
- **Command**: Custom commands accessible in Claude Code
- **Skill**: Capabilities that Claude can use
- **Tool**: Standalone utilities

### Workspace Commands

```bash
# List all plugins
bun run list-plugins

# Install all plugins
bun run install:all

# Build all plugins
bun run build:all

# Create new plugin
bun run create-plugin <name>
```

## Architecture Principles

### 1. Modularity

Each plugin is completely independent and can work standalone or as part of the suite.

### 2. Code Reuse

Common functionality lives in `shared/`:
- Types: Claude Code data structures
- Utils: Cache, settings, credentials
- Widgets: Base classes for UI components

### 3. Zero Dependencies

Core functionality uses only Bun built-ins. Dev dependencies allowed for tooling.

### 4. Performance First

- Cache expensive operations
- Fail fast on errors
- No blocking operations
- Optimize for common case

### 5. Developer Experience

- Quick scaffolding with templates
- Clear documentation
- Helpful error messages
- Simple installation

## Testing Strategy

Each plugin should have:

1. **Unit tests**: Test individual functions
2. **Integration tests**: Test with real Claude Code data
3. **Manual tests**: Scripts for manual verification

## Publishing

Individual plugins can be published to npm independently:

```bash
cd packages/plugin-name
npm publish
```

Or publish all at once:

```bash
bun run publish:all
```

## Debugging

Enable debug mode for detailed logging:

```bash
DEBUG_CLAUDE_TOOLS=true bun run install:all
```

## Performance Requirements

- Plugin initialization: < 50ms
- Command execution: < 100ms
- Statusline render: < 50ms
- Hook processing: < 200ms

## Security

- Never log sensitive data (tokens, credentials)
- Validate all user input
- Use read-only operations when possible
- Respect user privacy
