#!/usr/bin/env bun

/**
 * Install all Claude Tools plugins
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = join(import.meta.dir, '../packages');

async function installAll() {
  console.log('🚀 Installing all Claude Code plugins...\n');

  // Get all packages
  const packages = readdirSync(PACKAGES_DIR).filter((name) => {
    const path = join(PACKAGES_DIR, name);
    return statSync(path).isDirectory();
  });

  console.log(`Found ${packages.length} plugin(s):\n`);
  packages.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));
  console.log('');

  let installed = 0;
  let failed = 0;

  for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const installScript = join(pkgPath, 'scripts/install.ts');

    console.log(`📦 Installing ${pkg}...`);

    try {
      // Check if package has install script
      const file = Bun.file(installScript);
      if (await file.exists()) {
        const proc = Bun.spawn(['bun', 'run', 'scripts/install.ts'], {
          cwd: pkgPath,
          stdout: 'inherit',
          stderr: 'inherit',
        });

        const exitCode = await proc.exited;

        if (exitCode === 0) {
          console.log(`✅ ${pkg} installed successfully\n`);
          installed++;
        } else {
          console.error(`❌ ${pkg} installation failed\n`);
          failed++;
        }
      } else {
        console.log(`⚠️  ${pkg} has no install script, skipping\n`);
      }
    } catch (error) {
      console.error(`❌ Failed to install ${pkg}:`, error);
      failed++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`\n🎉 Installation complete!`);
  console.log(`   ✅ Installed: ${installed}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
  console.log('');
}

installAll();
