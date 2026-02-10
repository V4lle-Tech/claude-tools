# Claude Code Statusline

A high-performance, real-time statusline for Claude Code that displays token usage, rate limits, git status, and session metrics.

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

## Features

- 📊 **Real-time Token Usage**: Context window progress bar with color-coded warnings
- ⏱️ **Session Metrics**: Cost tracking and duration display
- 🌿 **Git Integration**: Branch name with staged/modified file indicators
- 📈 **Rate Limits**: 5-hour and 7-day API usage monitoring
- ⚡ **Subagent Monitoring**: Track active subagents with model info and token usage
- 🚀 **High Performance**: < 50ms render time with aggressive caching
- 💰 **Low Cost**: ~$0.02 per 8-hour session through smart caching

## Example Output

```
[Opus] | 📁 my-project | 🌿 main +3 ~5
██████░░░░ 60% | $0.25 | ⏱️ 30m | 5h: 45% | 7d: 23%
⚡ 2 agents (45s) | Explore:Haiku 8K | Plan:Sonnet 4K
```

**Legend:**
- `[Opus]`: Current Claude model
- `📁 my-project`: Working directory
- `🌿 main`: Git branch
- `+3`: 3 staged files (green)
- `~5`: 5 modified files (yellow)
- `60%`: Context window usage (green/yellow/red)
- `$0.25`: Session cost
- `⏱️ 30m`: Session duration
- `5h: 45%`: 5-hour rate limit usage
- `7d: 23%`: 7-day rate limit usage
- `⚡ 2 agents`: 2 active subagents
- `(45s)`: Elapsed time since first agent started
- `Explore:Haiku 8K`: Agent type, model, and token count

## Installation

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Claude Code CLI installed
- Git (optional, for git status widget)

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Install Statusline

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-statusline.git
cd claude-code-statusline

# Install and configure
bun install
bun run install:statusline
```

The installation script will:
1. Compile the statusline to a binary
2. Update `~/.claude/settings.json` automatically
3. Create config directory at `~/.config/claude-statusline`

### Verify Installation

```bash
# Test with mock data
bun run scripts/test-manual.ts full
```

## Usage

Once installed, the statusline will appear automatically at the bottom of Claude Code sessions.

### Manual Testing

Test different scenarios:

```bash
# Minimal scenario (basic widgets only)
bun run scripts/test-manual.ts minimal

# Full scenario (all widgets)
bun run scripts/test-manual.ts full

# High context scenario (test warning colors)
bun run scripts/test-manual.ts high-context
```

### Debug Mode

Enable error logging:

```bash
DEBUG_STATUSLINE=true bun run src/index.ts < tests/fixtures/mock-stdin.json
```

Errors will be logged to `/tmp/statusline-error.log`.

## Configuration

### Default Configuration

The default configuration is located in `config/default-config.json`.

### User Overrides

Create `~/.config/claude-statusline/config.json` to override defaults:

```json
{
  "layout": {
    "type": "multi-line",
    "lines": [
      ["model", "workspace", "git-status"],
      ["context-bar", "cost-tracker", "rate-limits"],
      ["subagents"]
    ]
  },
  "widgets": {
    "context-bar": {
      "enabled": true,
      "width": 15,
      "thresholds": {
        "medium": 60,
        "high": 85
      }
    },
    "git-status": {
      "enabled": true,
      "cacheTTL": 10
    },
    "rate-limits": {
      "enabled": true,
      "apiCacheTTL": 120
    },
    "subagents": {
      "enabled": true,
      "showTokens": true,
      "showModel": true,
      "showElapsedTime": true,
      "tokenCacheTTL": 3,
      "maxAgentsDetailed": 4
    }
  }
}
```

### Available Widgets

| Widget | Description | Performance |
|--------|-------------|-------------|
| `model` | Current Claude model name | Instant |
| `workspace` | Working directory | Instant |
| `context-bar` | Context window progress bar | Instant |
| `cost-tracker` | Session cost and duration | Instant |
| `git-status` | Git branch and file counts | Cached 5s |
| `rate-limits` | API usage limits | Cached 60s |
| `subagents` | Active subagent monitoring with token tracking | Cached 3s |

### Widget Options

#### Model Widget
```json
{
  "enabled": true,
  "color": "cyan",
  "format": "[{name}]"
}
```

#### Context Bar Widget
```json
{
  "enabled": true,
  "width": 10,
  "thresholds": {
    "medium": 70,
    "high": 90
  }
}
```

#### Git Status Widget
```json
{
  "enabled": true,
  "showBranch": true,
  "showAheadBehind": true,
  "showModified": true,
  "showStaged": true,
  "cacheTTL": 5
}
```

#### Rate Limits Widget
```json
{
  "enabled": true,
  "show5Hour": true,
  "show7Day": true,
  "apiCacheTTL": 60
}
```

#### Subagents Widget
```json
{
  "enabled": true,
  "showTokens": true,
  "showModel": true,
  "showElapsedTime": true,
  "tokenCacheTTL": 3,
  "maxAgentsDetailed": 4
}
```

**Options:**
- `showTokens`: Display token usage per agent (parsed from transcript JSONL files)
- `showModel`: Show agent model name (e.g., Haiku, Sonnet, Opus)
- `showElapsedTime`: Display elapsed time since first agent started
- `tokenCacheTTL`: Cache duration in seconds for token parsing (default: 3s)
- `maxAgentsDetailed`: Maximum agents to show with details; additional agents shown as "+N more" (default: 4)

**Note:** The subagents widget only appears when subagents are active. It displays on line 3 (if using multi-line layout) and disappears automatically when all agents complete.

## Architecture

### Data Flow

```
Claude Code (stdin)
    ↓
index.ts (entry point)
    ↓
LayoutEngine (orchestrator)
    ↓
Widgets (render components)
    ↓
CacheManager (performance layer)
    ↓
GitHelper / UsageFetcher (data sources)
```

### Key Components

- **Entry Point** (`src/index.ts`): Reads stdin, initializes cache, renders output
- **Layout Engine** (`src/core/layout-engine.ts`): Orchestrates widget rendering
- **Cache Manager** (`src/core/cache-manager.ts`): File-based caching with TTL
- **Widgets** (`src/widgets/`): Independent rendering components
- **Git Helper** (`src/utils/git-helper.ts`): Git command wrappers
- **Usage Fetcher** (`src/core/usage-fetcher.ts`): Anthropic API client

### Caching Strategy

| Data Source | TTL | Cost |
|-------------|-----|------|
| Claude stdin | 0s (instant) | $0 |
| Git commands | 5s | $0 |
| Anthropic API | 60s | ~$0.001/call |

**Result**: ~$0.02 per 8-hour session

## Development

### Project Structure

```
claude-code-statusline/
├── src/
│   ├── index.ts              # Entry point
│   ├── types/                # TypeScript interfaces
│   ├── widgets/              # Display components
│   ├── core/                 # Infrastructure
│   └── utils/                # Helper functions
├── config/
│   └── default-config.json   # Default settings
├── tests/
│   ├── fixtures/             # Mock data
│   └── unit/                 # Unit tests
├── scripts/
│   ├── install.ts            # Installation script
│   └── test-manual.ts        # Manual testing
└── .claude/
    ├── CLAUDE.md             # Project rules
    ├── agents/               # Custom agents
    ├── commands/             # Custom commands
    └── skills/               # Custom skills
```

### Adding a New Widget

1. Create widget file:
   ```typescript
   // src/widgets/my-widget.ts
   import { BaseWidget } from './base-widget';

   export class MyWidget extends BaseWidget {
     async render(data: ClaudeStdinData): Promise<string | null> {
       if (!this.isEnabled()) return null;
       return this.colorize('My Output', 'green');
     }
   }
   ```

2. Register in `LayoutEngine`:
   ```typescript
   import { MyWidget } from '../widgets/my-widget';

   // In initializeWidgets()
   if (this.config.widgets['my-widget']?.enabled) {
     this.widgets.set('my-widget', new MyWidget(...));
   }
   ```

3. Add config interface and defaults

4. Test:
   ```bash
   bun run scripts/test-manual.ts full
   ```

### Running Tests

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Manual integration tests
bun run scripts/test-manual.ts [scenario]
```

### Performance Profiling

Enable performance measurement in config:

```json
{
  "debug": {
    "measurePerformance": true,
    "logErrors": true
  }
}
```

Performance metrics will be logged to `/tmp/statusline-error.log`.

## Troubleshooting

### Statusline Not Showing

1. Check Claude Code settings:
   ```bash
   cat ~/.claude/settings.json
   ```

2. Verify `statusLine` configuration exists

3. Test manually:
   ```bash
   bun run scripts/test-manual.ts minimal
   ```

### Rate Limits Not Showing

1. Check credentials:
   ```bash
   ls -la ~/.claude/.credentials.json
   ```

2. Verify OAuth token is valid

3. Test API access:
   ```bash
   DEBUG_STATUSLINE=true bun run scripts/test-manual.ts full
   ```

### Slow Performance

1. Check cache hit rates in debug logs

2. Increase cache TTLs:
   ```json
   {
     "widgets": {
       "git-status": { "cacheTTL": 10 },
       "rate-limits": { "apiCacheTTL": 120 }
     }
   }
   ```

3. Disable expensive widgets temporarily

### Git Status Not Working

1. Verify you're in a git repository:
   ```bash
   git status
   ```

2. Check git command availability:
   ```bash
   which git
   ```

3. Review cache:
   ```bash
   ls -la /tmp/claude-statusline-cache
   ```

## Contributing

Contributions are welcome! Please:

1. Follow the code style in `.claude/CLAUDE.md`
2. Add tests for new features
3. Update documentation
4. Keep performance under 50ms

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Inspired by [claude-rate-monitor](https://github.com/nsanden/claude-rate-monitor)
- Built with [Bun](https://bun.sh)
- For [Claude Code](https://code.claude.com)

## Related Projects

- [claude-rate-monitor](https://github.com/nsanden/claude-rate-monitor) - CLI rate limit monitor
- [Claude Code Docs](https://code.claude.com/docs/en/statusline) - Official statusline documentation

## Support

- 📚 Documentation: See `.claude/CLAUDE.md` for development guidelines
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/claude-code-statusline/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/claude-code-statusline/discussions)

---

Made with ❤️ for the Claude Code community
