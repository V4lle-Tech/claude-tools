/**
 * JSONL transcript parser for extracting subagent token usage.
 *
 * Parses subagent JSONL files to sum token counts from API responses.
 * Uses CacheManager with file mtime checking to avoid re-parsing unchanged files.
 */

import { stat as fsStat, readFile } from 'fs/promises';
import type { CacheManager } from '../core/cache-manager';

interface CachedTokenData {
  tokens: number;
  mtime: number;
  size: number;
}

/**
 * Get total tokens consumed by a subagent from its transcript JSONL file.
 *
 * @param transcriptPath - Absolute path to the subagent's JSONL transcript
 * @param cache - CacheManager instance for TTL-based caching
 * @param cacheTTL - Cache TTL in seconds (default: 3)
 * @returns Total token count or null on error
 */
export async function getSubagentTokens(
  transcriptPath: string,
  cache: CacheManager,
  cacheTTL: number = 3
): Promise<number | null> {
  try {
    const cacheKey = `jsonl-tokens-${transcriptPath}`;

    let fileStat;
    try {
      fileStat = await fsStat(transcriptPath);
    } catch {
      return null;
    }

    const mtime = fileStat.mtimeMs;
    const size = fileStat.size;

    // Check cache - skip parsing if file hasn't changed (check both mtime and size)
    const cached = await cache.get<CachedTokenData>(cacheKey);
    if (cached && cached.mtime === mtime && cached.size === size) {
      return cached.tokens;
    }

    // Parse JSONL and sum tokens
    const content = await readFile(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    let totalTokens = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Look for usage data in API response entries
        const usage = entry?.usage ?? entry?.message?.usage ?? entry?.response?.usage;
        if (usage) {
          totalTokens += (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Cache the result
    await cache.set(cacheKey, { tokens: totalTokens, mtime, size }, cacheTTL);

    return totalTokens;
  } catch {
    return null;
  }
}

/**
 * Format a token count to a human-readable short string.
 *
 * @param tokens - Raw token count
 * @returns Formatted string like "8K", "1.2M", "500"
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return millions >= 10 ? `${Math.round(millions)}M` : `${millions.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const thousands = tokens / 1_000;
    return thousands >= 10 ? `${Math.round(thousands)}K` : `${thousands.toFixed(1)}K`;
  }
  return String(tokens);
}
