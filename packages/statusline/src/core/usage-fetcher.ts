/**
 * UsageFetcher - Fetches usage limits from Anthropic API.
 *
 * Fetches from https://api.anthropic.com/api/oauth/usage
 * with aggressive caching to minimize API cost.
 */

import type { UsageLimitsResponse } from '../types/usage-api';
import type { CacheManager } from './cache-manager';
import { CredentialReader } from './credential-reader';

export class UsageFetcher {
  private readonly USAGE_API_URL = 'https://api.anthropic.com/api/oauth/usage';
  private readonly CACHE_KEY = 'usage-limits';
  private readonly cacheTTL: number;

  constructor(
    private cache: CacheManager,
    private credReader: CredentialReader,
    cacheTTL: number = 60
  ) {
    this.cacheTTL = cacheTTL;
  }

  /**
   * Fetch usage limits from API with caching.
   */
  async fetchUsageLimits(): Promise<UsageLimitsResponse | null> {
    // Check cache first
    const cached = await this.cache.get<UsageLimitsResponse>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Check if credentials are valid
    const hasValidCreds = await this.credReader.hasValidCredentials();
    if (!hasValidCreds) {
      return null;
    }

    // Get access token
    const accessToken = await this.credReader.getAccessToken();
    if (!accessToken) {
      return null;
    }

    try {
      // Fetch from API
      const response = await fetch(this.USAGE_API_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'anthropic-beta': 'oauth-2025-04-20',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data: UsageLimitsResponse = await response.json();

      // Cache for next time
      await this.cache.set(this.CACHE_KEY, data, this.cacheTTL);

      return data;
    } catch {
      // Network error or API error - fail silently
      return null;
    }
  }
}
