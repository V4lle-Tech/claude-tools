/**
 * LayoutEngine - Orchestrates widget rendering and manages multi-line layouts.
 *
 * Responsibilities:
 * - Initialize widgets based on configuration
 * - Coordinate widget rendering
 * - Manage multi-line layouts
 * - Handle spacing and formatting
 */

import type { Config } from '../types/config';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { CacheManager } from './cache-manager';
import type { BaseWidget } from '../widgets/base-widget';

// Import widgets
import { ModelWidget } from '../widgets/model';
import { ContextBarWidget } from '../widgets/context-bar';
import { WorkspaceWidget } from '../widgets/workspace';
import { CostTrackerWidget } from '../widgets/cost-tracker';
import { GitStatusWidget } from '../widgets/git-status';
import { RateLimitsWidget } from '../widgets/rate-limits';
import { SubagentWidget } from '../widgets/subagents';

export class LayoutEngine {
  private readonly config: Config;
  private readonly cache: CacheManager;
  private readonly widgets: Map<string, BaseWidget>;

  constructor(config: Config, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
    this.widgets = new Map();

    this.initializeWidgets();
  }

  /**
   * Initialize all widgets based on configuration.
   */
  private initializeWidgets(): void {
    // Model widget
    if (this.config.widgets.model?.enabled) {
      this.widgets.set('model', new ModelWidget(this.config.widgets.model, this.cache));
    }

    // Context bar widget
    if (this.config.widgets['context-bar']?.enabled) {
      this.widgets.set(
        'context-bar',
        new ContextBarWidget(this.config.widgets['context-bar'], this.cache)
      );
    }

    // Workspace widget
    if (this.config.widgets.workspace?.enabled) {
      this.widgets.set('workspace', new WorkspaceWidget(this.config.widgets.workspace, this.cache));
    }

    // Cost tracker widget
    if (this.config.widgets['cost-tracker']?.enabled) {
      this.widgets.set(
        'cost-tracker',
        new CostTrackerWidget(this.config.widgets['cost-tracker'], this.cache)
      );
    }

    // Git status widget
    if (this.config.widgets['git-status']?.enabled) {
      this.widgets.set(
        'git-status',
        new GitStatusWidget(this.config.widgets['git-status'], this.cache)
      );
    }

    // Rate limits widget
    if (this.config.widgets['rate-limits']?.enabled) {
      this.widgets.set(
        'rate-limits',
        new RateLimitsWidget(this.config.widgets['rate-limits'], this.cache)
      );
    }

    // Subagents widget
    if (this.config.widgets.subagents?.enabled) {
      this.widgets.set('subagents', new SubagentWidget(this.config.widgets.subagents, this.cache));
    }
  }

  /**
   * Render the complete statusline.
   *
   * @param data - Claude Code stdin data
   * @returns Rendered statusline string
   */
  async render(data: ClaudeStdinData): Promise<string> {
    if (this.config.layout.type === 'single-line') {
      return this.renderSingleLine(data);
    } else {
      return this.renderMultiLine(data);
    }
  }

  /**
   * Render all widgets in a single line.
   */
  private async renderSingleLine(data: ClaudeStdinData): Promise<string> {
    const parts: string[] = [];

    // Render all widgets
    for (const [name, widget] of this.widgets) {
      try {
        const output = await widget.render(data);
        if (output) {
          parts.push(output);
        }
      } catch (error) {
        // Widget failed - skip it silently
        if (this.config.debug.logErrors) {
          console.error(`Widget ${name} failed:`, error);
        }
      }
    }

    return parts.join(' | ');
  }

  /**
   * Render widgets in multiple lines based on layout configuration.
   */
  private async renderMultiLine(data: ClaudeStdinData): Promise<string> {
    const lines: string[] = [];

    for (const lineWidgets of this.config.layout.lines) {
      const parts: string[] = [];

      for (const widgetName of lineWidgets) {
        const widget = this.widgets.get(widgetName);
        if (!widget) {
          continue;
        }

        try {
          const output = await widget.render(data);
          if (output) {
            parts.push(output);
          }
        } catch (error) {
          // Widget failed - skip it silently
          if (this.config.debug.logErrors) {
            console.error(`Widget ${widgetName} failed:`, error);
          }
        }
      }

      if (parts.length > 0) {
        lines.push(parts.join(' | '));
      }
    }

    return lines.join('\n');
  }

  /**
   * Get performance metrics (if enabled).
   */
  async measurePerformance(data: ClaudeStdinData): Promise<{ totalMs: number; widgets: Map<string, number> }> {
    const startTime = performance.now();
    const widgetTimes = new Map<string, number>();

    for (const [name, widget] of this.widgets) {
      const widgetStart = performance.now();
      try {
        await widget.render(data);
      } catch {
        // Ignore errors in performance measurement
      }
      widgetTimes.set(name, performance.now() - widgetStart);
    }

    return {
      totalMs: performance.now() - startTime,
      widgets: widgetTimes,
    };
  }
}
