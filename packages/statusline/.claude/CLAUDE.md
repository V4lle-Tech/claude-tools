# Claude Code Statusline - Project Rules

This project creates a high-performance statusline for Claude Code using TypeScript and Bun.

## Architecture Principles

1. **Zero Token Cost**: Primary data comes from Claude Code's stdin (free). API calls are cached aggressively.
2. **Performance First**: All expensive operations (git, API) must be cached with appropriate TTL.
3. **Fail Silently**: Widget failures should never break the statusline. Return null to hide broken widgets.
4. **Type Safety**: All data structures must have TypeScript interfaces. No `any` types.

## Development Guidelines

### Adding New Widgets

1. Extend `BaseWidget` class in `src/widgets/base-widget.ts`
2. Implement `render()` method returning `Promise<string | null>`
3. Cache expensive operations using `CacheManager`
4. Add widget initialization to `LayoutEngine` in `src/core/layout-engine.ts`
5. Update configuration schema in `src/types/config.ts`
6. Add default config in `config/default-config.json`
7. Add tests in `tests/unit/widgets.test.ts`

### Testing Approach

- **Unit tests**: Each widget in isolation with mocked data
- **Integration tests**: Full statusline with realistic stdin data
- **Manual testing**: Use `bun run scripts/test-manual.ts [scenario]` with various scenarios

Available test scenarios:
- `minimal`: Basic model + context only
- `full`: All widgets with realistic data
- `high-context`: 95% context usage to test red indicators

### Performance Requirements

- Total render time: < 50ms for all widgets (without API calls)
- Git operations: Must use cache (5s TTL)
- API operations: Must use cache (60s TTL)
- No blocking operations on main thread

## File Organization

- `/src/widgets/`: Display components (one per file)
- `/src/core/`: Shared infrastructure (cache, API, renderer)
- `/src/types/`: TypeScript interfaces (no implementation)
- `/src/utils/`: Helper functions (pure, stateless)
- `/config/`: Default configuration
- `/tests/`: Unit and integration tests

## Dependency Policy

- **Zero runtime dependencies** for core functionality
- Use Bun's built-in APIs: `Bun.stdin`, `Bun.file`, `Bun.spawn`
- Dev dependencies only: `@types/bun`, `bun-types`, testing frameworks

## Code Style

- Use TypeScript strict mode
- Prefer async/await over promises
- Use descriptive variable names (no abbreviations)
- Add JSDoc comments for public APIs
- Use ANSI color constants from `BaseWidget.COLORS`

## Widget Development Workflow

1. Create widget file in `src/widgets/[name].ts`
2. Extend `BaseWidget` and implement `render()`
3. Add widget initialization to `LayoutEngine.initializeWidgets()`
4. Add widget config interface to `src/types/config.ts`
5. Add default widget config to `config/default-config.json`
6. Update layout in config to include new widget
7. Test with `bun run scripts/test-manual.ts full`

## Common Patterns

### Reading from stdin
```typescript
const stdinText = await Bun.stdin.text();
const data: ClaudeStdinData = JSON.parse(stdinText);
```

### Caching expensive operations
```typescript
const cacheKey = `my-widget-${data.session_id}`;
const cached = await this.cache.get<MyData>(cacheKey);
if (cached) return cached;

const freshData = await fetchData();
await this.cache.set(cacheKey, freshData, 60); // 60s TTL
```

### Using colors
```typescript
return this.colorize('Text', 'green');
// or
return this.style('Text', ['bold', 'cyan']);
```

### Error handling
```typescript
try {
  // ... operation
} catch {
  // Fail silently, return null
  return null;
}
```

## Debugging

Set `DEBUG_STATUSLINE=true` environment variable to enable error logging:

```bash
DEBUG_STATUSLINE=true bun run src/index.ts < mock-data.json
```

Errors will be logged to `/tmp/statusline-error.log`.

## Performance Optimization

If render time exceeds 50ms:

1. Check cache hit rates in debug logs
2. Reduce git operations (increase TTL)
3. Reduce API calls (increase TTL)
4. Consider disabling slow widgets
5. Profile with `config.debug.measurePerformance: true`
