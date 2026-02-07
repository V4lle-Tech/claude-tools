#!/usr/bin/env bun

console.log('📦 Claude Tools - Available Plugins\n');

const plugins = [
  {
    name: 'statusline',
    path: '/workspaces/packages/statusline',
    packageJson: '/workspaces/packages/statusline/package.json'
  },
  {
    name: 'context-analyzer',
    path: '/workspaces/packages/context-analyzer',
    packageJson: '/workspaces/packages/context-analyzer/package.json'
  }
];

for (const plugin of plugins) {
  try {
    const pkgFile = Bun.file(plugin.packageJson);
    if (await pkgFile.exists()) {
      const pkgJson = await pkgFile.json();

      console.log(`📦 ${pkgJson.name || plugin.name}`);
      console.log(`   Version: ${pkgJson.version || 'unknown'}`);

      if (pkgJson.description) {
        console.log(`   Description: ${pkgJson.description}`);
      }

      // Check for binary
      const binaries = [
        `${plugin.path}/${plugin.name}`,
        `${plugin.path}/claude-statusline`, // statusline específico
        `${plugin.path}/context-analyzer`   // analyzer específico
      ];

      let installed = false;
      for (const bin of binaries) {
        const binFile = Bun.file(bin);
        if (await binFile.exists()) {
          installed = true;
          break;
        }
      }

      console.log(`   Status: ${installed ? '✅ Installed' : '⚠️  Not installed'}`);
      console.log('');
    }
  } catch (error) {
    console.log(`📦 ${plugin.name}`);
    console.log(`   Status: ❌ Error reading package\n`);
  }
}

console.log(`Total: ${plugins.length} plugin(s)`);
