#!/usr/bin/env bun

/**
 * Claude Code Statusline - Main Entry Point
 *
 * Reads Claude Code JSON from stdin, initializes the layout engine,
 * and outputs the rendered statusline.
 *
 * This script is designed to be called by Claude Code via the statusLine
 * setting in ~/.claude/settings.json
 */

import type { ClaudeStdinData } from './types/claude-stdin';
import { CacheManager } from './core/cache-manager';
import { LayoutEngine } from './core/layout-engine';
import { loadConfig } from './core/config-loader';

async function main() {
  try {
    // Read stdin (Claude Code sends JSON here)
    const stdinText = await Bun.stdin.text();

    // Parse JSON data
    const data: ClaudeStdinData = JSON.parse(stdinText);

    // Load configuration
    const config = await loadConfig();

    // Initialize cache manager
    const cache = new CacheManager(config.cache.directory);
    await cache.initialize();

    // Clean cache if configured
    if (config.cache.cleanupOnStart) {
      // Only cleanup once per session
      const cleanupKey = `cleanup-${data.session_id}`;
      const alreadyCleaned = await cache.get<boolean>(cleanupKey);

      if (!alreadyCleaned) {
        await cache.clear();
        await cache.set(cleanupKey, true, 3600); // 1 hour
      }
    }

    // Create layout engine
    const layout = new LayoutEngine(config, cache);

    // Measure performance if enabled
    if (config.debug.measurePerformance) {
      const metrics = await layout.measurePerformance(data);

      // Log performance metrics
      if (config.debug.logErrors) {
        const logFile = Bun.file(config.debug.errorLogPath);
        const logEntry = `[${new Date().toISOString()}] Total: ${metrics.totalMs.toFixed(2)}ms | Widgets: ${Array.from(metrics.widgets.entries())
          .map(([name, ms]) => `${name}=${ms.toFixed(2)}ms`)
          .join(', ')}\n`;

        await Bun.write(logFile, logEntry, { append: true });
      }
    }

    // Render and output
    const output = await layout.render(data);
    console.log(output);
  } catch (error) {
    // Fail silently to prevent statusline errors from disrupting Claude Code
    // Optionally log to file for debugging
    if (process.env.DEBUG_STATUSLINE === 'true') {
      try {
        const errorLogPath = '/tmp/statusline-error.log';
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';

        const logEntry = `[${timestamp}] ERROR: ${errorMessage}\n${stack}\n\n`;
        await Bun.write(errorLogPath, logEntry, { append: true });
      } catch {
        // Even logging failed - give up silently
      }
    }

    // Exit cleanly to not break Claude Code
    process.exit(0);
  }
}

main();
