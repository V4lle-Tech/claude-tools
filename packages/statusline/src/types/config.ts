/**
 * Configuration schema for the statusline.
 * Users can override defaults in ~/.config/claude-statusline/config.json
 */

export interface ColorConfig {
  low: string;
  medium: string;
  high: string;
}

export interface WidgetConfig {
  enabled: boolean;
  [key: string]: any;
}

export interface ModelWidgetConfig extends WidgetConfig {
  color: string;
  format: string;
}

export interface WorkspaceWidgetConfig extends WidgetConfig {
  color: string;
  format: string;
  showFullPath: boolean;
}

export interface GitStatusWidgetConfig extends WidgetConfig {
  showBranch: boolean;
  showAheadBehind: boolean;
  showModified: boolean;
  showStaged: boolean;
  cacheTTL: number;
}

export interface ContextBarWidgetConfig extends WidgetConfig {
  width: number;
  colors: ColorConfig;
  thresholds: {
    medium: number;
    high: number;
  };
}

export interface CostTrackerWidgetConfig extends WidgetConfig {
  showDuration: boolean;
  showCost: boolean;
  format: string;
}

export interface RateLimitsWidgetConfig extends WidgetConfig {
  show5Hour: boolean;
  show7Day: boolean;
  apiCacheTTL: number;
  colors: ColorConfig;
}

export interface SubagentWidgetConfig extends WidgetConfig {
  showTokens: boolean;
  showModel: boolean;
  showElapsedTime: boolean;
  tokenCacheTTL: number;
  maxAgentsDetailed: number;
}

export interface LayoutConfig {
  type: 'single-line' | 'multi-line';
  lines: string[][];
}

export interface CacheConfig {
  directory: string;
  cleanupOnStart: boolean;
}

export interface DebugConfig {
  logErrors: boolean;
  errorLogPath: string;
  measurePerformance: boolean;
}

export interface Config {
  layout: LayoutConfig;
  widgets: {
    model: ModelWidgetConfig;
    workspace: WorkspaceWidgetConfig;
    'git-status': GitStatusWidgetConfig;
    'context-bar': ContextBarWidgetConfig;
    'cost-tracker': CostTrackerWidgetConfig;
    'rate-limits': RateLimitsWidgetConfig;
    subagents: SubagentWidgetConfig;
  };
  cache: CacheConfig;
  debug: DebugConfig;
}
