/**
 * Utility for updating Claude Code settings.json
 *
 * This is shared across all plugins that need to modify settings.
 */

import { join } from 'path';
import { homedir } from 'os';
import { mkdir } from 'fs/promises';

export interface PluginSettings {
  [key: string]: any;
}

export class SettingsUpdater {
  private readonly settingsPath: string;
  private readonly settingsDir: string;

  constructor() {
    this.settingsDir = join(homedir(), '.claude');
    this.settingsPath = join(this.settingsDir, 'settings.json');
  }

  /**
   * Read current settings
   */
  async readSettings(): Promise<any> {
    try {
      await mkdir(this.settingsDir, { recursive: true });
      const file = Bun.file(this.settingsPath);
      const exists = await file.exists();

      if (exists) {
        return await file.json();
      }

      return {};
    } catch {
      return {};
    }
  }

  /**
   * Write settings
   */
  async writeSettings(settings: any): Promise<void> {
    await mkdir(this.settingsDir, { recursive: true });
    await Bun.write(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  /**
   * Update specific settings
   */
  async updateSettings(updates: PluginSettings): Promise<void> {
    const settings = await this.readSettings();
    const merged = { ...settings, ...updates };
    await this.writeSettings(merged);
  }

  /**
   * Add a hook to settings
   */
  async addHook(hookName: string, command: string): Promise<void> {
    const settings = await this.readSettings();

    if (!settings.hooks) {
      settings.hooks = {};
    }

    settings.hooks[hookName] = {
      type: 'command',
      command,
    };

    await this.writeSettings(settings);
  }

  /**
   * Set statusline command
   */
  async setStatusLine(command: string, padding: number = 2): Promise<void> {
    await this.updateSettings({
      statusLine: {
        type: 'command',
        command,
        padding,
      },
    });
  }

  /**
   * Remove a setting by key
   */
  async removeSetting(key: string): Promise<void> {
    const settings = await this.readSettings();
    delete settings[key];
    await this.writeSettings(settings);
  }
}
