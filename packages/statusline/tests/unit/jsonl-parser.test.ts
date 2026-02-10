import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getSubagentTokens, formatTokenCount } from '../../src/utils/jsonl-parser';
import { CacheManager } from '../../src/core/cache-manager';
import { unlink } from 'fs/promises';

const MOCK_JSONL_PATH = '/tmp/test-subagent-transcript.jsonl';

describe('jsonl-parser', () => {
  let cache: CacheManager;

  beforeEach(async () => {
    cache = new CacheManager('/tmp/claude-statusline-test-cache');
    await cache.initialize();
    await cache.clear();
    try {
      await unlink(MOCK_JSONL_PATH);
    } catch {
      // File may not exist
    }
  });

  afterEach(async () => {
    try {
      await unlink(MOCK_JSONL_PATH);
    } catch {
      // File may not exist
    }
    await cache.clear();
  });

  describe('getSubagentTokens', () => {
    it('returns null for non-existent file', async () => {
      const result = await getSubagentTokens('/tmp/nonexistent.jsonl', cache);
      expect(result).toBeNull();
    });

    it('parses token usage from JSONL entries', async () => {
      const lines = [
        JSON.stringify({ usage: { input_tokens: 1000, output_tokens: 500 } }),
        JSON.stringify({ usage: { input_tokens: 2000, output_tokens: 800 } }),
        JSON.stringify({ some_other_field: true }),
      ];
      await Bun.write(MOCK_JSONL_PATH, lines.join('\n'));

      const result = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      expect(result).toBe(4300); // 1000+500+2000+800
    });

    it('handles nested usage in message.usage', async () => {
      const lines = [
        JSON.stringify({ message: { usage: { input_tokens: 500, output_tokens: 200 } } }),
      ];
      await Bun.write(MOCK_JSONL_PATH, lines.join('\n'));

      const result = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      expect(result).toBe(700);
    });

    it('returns cached result on second call', async () => {
      const lines = [
        JSON.stringify({ usage: { input_tokens: 1000, output_tokens: 500 } }),
      ];
      await Bun.write(MOCK_JSONL_PATH, lines.join('\n'));

      const first = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      const second = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      expect(first).toBe(second);
    });

    it('handles empty file', async () => {
      await Bun.write(MOCK_JSONL_PATH, '');

      const result = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      expect(result).toBe(0);
    });

    it('handles malformed JSON lines gracefully', async () => {
      const lines = [
        'not json at all',
        JSON.stringify({ usage: { input_tokens: 100, output_tokens: 50 } }),
        '{ broken json',
      ];
      await Bun.write(MOCK_JSONL_PATH, lines.join('\n'));

      const result = await getSubagentTokens(MOCK_JSONL_PATH, cache);
      expect(result).toBe(150);
    });
  });

  describe('formatTokenCount', () => {
    it('formats small numbers as-is', () => {
      expect(formatTokenCount(0)).toBe('0');
      expect(formatTokenCount(500)).toBe('500');
      expect(formatTokenCount(999)).toBe('999');
    });

    it('formats thousands as K', () => {
      expect(formatTokenCount(1000)).toBe('1.0K');
      expect(formatTokenCount(1500)).toBe('1.5K');
      expect(formatTokenCount(8000)).toBe('8.0K');
      expect(formatTokenCount(10000)).toBe('10K');
      expect(formatTokenCount(12500)).toBe('13K');
    });

    it('formats millions as M', () => {
      expect(formatTokenCount(1000000)).toBe('1.0M');
      expect(formatTokenCount(1500000)).toBe('1.5M');
      expect(formatTokenCount(10000000)).toBe('10M');
    });
  });
});
