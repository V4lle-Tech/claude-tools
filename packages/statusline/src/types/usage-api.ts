/**
 * TypeScript interfaces for Anthropic API responses related to usage limits.
 *
 * Based on: https://github.com/nsanden/claude-rate-monitor
 */

export interface UsageLimitWindow {
  /** Current utilization percentage (0-100) */
  utilization: number;

  /** ISO timestamp when this limit window resets */
  resets_at: string | null;
}

export interface UsageLimitsResponse {
  /** 5-hour usage window (session-based) */
  five_hour: UsageLimitWindow | null;

  /** 7-day usage window (weekly) */
  seven_day: UsageLimitWindow | null;

  /** 7-day Opus-specific usage window */
  seven_day_opus: UsageLimitWindow | null;
}

export interface ClaudeOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
  rateLimitTier: string;
}

export interface CredentialData {
  claudeAiOauth: ClaudeOAuthCredentials;
}
