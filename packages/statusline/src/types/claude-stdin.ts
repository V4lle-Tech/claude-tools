/**
 * TypeScript interfaces for the JSON data structure that Claude Code
 * sends to statusline scripts via stdin.
 *
 * Based on: https://code.claude.com/docs/en/statusline
 */

export interface ClaudeStdinData {
  /** Model information */
  model: {
    id: string;
    display_name: string;
  };

  /** Workspace/directory information */
  workspace: {
    current_dir: string;
    project_dir: string;
  };

  /** Alternative to workspace.current_dir */
  cwd: string;

  /** Unique session identifier */
  session_id: string;

  /** Path to conversation transcript */
  transcript_path: string;

  /** Cost tracking for current session */
  cost: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_api_duration_ms: number;
    total_lines_added: number;
    total_lines_removed: number;
  };

  /** Context window usage statistics */
  context_window: {
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    used_percentage: number | null;
    remaining_percentage: number | null;
    current_usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    } | null;
  };

  /** Flag indicating if context exceeds 200k tokens */
  exceeds_200k_tokens: boolean;

  /** Claude Code version */
  version: string;

  /** Current output style */
  output_style: {
    name: string;
  };

  /** VIM mode information (when VIM mode is enabled) */
  vim?: {
    mode: 'NORMAL' | 'INSERT';
  };

  /** Agent information (when using --agent flag) */
  agent?: {
    name: string;
  };
}
