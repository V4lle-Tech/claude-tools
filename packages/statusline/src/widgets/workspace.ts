/**
 * WorkspaceWidget - Displays the current working directory.
 *
 * Example output: 📁 my-project
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { WorkspaceWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';
import { basename } from 'path';

export class WorkspaceWidget extends BaseWidget {
  private readonly workspaceConfig: WorkspaceWidgetConfig;

  constructor(config: WorkspaceWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.workspaceConfig = config;
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const currentDir = data.workspace?.current_dir || data.cwd || '';

    if (!currentDir) {
      return null;
    }

    // Get directory name (full path or just basename)
    const dirName = this.workspaceConfig.showFullPath ? currentDir : basename(currentDir);

    // Apply format
    const text = this.workspaceConfig.format.replace('{name}', dirName);

    // Apply color if specified
    if (this.workspaceConfig.color) {
      return this.colorize(text, this.workspaceConfig.color as any);
    }

    return text;
  }
}
