#!/usr/bin/env bun

/**
 * SubagentStop hook script.
 *
 * Invoked by Claude Code when a subagent finishes.
 * Reads event data from stdin and removes the agent from the shared state file.
 *
 * Must exit cleanly on any error to avoid disrupting Claude Code.
 */

import { removeAgent } from '../utils/subagent-state';

async function main() {
  try {
    const stdinText = await Bun.stdin.text();
    if (!stdinText.trim()) {
      process.exit(0);
    }

    const event = JSON.parse(stdinText);
    const agentId = event.agent_id ?? event.agentId ?? '';

    if (agentId) {
      await removeAgent(agentId);
    }
  } catch {
    // Exit cleanly — never fail Claude Code
  }

  process.exit(0);
}

main();
