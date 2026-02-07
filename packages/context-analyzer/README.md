# Context Analyzer

Analyzes Claude Code context usage and provides actionable recommendations.

## Features

- 📊 Real-time context usage analysis
- ⚠️ Status indicators (healthy/warning/critical)
- 💡 Smart recommendations based on usage patterns
- 📈 Detailed metrics (input/output token breakdown)
- 🎯 Actionable insights to optimize context usage

## Installation

```bash
cd packages/context-analyzer
bun install
bun run install
```

## Usage

### Manual Analysis

```bash
# Pipe Claude Code stdin data
echo '{"model": {...}, "context_window": {...}}' | ./context-analyzer
```

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CONTEXT ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ⚠️  WARNING
Usage: 85% of 200,000 tokens

📈 Metrics:
   Input tokens:  120,000
   Output tokens: 50,000
   Total tokens:  170,000

💡 Recommendations:
   ⚠️  WARNING: Context usage is high.
   💡 Tip: Consider summarizing earlier parts of the conversation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Development

```bash
# Run tests
bun test

# Build binary
bun run build

# Test with mock data
echo '{"context_window":{"used_percentage":85}}' | ./context-analyzer
```

## Status Levels

- **Healthy** (< 70%): Context usage is optimal
- **Warning** (70-89%): Consider optimizing context
- **Critical** (≥ 90%): Action required - context almost full
