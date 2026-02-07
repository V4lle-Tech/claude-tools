/**
 * CostTrackerWidget - Displays session cost and duration.
 *
 * Example output: $0.15 | ⏱️ 15m
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { CostTrackerWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';
import { formatDuration } from '../utils/time-formatter';

export class CostTrackerWidget extends BaseWidget {
  private readonly costConfig: CostTrackerWidgetConfig;

  constructor(config: CostTrackerWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.costConfig = config;
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const parts: string[] = [];

    // Add cost if enabled
    if (this.costConfig.showCost) {
      const cost = data.cost?.total_cost_usd ?? 0;
      const costStr = `$${cost.toFixed(2)}`;
      parts.push(this.colorize(costStr, 'green'));
    }

    // Add duration if enabled
    if (this.costConfig.showDuration) {
      const durationMs = data.cost?.total_duration_ms ?? 0;
      const durationStr = `⏱️  ${formatDuration(durationMs)}`;
      parts.push(this.colorize(durationStr, 'cyan'));
    }

    if (parts.length === 0) {
      return null;
    }

    return parts.join(' | ');
  }
}
