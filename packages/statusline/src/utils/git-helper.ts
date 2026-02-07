/**
 * GitHelper - Utility functions for Git operations.
 *
 * All methods use Bun.spawn() to execute git commands and handle errors gracefully.
 */

export class GitHelper {
  private readonly workingDir: string;

  constructor(workingDir: string) {
    this.workingDir = workingDir;
  }

  /**
   * Check if the current directory is a git repository.
   */
  async isGitRepo(): Promise<boolean> {
    try {
      const proc = Bun.spawn(['git', 'rev-parse', '--git-dir'], {
        cwd: this.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const exitCode = await proc.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const proc = Bun.spawn(['git', 'branch', '--show-current'], {
        cwd: this.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      const branch = text.trim();

      // If branch is empty, we might be in detached HEAD state
      if (!branch) {
        // Try to get the short commit hash
        const hashProc = Bun.spawn(['git', 'rev-parse', '--short', 'HEAD'], {
          cwd: this.workingDir,
          stdout: 'pipe',
          stderr: 'pipe',
        });

        const hashText = await new Response(hashProc.stdout).text();
        const hash = hashText.trim();
        return hash ? `HEAD@${hash}` : null;
      }

      return branch;
    } catch {
      return null;
    }
  }

  /**
   * Get the number of modified files (unstaged changes).
   */
  async getModifiedCount(): Promise<number> {
    try {
      const proc = Bun.spawn(['git', 'diff', '--numstat'], {
        cwd: this.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      const lines = text.trim().split('\n').filter(Boolean);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get the number of staged files.
   */
  async getStagedCount(): Promise<number> {
    try {
      const proc = Bun.spawn(['git', 'diff', '--cached', '--numstat'], {
        cwd: this.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      const lines = text.trim().split('\n').filter(Boolean);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get the number of untracked files.
   */
  async getUntrackedCount(): Promise<number> {
    try {
      const proc = Bun.spawn(['git', 'ls-files', '--others', '--exclude-standard'], {
        cwd: this.workingDir,
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const text = await new Response(proc.stdout).text();
      const lines = text.trim().split('\n').filter(Boolean);
      return lines.length;
    } catch {
      return 0;
    }
  }

  /**
   * Get commits ahead and behind relative to upstream.
   */
  async getAheadBehindCount(): Promise<{ ahead: number; behind: number } | null> {
    try {
      const proc = Bun.spawn(
        ['git', 'rev-list', '--left-right', '--count', 'HEAD...@{upstream}'],
        {
          cwd: this.workingDir,
          stdout: 'pipe',
          stderr: 'pipe',
        }
      );

      const text = await new Response(proc.stdout).text();
      const parts = text.trim().split('\t');

      if (parts.length >= 2) {
        return {
          ahead: parseInt(parts[0], 10) || 0,
          behind: parseInt(parts[1], 10) || 0,
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
