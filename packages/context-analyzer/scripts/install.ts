#!/usr/bin/env bun

/**
 * Installation script for context-analyzer
 *
 * This demonstrates how to use SettingsUpdater from shared utilities
 */

import { SettingsUpdater } from '@claude-tools/shared/utils';
import { join } from 'path';

async function install() {
  console.log('🚀 Installing Context Analyzer...\n');

  // Build the plugin first
  console.log('📦 Building binary...');
  const buildProc = Bun.spawn(['bun', 'build', 'src/index.ts', '--compile', '--outfile=context-analyzer'], {
    cwd: join(import.meta.dir, '..'),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const buildExitCode = await buildProc.exited;
  if (buildExitCode !== 0) {
    console.error('❌ Failed to build context-analyzer');
    process.exit(1);
  }

  console.log('✅ Binary compiled successfully\n');

  // Get binary path
  const binPath = join(import.meta.dir, '..', 'context-analyzer');

  // Note: This is a standalone tool, not a hook or statusline
  // Users can run it manually: context-analyzer < stdin.json
  // Or integrate it as a custom command in Claude Code

  console.log('📍 Binary location:', binPath);
  console.log('\n✅ Context Analyzer installed successfully!');
  console.log('\nUsage:');
  console.log('  Manual: echo \'<stdin-json>\' | ./context-analyzer');
  console.log('  Or use it as a skill in Claude Code\n');
}

install();
