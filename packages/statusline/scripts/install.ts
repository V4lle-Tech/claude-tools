#!/usr/bin/env bun

/**
 * Installation script for Claude Code Statusline.
 *
 * This script:
 * 1. Compiles the statusline to a binary
 * 2. Updates ~/.claude/settings.json to use the statusline
 * 3. Creates config directory if needed
 */

import { join } from 'path';
import { homedir } from 'os';
import { mkdir } from 'fs/promises';

async function install() {
  console.log('🚀 Installing Claude Code Statusline...\n');

  // Step 1: Compile the binary
  console.log('📦 Compiling statusline binary...');
  const buildProc = Bun.spawn(['bun', 'build', 'src/index.ts', '--compile', '--outfile=claude-statusline'], {
    cwd: import.meta.dir + '/..',
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const buildExitCode = await buildProc.exited;
  if (buildExitCode !== 0) {
    console.error('❌ Failed to compile statusline');
    process.exit(1);
  }

  console.log('✅ Statusline binary compiled successfully\n');

  // Step 1b: Compile hook binaries
  console.log('📦 Compiling hook binaries...');
  const hookStartProc = Bun.spawn(
    ['bun', 'build', 'src/hooks/subagent-start.ts', '--compile', '--outfile=claude-subagent-start'],
    {
      cwd: import.meta.dir + '/..',
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );

  if ((await hookStartProc.exited) !== 0) {
    console.error('❌ Failed to compile SubagentStart hook');
    process.exit(1);
  }

  const hookStopProc = Bun.spawn(
    ['bun', 'build', 'src/hooks/subagent-stop.ts', '--compile', '--outfile=claude-subagent-stop'],
    {
      cwd: import.meta.dir + '/..',
      stdout: 'inherit',
      stderr: 'inherit',
    }
  );

  if ((await hookStopProc.exited) !== 0) {
    console.error('❌ Failed to compile SubagentStop hook');
    process.exit(1);
  }

  console.log('✅ Hook binaries compiled successfully\n');

  // Step 2: Get the absolute paths to binaries
  const binPath = join(import.meta.dir, '..', 'claude-statusline');
  const hookStartPath = join(import.meta.dir, '..', 'claude-subagent-start');
  const hookStopPath = join(import.meta.dir, '..', 'claude-subagent-stop');
  console.log(`📍 Statusline binary: ${binPath}`);
  console.log(`📍 SubagentStart hook: ${hookStartPath}`);
  console.log(`📍 SubagentStop hook: ${hookStopPath}\n`);

  // Step 3: Create config directory
  const configDir = join(homedir(), '.config', 'claude-statusline');
  try {
    await mkdir(configDir, { recursive: true });
    console.log(`✅ Created config directory: ${configDir}\n`);
  } catch {
    console.log(`✅ Config directory already exists: ${configDir}\n`);
  }

  // Step 4: Read existing Claude Code settings
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const settingsFile = Bun.file(settingsPath);

  let settings: any = {};
  try {
    if (await settingsFile.exists()) {
      settings = await settingsFile.json();
      console.log('📖 Loaded existing Claude Code settings\n');
    } else {
      console.log('📝 Creating new Claude Code settings file\n');
    }
  } catch (error) {
    console.log('📝 Creating new Claude Code settings file\n');
  }

  // Step 5: Update statusLine configuration
  settings.statusLine = {
    type: 'command',
    command: binPath,
    padding: 2,
  };

  // Step 5b: Register subagent hooks (using new matcher-based format)
  if (!settings.hooks) {
    settings.hooks = {};
  }

  if (!Array.isArray(settings.hooks.SubagentStart)) {
    settings.hooks.SubagentStart = [];
  }
  if (!Array.isArray(settings.hooks.SubagentStop)) {
    settings.hooks.SubagentStop = [];
  }

  // Remove any previously registered hooks from this plugin
  settings.hooks.SubagentStart = settings.hooks.SubagentStart.filter(
    (h: any) => !h.hooks?.some((hook: any) => hook.command?.includes('claude-subagent-start'))
  );
  settings.hooks.SubagentStop = settings.hooks.SubagentStop.filter(
    (h: any) => !h.hooks?.some((hook: any) => hook.command?.includes('claude-subagent-stop'))
  );

  // Add fresh hook entries with matcher format (empty string for lifecycle events)
  settings.hooks.SubagentStart.push({
    matcher: '',
    hooks: [{ type: 'command', command: hookStartPath }],
  });
  settings.hooks.SubagentStop.push({
    matcher: '',
    hooks: [{ type: 'command', command: hookStopPath }],
  });

  // Step 6: Write back settings
  try {
    await Bun.write(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✅ Updated Claude Code settings: ${settingsPath}\n`);
  } catch (error) {
    console.error(`❌ Failed to write settings: ${error}`);
    process.exit(1);
  }

  // Step 7: Success message
  console.log('🎉 Installation complete!\n');
  console.log('Next steps:');
  console.log('  1. Restart Claude Code or start a new session');
  console.log('  2. Your statusline will appear at the bottom');
  console.log('  3. Subagent tracking hooks are registered (SubagentStart/SubagentStop)');
  console.log(`  4. Customize widgets in ${configDir}/config.json`);
  console.log('\nTest the statusline:');
  console.log('  bun run scripts/test-manual.ts full\n');
  console.log('Documentation:');
  console.log('  - Project rules: .claude/CLAUDE.md');
  console.log('  - Default config: config/default-config.json');
  console.log('  - Usage docs: https://code.claude.com/docs/en/statusline\n');
}

// Run installation
install().catch((error) => {
  console.error('❌ Installation failed:', error);
  process.exit(1);
});
