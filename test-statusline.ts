#!/usr/bin/env bun

// Simple test to verify the statusline can be imported and run
import { join } from 'path';

const statuslineDir = '/workspaces/packages/statusline';
const mockData = {
  model: { id: 'claude-sonnet-4-5', display_name: 'Sonnet 4.5' },
  context_window: {
    used_percentage: 65,
    total_input_tokens: 130000,
    total_output_tokens: 50000,
    context_window_size: 200000,
  },
  workspace: {
    current_dir: '/workspaces',
    project_dir: '/workspaces',
  },
  cwd: '/workspaces',
  cost: {
    total_cost_usd: 0.15,
    total_duration_ms: 900000,
  },
  session_id: 'test-session-123',
  exceeds_200k_tokens: false,
};

console.log('Testing statusline...');
console.log('Mock data:', JSON.stringify(mockData, null, 2));

// Try to spawn the binary
const proc = Bun.spawn([join(statuslineDir, 'claude-statusline')], {
  stdin: 'pipe',
  stdout: 'pipe',
  stderr: 'pipe',
});

// Send mock data to stdin
await proc.stdin.write(JSON.stringify(mockData));
await proc.stdin.end();

// Get output
const stdout = await new Response(proc.stdout).text();
const stderr = await new Response(proc.stderr).text();
const exitCode = await proc.exited;

console.log('\n=== Results ===');
console.log('Exit code:', exitCode);
console.log('\n--- stdout ---');
console.log(stdout || '(empty)');
console.log('\n--- stderr ---');
console.log(stderr || '(empty)');
