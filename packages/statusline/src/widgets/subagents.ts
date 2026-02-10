/**
 * SubagentWidget - Displays active subagent information.
 *
 * Shows a full dashboard with count, elapsed time, model/type, and token usage
 * per active subagent. Only renders when subagents are active (returns null otherwise),
 * making the third statusline line appear/disappear dynamically.
 *
 * Example output: ⚡ 2 agents (45s) | Explore:Haiku 8K | Plan:Sonnet 4K
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { SubagentWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';
import { readState } from '../utils/subagent-state';
import { getSubagentTokens, formatTokenCount } from '../utils/jsonl-parser';
import { formatDuration } from '../utils/time-formatter';

export class SubagentWidget extends BaseWidget {
  private readonly subagentConfig: SubagentWidgetConfig;

  constructor(config: SubagentWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.subagentConfig = config;
  }

  async render(_data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) return null;

    try {
      const state = await readState();

      if (state.active.length === 0) return null;

      const parts: string[] = [];
      const count = state.active.length;

      // Summary: "⚡ 2 agents (45s)"
      let summary = `⚡ ${count} agent${count !== 1 ? 's' : ''}`;

      if (this.subagentConfig.showElapsedTime) {
        const maxElapsed = Math.max(...state.active.map((a) => Date.now() - a.started_at));
        summary += ` (${formatDuration(maxElapsed)})`;
      }

      parts.push(this.style(summary, ['bold', 'yellow']));

      // Per-agent details (capped by maxAgentsDetailed)
      const agentsToShow = state.active.slice(0, this.subagentConfig.maxAgentsDetailed);

      for (const agent of agentsToShow) {
        let label = agent.agent_type;

        if (this.subagentConfig.showModel && agent.model && agent.model !== 'unknown') {
          label += `:${agent.model}`;
        }

        if (this.subagentConfig.showTokens && agent.transcript_path) {
          const tokens = await getSubagentTokens(
            agent.transcript_path,
            this.cache,
            this.subagentConfig.tokenCacheTTL
          );
          if (tokens !== null && tokens > 0) {
            label += ` ${formatTokenCount(tokens)}`;
          }
        }

        parts.push(this.colorize(label, 'cyan'));
      }

      // Show overflow count if more agents than maxAgentsDetailed
      const overflow = state.active.length - agentsToShow.length;
      if (overflow > 0) {
        parts.push(this.colorize(`+${overflow} more`, 'gray'));
      }

      return parts.join(' | ');
    } catch {
      return null;
    }
  }
}
