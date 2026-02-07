/**
 * Base abstract class for all statusline widgets.
 *
 * Provides common functionality like color formatting and configuration management.
 * All widgets must extend this class and implement the render() method.
 */

import type { ClaudeStdinData } from '../types/claude-stdin';
import type { CacheManager } from '../core/cache-manager';
import type { WidgetConfig } from '../types/config';

/**
 * ANSI color codes for terminal output
 */
export const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
} as const;

export abstract class BaseWidget {
  protected readonly config: WidgetConfig;
  protected readonly cache: CacheManager;

  constructor(config: WidgetConfig, cache: CacheManager) {
    this.config = config;
    this.cache = cache;
  }

  /**
   * Render the widget content.
   *
   * @param data - Claude Code stdin data
   * @returns The rendered string or null if widget should be hidden
   */
  abstract render(data: ClaudeStdinData): Promise<string | null>;

  /**
   * Check if the widget is enabled.
   */
  protected isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  /**
   * Colorize text with ANSI color codes.
   *
   * @param text - Text to colorize
   * @param color - Color name
   * @returns Colorized text
   */
  protected colorize(text: string, color: keyof typeof COLORS): string {
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  /**
   * Apply multiple styles to text.
   *
   * @param text - Text to style
   * @param styles - Array of style names
   * @returns Styled text
   */
  protected style(text: string, styles: (keyof typeof COLORS)[]): string {
    const codes = styles.map((s) => COLORS[s]).join('');
    return `${codes}${text}${COLORS.reset}`;
  }

  /**
   * Safely get a value with a fallback.
   *
   * @param value - Value that might be null/undefined
   * @param fallback - Fallback value
   * @returns Value or fallback
   */
  protected valueOrFallback<T>(value: T | null | undefined, fallback: T): T {
    return value ?? fallback;
  }

  /**
   * Format a percentage safely.
   *
   * @param value - Percentage value (0-100)
   * @param decimals - Number of decimal places (default: 0)
   * @returns Formatted percentage string
   */
  protected formatPercentage(value: number | null | undefined, decimals: number = 0): string {
    const pct = this.valueOrFallback(value, 0);
    return `${pct.toFixed(decimals)}%`;
  }

  /**
   * Get color based on percentage thresholds.
   *
   * @param percentage - Percentage value (0-100)
   * @param lowThreshold - Threshold for yellow (default: 70)
   * @param highThreshold - Threshold for red (default: 90)
   * @returns Color name
   */
  protected getColorForPercentage(
    percentage: number,
    lowThreshold: number = 70,
    highThreshold: number = 90
  ): 'green' | 'yellow' | 'red' {
    if (percentage >= highThreshold) return 'red';
    if (percentage >= lowThreshold) return 'yellow';
    return 'green';
  }
}
