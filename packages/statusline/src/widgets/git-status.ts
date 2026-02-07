/**
 * GitStatusWidget - Displays git branch and status indicators.
 *
 * Example output: 🌿 main +3 ~5
 *
 * Indicators:
 * - +N: N staged files (green)
 * - ~N: N modified files (yellow)
 * - ?N: N untracked files (dim)
 * - ↑N: N commits ahead (cyan)
 * - ↓N: N commits behind (magenta)
 */

import { BaseWidget } from './base-widget';
import type { ClaudeStdinData } from '../types/claude-stdin';
import type { GitStatusWidgetConfig } from '../types/config';
import type { CacheManager } from '../core/cache-manager';
import { GitHelper } from '../utils/git-helper';

interface GitStatusData {
  branch: string;
  staged: number;
  modified: number;
  untracked: number;
  ahead: number;
  behind: number;
}

export class GitStatusWidget extends BaseWidget {
  private readonly gitConfig: GitStatusWidgetConfig;

  constructor(config: GitStatusWidgetConfig, cache: CacheManager) {
    super(config, cache);
    this.gitConfig = config;
  }

  async render(data: ClaudeStdinData): Promise<string | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const currentDir = data.workspace?.current_dir || data.cwd;
    if (!currentDir) {
      return null;
    }

    // Try to get cached git status
    const cacheKey = `git-status-${data.session_id}-${currentDir}`;
    const cached = await this.cache.get<GitStatusData>(cacheKey);

    if (cached) {
      return this.formatGitStatus(cached);
    }

    // Fetch fresh git status
    const gitStatus = await this.fetchGitStatus(currentDir);

    if (!gitStatus) {
      return null;
    }

    // Cache for next time
    const ttl = this.gitConfig.cacheTTL || 5;
    await this.cache.set(cacheKey, gitStatus, ttl);

    return this.formatGitStatus(gitStatus);
  }

  /**
   * Fetch git status from git commands.
   */
  private async fetchGitStatus(workingDir: string): Promise<GitStatusData | null> {
    const helper = new GitHelper(workingDir);

    // Check if it's a git repo
    const isRepo = await helper.isGitRepo();
    if (!isRepo) {
      return null;
    }

    // Get branch name
    const branch = await helper.getCurrentBranch();
    if (!branch) {
      return null;
    }

    // Get status counts (run in parallel for speed)
    const [staged, modified, untracked, aheadBehind] = await Promise.all([
      this.gitConfig.showStaged ? helper.getStagedCount() : Promise.resolve(0),
      this.gitConfig.showModified ? helper.getModifiedCount() : Promise.resolve(0),
      helper.getUntrackedCount(),
      this.gitConfig.showAheadBehind ? helper.getAheadBehindCount() : Promise.resolve(null),
    ]);

    return {
      branch,
      staged,
      modified,
      untracked,
      ahead: aheadBehind?.ahead || 0,
      behind: aheadBehind?.behind || 0,
    };
  }

  /**
   * Format git status data into a string.
   */
  private formatGitStatus(status: GitStatusData): string {
    const parts: string[] = [];

    // Branch name
    if (this.gitConfig.showBranch) {
      parts.push(this.colorize(`🌿 ${status.branch}`, 'cyan'));
    }

    // Staged files
    if (this.gitConfig.showStaged && status.staged > 0) {
      parts.push(this.colorize(`+${status.staged}`, 'green'));
    }

    // Modified files
    if (this.gitConfig.showModified && status.modified > 0) {
      parts.push(this.colorize(`~${status.modified}`, 'yellow'));
    }

    // Untracked files
    if (status.untracked > 0) {
      parts.push(this.colorize(`?${status.untracked}`, 'dim'));
    }

    // Ahead/behind
    if (this.gitConfig.showAheadBehind) {
      if (status.ahead > 0) {
        parts.push(this.colorize(`↑${status.ahead}`, 'cyan'));
      }
      if (status.behind > 0) {
        parts.push(this.colorize(`↓${status.behind}`, 'magenta'));
      }
    }

    return parts.join(' ');
  }
}
