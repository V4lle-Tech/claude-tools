---
name: render-preview
description: Preview statusline output with color rendering in terminal
---

Generate a visual preview of the statusline with ANSI colors properly rendered.

## Capabilities

1. Renders statusline with actual colors (not escape codes)
2. Shows multi-line layouts
3. Displays render time metrics
4. Validates output format

## Usage

Ask Claude to "preview the statusline" or "show me how the statusline looks".

The skill will:
1. Run the statusline with mock data
2. Capture output
3. Display it with proper color rendering
4. Report performance metrics

## Example Output

```
Testing statusline with full scenario...

[Opus] | 📁 my-project | 🌿 main +3 ~5
██████░░░░ 60% | $0.15 | ⏱️ 15m | 5h: 45% | 7d: 23%

Render time: 28ms
Widgets active: 6/6
Cache hits: 4/5 (80%)
```

## What Gets Tested

- ✅ Model display (color: cyan)
- ✅ Workspace path (color: blue)
- ✅ Git status (branch in cyan, indicators color-coded)
- ✅ Context bar (color based on usage: green/yellow/red)
- ✅ Cost tracker (cost in green, duration in cyan)
- ✅ Rate limits (color based on usage thresholds)

## Performance Analysis

The preview includes:
- **Render time**: Total time to generate output (target: < 50ms)
- **Cache hits**: Percentage of cached vs fresh data
- **Widget count**: Number of active widgets
- **Line count**: Number of output lines

## Scenarios Available

- **minimal**: Fast test with basic widgets
- **full**: Complete statusline with all features
- **high-context**: Test warning colors for high usage

## Implementation

The skill executes:
```bash
bun run scripts/test-manual.ts [scenario]
```

And parses the output to provide formatted feedback.
