const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production') || !isWatch;

const config = {
  entryPoints: [path.resolve(__dirname, '../src/extension.ts')],
  bundle: true,
  outfile: path.resolve(__dirname, '../dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: ['es2020'],
  sourcemap: !isProduction,
  minify: isProduction,
  logLevel: 'info',
};

async function main() {
  fs.rmSync(path.dirname(config.outfile), { recursive: true, force: true });

  if (isWatch) {
    const context = await esbuild.context(config);
    await context.watch();
    console.log('Watching extension bundle with esbuild...');
    return;
  }

  await esbuild.build(config);
}

main().catch(() => process.exit(1));
