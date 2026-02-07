/**
 * ContextBarWidget - Displays context window usage as a progress bar.
 *
 * Example output: ██████░░░░ 60%
 *
 * Color coding:
 * - Green: < 70%
 * - Yellow: 70-89%
 * - Red: >= 90%
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { ContextBarWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';

export class ContextBarWidget extends BaseWidget {
  private readonly contextConfig: ContextBarWidgetConfig;

  constructor(config: ContextBarWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.contextConfig = config;
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const percentage = this.valueOrFallback(data.context_window?.used_percentage, 0);
    const pct = Math.floor(percentage);

    // Build progress bar
    const width = this.contextConfig.width || 10;
    const filled = Math.floor((pct * width) / 100);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const text = `${bar} ${pct}%`;

    // Get color based on thresholds
    const color = this.getColorForPercentage(
      pct,
      this.contextConfig.thresholds.medium,
      this.contextConfig.thresholds.high
    );

    return this.colorize(text, color);
  }
}
