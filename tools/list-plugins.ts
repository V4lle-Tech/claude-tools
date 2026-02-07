#!/usr/bin/env bun

/**
 * List all available plugins in the workspace
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = join(import.meta.dir, '../packages');

async function listPlugins() {
  console.log('📦 Claude Tools - Available Plugins\n');

  const packages = readdirSync(PACKAGES_DIR).filter((name) => {
    const path = join(PACKAGES_DIR, name);
    return statSync(path).isDirectory();
  });

  if (packages.length === 0) {
    console.log('No plugins found.\n');
    return;
  }

  for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const pkgJsonPath = join(pkgPath, 'package.json');
    const readmePath = join(pkgPath, 'README.md');

    try {
      const pkgFile = Bun.file(pkgJsonPath);
      if (await pkgFile.exists()) {
        const pkgJson = await pkgFile.json();

        console.log(`📦 ${pkgJson.name || pkg}`);
        console.log(`   Version: ${pkgJson.version || 'unknown'}`);

        if (pkgJson.description) {
          console.log(`   Description: ${pkgJson.description}`);
        }

        // Check if installed
        const binary = join(pkgPath, pkg);
        const binaryFile = Bun.file(binary);
        if (await binaryFile.exists()) {
          console.log(`   Status: ✅ Installed`);
        } else {
          console.log(`   Status: ⚠️  Not installed`);
        }

        console.log('');
      }
    } catch (error) {
      console.log(`📦 ${pkg}`);
      console.log(`   Status: ❌ Invalid package\n`);
    }
  }

  console.log(`Total: ${packages.length} plugin(s)`);
}

listPlugins();
