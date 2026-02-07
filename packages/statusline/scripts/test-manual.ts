#!/usr/bin/env bun

/**
 * Manual testing script for the statusline.
 *
 * Usage: bun run scripts/test-manual.ts [scenario]
 *
 * Scenarios:
 * - minimal: Basic model + context only
 * - full: All widgets with realistic data
 * - high-context: 95% context usage
 */

import { join } from 'path';

const scenarios = {
  minimal: {
    model: { display_name: 'Opus', id: 'claude-opus-4' },
    context_window: {
      used_percentage: 25,
      total_input_tokens: 50000,
      total_output_tokens: 20000,
      context_window_size: 200000,
      remaining_percentage: 75,
      current_usage: null,
    },
    workspace: {
      current_dir: '/workspaces/test-project',
      project_dir: '/workspaces/test-project',
    },
    cwd: '/workspaces/test-project',
    cost: {
      total_cost_usd: 0.05,
      total_duration_ms: 120000,
      total_api_duration_ms: 5000,
      total_lines_added: 50,
      total_lines_removed: 10,
    },
    session_id: 'test-session',
    transcript_path: '/tmp/transcript.json',
    exceeds_200k_tokens: false,
    version: '1.0.0',
    output_style: { name: 'default' },
  },

  full: {
    model: { display_name: 'Opus', id: 'claude-opus-4' },
    context_window: {
      used_percentage: 60,
      total_input_tokens: 120000,
      total_output_tokens: 50000,
      context_window_size: 200000,
      remaining_percentage: 40,
      current_usage: {
        input_tokens: 120000,
        output_tokens: 50000,
        cache_creation_input_tokens: 10000,
        cache_read_input_tokens: 5000,
      },
    },
    workspace: {
      current_dir: '/workspaces/claude-code-statusline',
      project_dir: '/workspaces/claude-code-statusline',
    },
    cwd: '/workspaces/claude-code-statusline',
    cost: {
      total_cost_usd: 0.25,
      total_duration_ms: 1800000,
      total_api_duration_ms: 90000,
      total_lines_added: 500,
      total_lines_removed: 120,
    },
    session_id: 'test-session-full',
    transcript_path: '/tmp/transcript.json',
    exceeds_200k_tokens: false,
    version: '1.0.0',
    output_style: { name: 'default' },
  },

  'high-context': {
    model: { display_name: 'Sonnet', id: 'claude-sonnet-4' },
    context_window: {
      used_percentage: 95,
      total_input_tokens: 190000,
      total_output_tokens: 80000,
      context_window_size: 200000,
      remaining_percentage: 5,
      current_usage: {
        input_tokens: 190000,
        output_tokens: 80000,
        cache_creation_input_tokens: 20000,
        cache_read_input_tokens: 10000,
      },
    },
    workspace: {
      current_dir: '/workspaces/large-project',
      project_dir: '/workspaces/large-project',
    },
    cwd: '/workspaces/large-project',
    cost: {
      total_cost_usd: 1.5,
      total_duration_ms: 7200000,
      total_api_duration_ms: 360000,
      total_lines_added: 2000,
      total_lines_removed: 500,
    },
    session_id: 'test-session-high',
    transcript_path: '/tmp/transcript.json',
    exceeds_200k_tokens: true,
    version: '1.0.0',
    output_style: { name: 'default' },
  },
};

async function main() {
  const scenarioName = process.argv[2] || 'minimal';
  const mockData = scenarios[scenarioName as keyof typeof scenarios];

  if (!mockData) {
    console.error(`Unknown scenario: ${scenarioName}`);
    console.error(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n=== Testing Scenario: ${scenarioName} ===\n`);

  const startTime = performance.now();

  // Run the statusline with mock data
  const proc = Bun.spawn(['bun', 'run', 'src/index.ts'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: join(import.meta.dir, '..'),
  });

  // Send mock data to stdin
  proc.stdin.write(JSON.stringify(mockData));
  proc.stdin.end();

  // Read output
  const output = await new Response(proc.stdout).text();
  const errors = await new Response(proc.stderr).text();

  const duration = performance.now() - startTime;

  // Display results
  console.log('--- Statusline Output ---');
  console.log(output);
  console.log('--- End Output ---\n');

  if (errors) {
    console.log('--- Errors ---');
    console.log(errors);
    console.log('--- End Errors ---\n');
  }

  console.log(`Render time: ${duration.toFixed(2)}ms`);

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    console.error(`Process exited with code ${exitCode}`);
    process.exit(exitCode);
  }
}

main();
