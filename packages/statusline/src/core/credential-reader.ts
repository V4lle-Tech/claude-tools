/**
 * CredentialReader - Reads OAuth credentials from Claude Code.
 *
 * Reads credentials from ~/.claude/.credentials.json
 */

import { join } from 'path';
import { homedir } from 'os';
import type { CredentialData } from '../types/usage-api';

export class CredentialReader {
  private readonly credPath: string;

  constructor() {
    this.credPath = join(homedir(), '.claude', '.credentials.json');
  }

  /**
   * Get the full credentials object.
   */
  async getCredentials(): Promise<CredentialData | null> {
    try {
      const file = Bun.file(this.credPath);
      const exists = await file.exists();

      if (!exists) {
        return null;
      }

      const data = await file.json();
      return data as CredentialData;
    } catch {
      return null;
    }
  }

  /**
   * Get just the access token.
   */
  async getAccessToken(): Promise<string | null> {
    const creds = await this.getCredentials();
    return creds?.claudeAiOauth?.accessToken ?? null;
  }

  /**
   * Get subscription type.
   */
  async getSubscriptionType(): Promise<string | null> {
    const creds = await this.getCredentials();
    return creds?.claudeAiOauth?.subscriptionType ?? null;
  }

  /**
   * Get rate limit tier.
   */
  async getRateLimitTier(): Promise<string | null> {
    const creds = await this.getCredentials();
    return creds?.claudeAiOauth?.rateLimitTier ?? null;
  }

  /**
   * Check if credentials exist and are valid.
   */
  async hasValidCredentials(): Promise<boolean> {
    const creds = await this.getCredentials();

    if (!creds?.claudeAiOauth) {
      return false;
    }

    // Check if token is expired
    const expiresAt = creds.claudeAiOauth.expiresAt;
    if (expiresAt && Date.now() > expiresAt) {
      return false;
    }

    return true;
  }
}
