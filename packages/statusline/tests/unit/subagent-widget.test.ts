import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SubagentWidget } from '../../src/widgets/subagents';
import { CacheManager } from '../../src/core/cache-manager';
import { writeState, STATE_FILE_PATH } from '../../src/utils/subagent-state';
import type { SubagentState } from '../../src/utils/subagent-state';
import type { SubagentWidgetConfig } from '../../src/types/config';
import type { ClaudeStdinData } from '../../src/types/claude-stdin';
import { unlink } from 'fs/promises';

const mockStdinData: ClaudeStdinData = {
  model: { id: 'claude-opus-4', display_name: 'Opus' },
  workspace: { current_dir: '/test', project_dir: '/test' },
  cwd: '/test',
  session_id: 'test-session',
  transcript_path: '/tmp/transcript.json',
  cost: {
    total_cost_usd: 0.1,
    total_duration_ms: 60000,
    total_api_duration_ms: 5000,
    total_lines_added: 10,
    total_lines_removed: 5,
  },
  context_window: {
    total_input_tokens: 50000,
    total_output_tokens: 20000,
    context_window_size: 200000,
    used_percentage: 35,
    remaining_percentage: 65,
    current_usage: null,
  },
  exceeds_200k_tokens: false,
  version: '1.0.0',
  output_style: { name: 'default' },
};

const defaultConfig: SubagentWidgetConfig = {
  enabled: true,
  showTokens: true,
  showModel: true,
  showElapsedTime: true,
  tokenCacheTTL: 3,
  maxAgentsDetailed: 4,
};

describe('SubagentWidget', () => {
  let cache: CacheManager;
  let widget: SubagentWidget;

  beforeEach(async () => {
    cache = new CacheManager('/tmp/claude-statusline-test-cache');
    await cache.initialize();
    widget = new SubagentWidget(defaultConfig, cache);

    // Clean state file
    try {
      await unlink(STATE_FILE_PATH);
    } catch {
      // File may not exist
    }
  });

  afterEach(async () => {
    try {
      await unlink(STATE_FILE_PATH);
    } catch {
      // File may not exist
    }
    await cache.clear();
  });

  it('returns null when disabled', async () => {
    const disabledWidget = new SubagentWidget({ ...defaultConfig, enabled: false }, cache);
    const result = await disabledWidget.render(mockStdinData);
    expect(result).toBeNull();
  });

  it('returns null when no agents are active', async () => {
    const result = await widget.render(mockStdinData);
    expect(result).toBeNull();
  });

  it('returns null when state file is empty', async () => {
    await writeState({ active: [], last_updated: Date.now() });
    const result = await widget.render(mockStdinData);
    expect(result).toBeNull();
  });

  it('renders a single active agent', async () => {
    const state: SubagentState = {
      active: [
        {
          agent_id: 'a1',
          agent_type: 'Explore',
          model: 'Haiku',
          started_at: Date.now() - 30000,
          session_id: 'test',
        },
      ],
      last_updated: Date.now(),
    };
    await writeState(state);

    const result = await widget.render(mockStdinData);
    expect(result).not.toBeNull();
    expect(result).toContain('1 agent');
    expect(result).toContain('Explore:Haiku');
  });

  it('renders multiple active agents', async () => {
    const state: SubagentState = {
      active: [
        {
          agent_id: 'a1',
          agent_type: 'Explore',
          model: 'Haiku',
          started_at: Date.now() - 45000,
          session_id: 'test',
        },
        {
          agent_id: 'a2',
          agent_type: 'Plan',
          model: 'Sonnet',
          started_at: Date.now() - 20000,
          session_id: 'test',
        },
      ],
      last_updated: Date.now(),
    };
    await writeState(state);

    const result = await widget.render(mockStdinData);
    expect(result).not.toBeNull();
    expect(result).toContain('2 agents');
    expect(result).toContain('Explore:Haiku');
    expect(result).toContain('Plan:Sonnet');
  });

  it('shows overflow when more agents than maxAgentsDetailed', async () => {
    const limitedWidget = new SubagentWidget({ ...defaultConfig, maxAgentsDetailed: 1 }, cache);
    const state: SubagentState = {
      active: [
        {
          agent_id: 'a1',
          agent_type: 'Explore',
          model: 'Haiku',
          started_at: Date.now() - 30000,
          session_id: 'test',
        },
        {
          agent_id: 'a2',
          agent_type: 'Plan',
          model: 'Sonnet',
          started_at: Date.now() - 20000,
          session_id: 'test',
        },
      ],
      last_updated: Date.now(),
    };
    await writeState(state);

    const result = await limitedWidget.render(mockStdinData);
    expect(result).not.toBeNull();
    expect(result).toContain('2 agents');
    expect(result).toContain('+1 more');
  });

  it('hides model when showModel is false', async () => {
    const noModelWidget = new SubagentWidget({ ...defaultConfig, showModel: false }, cache);
    const state: SubagentState = {
      active: [
        {
          agent_id: 'a1',
          agent_type: 'Explore',
          model: 'Haiku',
          started_at: Date.now() - 30000,
          session_id: 'test',
        },
      ],
      last_updated: Date.now(),
    };
    await writeState(state);

    const result = await noModelWidget.render(mockStdinData);
    expect(result).not.toBeNull();
    expect(result).toContain('Explore');
    expect(result).not.toContain('Haiku');
  });

  it('hides elapsed time when showElapsedTime is false', async () => {
    const noTimeWidget = new SubagentWidget({ ...defaultConfig, showElapsedTime: false }, cache);
    const state: SubagentState = {
      active: [
        {
          agent_id: 'a1',
          agent_type: 'Explore',
          model: 'Haiku',
          started_at: Date.now() - 30000,
          session_id: 'test',
        },
      ],
      last_updated: Date.now(),
    };
    await writeState(state);

    const result = await noTimeWidget.render(mockStdinData);
    expect(result).not.toBeNull();
    // Should not contain the time portion in parentheses
    expect(result).not.toMatch(/\(\d+s\)/);
  });
});
