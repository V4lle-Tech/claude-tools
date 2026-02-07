/**
 * Configuration loader with support for user overrides.
 *
 * Loads default config from config/default-config.json and merges with
 * user config from ~/.config/claude-statusline/config.json if present.
 */

import { join } from 'path';
import { homedir } from 'os';
import type { Config } from '../types/config';
import { DEFAULT_CONFIG } from './default-config';

/**
 * Load configuration with user overrides.
 *
 * @returns Complete configuration object
 */
export async function loadConfig(): Promise<Config> {
  // Use embedded default config
  const defaultConfig: Config = DEFAULT_CONFIG;

  // Try to load user config
  const userConfigPath = join(homedir(), '.config', 'claude-statusline', 'config.json');
  const userFile = Bun.file(userConfigPath);

  try {
    const exists = await userFile.exists();
    if (exists) {
      const userConfig = await userFile.json();
      return deepMerge(defaultConfig, userConfig);
    }
  } catch {
    // User config not found or invalid - use defaults
  }

  return defaultConfig;
}

/**
 * Deep merge two objects.
 *
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }

  return result;
}
