---
name: test-statusline
description: Test the statusline with various mock inputs to verify widget rendering
---

Test the statusline implementation with realistic scenarios.

## Usage

```bash
/test-statusline [scenario]
```

## Available Scenarios

1. **minimal**: Basic model + context only
   - Tests: ModelWidget, ContextBarWidget, WorkspaceWidget
   - Expected: Green progress bar at 25%

2. **full**: All widgets enabled with realistic data
   - Tests: All widgets including git status and rate limits
   - Expected: Multi-line output with all information

3. **high-context**: 95% context usage (should show red)
   - Tests: Color-coded warnings for high context usage
   - Expected: Red progress bar, warning indicators

## Implementation

The command runs `bun run scripts/test-manual.ts [scenario]` which:
1. Loads mock data from predefined scenarios
2. Pipes it to the statusline script
3. Displays the rendered output
4. Reports render time

## Example Output

```bash
$ /test-statusline full

=== Testing Scenario: full ===

--- Statusline Output ---
[Opus] | 📁 claude-code-statusline | 🌿 master +3 ~5
██████░░░░ 60% | $0.25 | ⏱️ 30m | 5h: 45% | 7d: 23%

--- End Output ---

Render time: 28ms
```

## Debugging Failed Tests

If a test fails:
1. Check `/tmp/statusline-error.log` for errors
2. Run with `DEBUG_STATUSLINE=true` for verbose logging
3. Verify widget configuration in `config/default-config.json`
4. Check cache directory: `/tmp/claude-statusline-cache`

## Adding New Scenarios

Edit `scripts/test-manual.ts` and add a new scenario object to the `scenarios` map.
