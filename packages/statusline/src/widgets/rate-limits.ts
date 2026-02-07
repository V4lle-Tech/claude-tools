/**
 * RateLimitsWidget - Displays API usage rate limits.
 *
 * Example output: 5h: 45% | 7d: 23%
 *
 * Color coding:
 * - Green: < 60%
 * - Yellow: 60-79%
 * - Red: >= 80%
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { RateLimitsWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';
import { UsageFetcher } from '../core/usage-fetcher';
import { CredentialReader } from '../core/credential-reader';

export class RateLimitsWidget extends BaseWidget {
  private readonly rateLimitConfig: RateLimitsWidgetConfig;
  private readonly fetcher: UsageFetcher;

  constructor(config: RateLimitsWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.rateLimitConfig = config;

    const credReader = new CredentialReader();
    this.fetcher = new UsageFetcher(cache, credReader, config.apiCacheTTL || 60);
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const limits = await this.fetcher.fetchUsageLimits();
    if (!limits) {
      return null;
    }

    const parts: string[] = [];

    // 5-hour window
    if (this.rateLimitConfig.show5Hour && limits.five_hour) {
      const pct = Math.floor(limits.five_hour.utilization);
      const color = this.getColorForUsage(pct);
      parts.push(this.colorize(`5h: ${pct}%`, color));
    }

    // 7-day window
    if (this.rateLimitConfig.show7Day && limits.seven_day) {
      const pct = Math.floor(limits.seven_day.utilization);
      const color = this.getColorForUsage(pct);
      parts.push(this.colorize(`7d: ${pct}%`, color));
    }

    // 7-day Opus window (if available)
    if (limits.seven_day_opus) {
      const pct = Math.floor(limits.seven_day_opus.utilization);
      const color = this.getColorForUsage(pct);
      parts.push(this.colorize(`7d-opus: ${pct}%`, color));
    }

    if (parts.length === 0) {
      return null;
    }

    return parts.join(' | ');
  }

  /**
   * Get color based on usage percentage.
   * Different thresholds than context (60/80 instead of 70/90).
   */
  private getColorForUsage(percentage: number): 'green' | 'yellow' | 'red' {
    if (percentage >= 80) return 'red';
    if (percentage >= 60) return 'yellow';
    return 'green';
  }
}
