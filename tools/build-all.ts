#!/usr/bin/env bun

/**
 * Build all Claude Tools plugins
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const PACKAGES_DIR = join(import.meta.dir, '../packages');

async function buildAll() {
  console.log('🔨 Building all plugins...\n');

  const packages = readdirSync(PACKAGES_DIR).filter((name) => {
    const path = join(PACKAGES_DIR, name);
    return statSync(path).isDirectory();
  });

  let built = 0;
  let failed = 0;

  for (const pkg of packages) {
    const pkgPath = join(PACKAGES_DIR, pkg);
    const pkgJsonPath = join(pkgPath, 'package.json');

    console.log(`🔨 Building ${pkg}...`);

    try {
      const file = Bun.file(pkgJsonPath);
      if (await file.exists()) {
        const pkgJson = await file.json();

        if (pkgJson.scripts?.build) {
          const proc = Bun.spawn(['bun', 'run', 'build'], {
            cwd: pkgPath,
            stdout: 'inherit',
            stderr: 'inherit',
          });

          const exitCode = await proc.exited;

          if (exitCode === 0) {
            console.log(`✅ ${pkg} built successfully\n`);
            built++;
          } else {
            console.error(`❌ ${pkg} build failed\n`);
            failed++;
          }
        } else {
          console.log(`⚠️  ${pkg} has no build script\n`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to build ${pkg}:`, error);
      failed++;
    }
  }

  console.log('━'.repeat(50));
  console.log(`\n🎉 Build complete!`);
  console.log(`   ✅ Built: ${built}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
  console.log('');
}

buildAll();
