#!/usr/bin/env bun

/**
 * Scaffold a new Claude Code plugin
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const TEMPLATES = {
  'package.json': (name: string) => `{
  "name": "@claude-tools/${name}",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "bin": {
    "${name}": "src/index.ts"
  },
  "scripts": {
    "build": "bun build src/index.ts --compile --outfile=${name}",
    "test": "bun test",
    "install": "bun run scripts/install.ts"
  },
  "dependencies": {
    "@claude-tools/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "bun-types": "latest"
  }
}`,

  'src/index.ts': (name: string) => `#!/usr/bin/env bun

/**
 * ${name} - Claude Code Plugin
 */

import { SettingsUpdater } from '@claude-tools/shared/utils';

console.log('${name} plugin initialized!');

// TODO: Implement your plugin logic here
`,

  'scripts/install.ts': (name: string) => `#!/usr/bin/env bun

/**
 * Installation script for ${name}
 */

import { SettingsUpdater } from '@claude-tools/shared/utils';
import { join } from 'path';

async function install() {
  console.log('🚀 Installing ${name}...\\n');

  // TODO: Implement installation logic
  // Example:
  // const updater = new SettingsUpdater();
  // await updater.addHook('your-hook', '/path/to/binary');

  console.log('✅ ${name} installed successfully!');
}

install();
`,

  'README.md': (name: string) => `# ${name}

Claude Code plugin for ${name}.

## Installation

\`\`\`bash
cd packages/${name}
bun install
bun run install
\`\`\`

## Usage

TODO: Add usage instructions

## Development

\`\`\`bash
# Run tests
bun test

# Build binary
bun run build
\`\`\`
`,

  '.claude/CLAUDE.md': (name: string) => `# ${name} Plugin - Development Rules

## Purpose

This plugin provides ${name} functionality for Claude Code.

## Development Guidelines

1. Follow shared TypeScript conventions from workspace root
2. Use shared utilities from @claude-tools/shared
3. Keep the plugin focused and lightweight
4. Add tests for all features
5. Document all public APIs

## Architecture

TODO: Describe your plugin's architecture

## Testing

TODO: Add testing guidelines
`,

  'tsconfig.json': () => `{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}`,
};

async function scaffold(name: string) {
  console.log(`🏗️  Creating new plugin: ${name}\n`);

  const pluginDir = join(import.meta.dir, '../packages', name);

  // Create directories
  await mkdir(join(pluginDir, 'src'), { recursive: true });
  await mkdir(join(pluginDir, '.claude'), { recursive: true });
  await mkdir(join(pluginDir, 'tests'), { recursive: true });
  await mkdir(join(pluginDir, 'scripts'), { recursive: true });

  // Create files
  for (const [file, template] of Object.entries(TEMPLATES)) {
    const filePath = join(pluginDir, file);
    const content = typeof template === 'function' ? template(name) : template();
    await writeFile(filePath, content);
  }

  // Make scripts executable
  const installScript = join(pluginDir, 'scripts/install.ts');
  const indexScript = join(pluginDir, 'src/index.ts');

  await Bun.spawn(['chmod', '+x', installScript]).exited;
  await Bun.spawn(['chmod', '+x', indexScript]).exited;

  console.log(`✅ Plugin ${name} created at: ${pluginDir}\n`);
  console.log('Next steps:');
  console.log(`  1. cd packages/${name}`);
  console.log('  2. Implement your plugin in src/index.ts');
  console.log('  3. Update scripts/install.ts with installation logic');
  console.log('  4. Add tests in tests/');
  console.log('  5. Run: bun run install\n');
}

// Get plugin name from args
const name = process.argv[2];
if (!name) {
  console.error('❌ Usage: bun run tools/scaffold.ts <plugin-name>');
  console.error('\nExample: bun run tools/scaffold.ts git-helper');
  process.exit(1);
}

scaffold(name);
