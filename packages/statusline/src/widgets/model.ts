/**
 * ModelWidget - Displays the current Claude model name.
 *
 * Example output: [Opus] or [Sonnet]
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { ModelWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';

export class ModelWidget extends BaseWidget {
  private readonly modelConfig: ModelWidgetConfig;

  constructor(config: ModelWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.modelConfig = config;
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const modelName = data.model?.display_name || 'Unknown';

    // Apply color if specified
    const text = this.modelConfig.format.replace('{name}', modelName);

    if (this.modelConfig.color) {
      return this.colorize(text, this.modelConfig.color as any);
    }

    return text;
  }
}
