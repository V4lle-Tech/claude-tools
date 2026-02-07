#!/usr/bin/env bun

/**
 * Install a specific plugin by name
 *
 * Usage:
 *   bun run install-plugin.ts <plugin-name>
 *   bun run plugin statusline
 */

import { join } from 'path';
import { existsSync } from 'fs';

const PACKAGES_DIR = join(import.meta.dir, '../packages');

async function installPlugin(pluginName: string) {
  console.log(`📦 Installing plugin: ${pluginName}\n`);

  const pluginPath = join(PACKAGES_DIR, pluginName);

  // Verify plugin exists
  if (!existsSync(pluginPath)) {
    console.error(`❌ Error: Plugin '${pluginName}' not found in packages/`);
    console.error(`   Available plugins:`);

    const packages = Bun.file(PACKAGES_DIR);
    try {
      const dir = await Array.fromAsync(packages.directory());
      for (const entry of dir) {
        if (entry.isDirectory) {
          console.error(`   - ${entry.name}`);
        }
      }
    } catch {
      console.error(`   (Could not list available plugins)`);
    }

    process.exit(1);
  }

  // Check for package.json
  const pkgJsonPath = join(pluginPath, 'package.json');
  const pkgFile = Bun.file(pkgJsonPath);

  if (!await pkgFile.exists()) {
    console.error(`❌ Error: No package.json found for plugin '${pluginName}'`);
    process.exit(1);
  }

  const pkgJson = await pkgFile.json();
  console.log(`📄 ${pkgJson.name || pluginName}`);
  console.log(`   Version: ${pkgJson.version || 'unknown'}`);
  if (pkgJson.description) {
    console.log(`   ${pkgJson.description}`);
  }
  console.log('');

  // Step 1: Build the binary
  console.log('🔨 Building binary...');
  const buildScript = pkgJson.scripts?.build;

  if (buildScript) {
    const buildProc = Bun.spawn(['bun', 'run', 'build'], {
      cwd: pluginPath,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const buildExit = await buildProc.exited;

    if (buildExit !== 0) {
      const stderr = await new Response(buildProc.stderr).text();
      console.error(`❌ Build failed:`);
      console.error(stderr);
      process.exit(1);
    }

    console.log('✅ Build completed\n');
  } else {
    console.log('⚠️  No build script found, skipping...\n');
  }

  // Step 2: Run install script if exists
  const installScriptPath = join(pluginPath, 'scripts/install.ts');
  const installScript = Bun.file(installScriptPath);

  if (await installScript.exists()) {
    console.log('⚙️  Running install script...');

    const installProc = Bun.spawn(['bun', 'run', installScriptPath], {
      cwd: pluginPath,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(installProc.stdout).text();
    const stderr = await new Response(installProc.stderr).text();
    const installExit = await installProc.exited;

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    if (installExit !== 0) {
      console.error(`❌ Installation failed`);
      process.exit(1);
    }

    console.log('✅ Installation completed\n');
  } else {
    console.log('ℹ️  No install script found (scripts/install.ts)\n');
  }

  console.log(`✨ Plugin '${pluginName}' installed successfully!`);
}

// Get plugin name from command line
const pluginName = process.argv[2];

if (!pluginName) {
  console.error('Usage: bun run install-plugin.ts <plugin-name>');
  console.error('Example: bun run install-plugin.ts statusline');
  process.exit(1);
}

installPlugin(pluginName);
