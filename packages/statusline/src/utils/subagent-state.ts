/**
 * State file manager for subagent tracking.
 *
 * Maintains a JSON state file at /tmp/claude-subagent-state.json
 * that is written by SubagentStart/SubagentStop hooks and read
 * by the SubagentWidget during statusline renders.
 */

import { rename } from 'fs/promises';

/** A single active subagent entry. */
export interface SubagentEntry {
  agent_id: string;
  agent_type: string;
  model: string;
  started_at: number;
  transcript_path?: string;
  session_id: string;
}

/** Root state file schema. */
export interface SubagentState {
  active: SubagentEntry[];
  last_updated: number;
}

/** Location of the shared state file. */
export const STATE_FILE_PATH = '/tmp/claude-subagent-state.json';

const EMPTY_STATE: SubagentState = { active: [], last_updated: 0 };

/**
 * Read the current subagent state from disk.
 * Returns empty state on any error (file missing, corrupt, etc).
 */
export async function readState(): Promise<SubagentState> {
  try {
    const file = Bun.file(STATE_FILE_PATH);
    if (!(await file.exists())) return { ...EMPTY_STATE };
    const data = await file.json();
    if (!Array.isArray(data?.active)) return { ...EMPTY_STATE };
    return data as SubagentState;
  } catch {
    return { ...EMPTY_STATE };
  }
}

/**
 * Write state to disk atomically (write tmp file then rename).
 */
export async function writeState(state: SubagentState): Promise<void> {
  const tmpPath = `${STATE_FILE_PATH}.tmp`;
  state.last_updated = Date.now();
  await Bun.write(tmpPath, JSON.stringify(state, null, 2));
  await rename(tmpPath, STATE_FILE_PATH);
}

/**
 * Add an agent to the active list.
 */
export async function addAgent(entry: SubagentEntry): Promise<void> {
  const state = await readState();
  // Avoid duplicates
  state.active = state.active.filter((a) => a.agent_id !== entry.agent_id);
  state.active.push(entry);
  await writeState(state);
}

/**
 * Remove an agent from the active list by ID.
 */
export async function removeAgent(agentId: string): Promise<void> {
  const state = await readState();
  state.active = state.active.filter((a) => a.agent_id !== agentId);
  await writeState(state);
}
