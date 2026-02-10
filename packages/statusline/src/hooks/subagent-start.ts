#!/usr/bin/env bun

/**
 * SubagentStart hook script.
 *
 * Invoked by Claude Code when a subagent starts.
 * Reads event data from stdin and adds the agent to the shared state file.
 *
 * Must exit cleanly on any error to avoid disrupting Claude Code.
 */

import { addAgent } from '../utils/subagent-state';
import type { SubagentEntry } from '../utils/subagent-state';

async function main() {
  try {
    const stdinText = await Bun.stdin.text();
    if (!stdinText.trim()) {
      process.exit(0);
    }

    const event = JSON.parse(stdinText);

    const entry: SubagentEntry = {
      agent_id: event.agent_id ?? event.agentId ?? `unknown-${Date.now()}`,
      agent_type: event.agent_type ?? event.agentType ?? event.type ?? 'unknown',
      model: event.model ?? event.model_id ?? 'unknown',
      started_at: Date.now(),
      transcript_path: event.transcript_path ?? event.transcriptPath,
      session_id: event.session_id ?? event.sessionId ?? 'unknown',
    };

    await addAgent(entry);
  } catch {
    // Exit cleanly — never fail Claude Code
  }

  process.exit(0);
}

main();
