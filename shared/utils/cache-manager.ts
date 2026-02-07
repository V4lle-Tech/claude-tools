/**
 * File-based cache manager with TTL (Time To Live) support.
 *
 * Used to cache expensive operations like git commands and API calls
 * to improve statusline performance.
 *
 * Features:
 * - TTL-based expiration
 * - Graceful error handling (fails silently)
 * - JSON serialization
 * - Automatic cleanup on cache directory creation
 */

import { join } from 'path';
import { mkdir, unlink } from 'fs/promises';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheManager {
  private readonly cacheDir: string;

  constructor(cacheDir: string = '/tmp/claude-statusline-cache') {
    this.cacheDir = cacheDir;
  }

  /**
   * Initialize cache directory. Call this before first use.
   */
  async initialize(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
    } catch {
      // Directory already exists or cannot be created - fail silently
    }
  }

  /**
   * Get a cached value by key.
   *
   * @param key - Cache key
   * @returns The cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key);
      const file = Bun.file(filePath);

      const exists = await file.exists();
      if (!exists) {
        return null;
      }

      const entry: CacheEntry<T> = await file.json();

      // Check expiration
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      // File doesn't exist, is corrupted, or permission error - fail silently
      return null;
    }
  }

  /**
   * Set a value in the cache with TTL.
   *
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        expiresAt: Date.now() + ttlSeconds * 1000,
      };

      const filePath = this.getFilePath(key);
      await Bun.write(filePath, JSON.stringify(entry));
    } catch {
      // Permission error or disk full - fail silently
    }
  }

  /**
   * Delete a cached value by key.
   *
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const file = Bun.file(filePath);

      if (await file.exists()) {
        await unlink(filePath);
      }
    } catch {
      // File doesn't exist or permission error - fail silently
    }
  }

  /**
   * Clear all cached values.
   */
  async clear(): Promise<void> {
    try {
      const dir = Bun.file(this.cacheDir);
      if (await dir.exists()) {
        // Read directory and delete all .json files
        const proc = Bun.spawn(['find', this.cacheDir, '-name', '*.json', '-type', 'f', '-delete'], {
          stdout: 'pipe',
          stderr: 'pipe',
        });
        await proc.exited;
      }
    } catch {
      // Fail silently
    }
  }

  /**
   * Get the file path for a cache key.
   */
  private getFilePath(key: string): string {
    // Sanitize key to prevent directory traversal
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '-');
    return join(this.cacheDir, `${sanitizedKey}.json`);
  }
}
