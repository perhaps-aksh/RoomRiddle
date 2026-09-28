// Bundles the phone app into dist/ with esbuild (already in the repo via tsx).
// Usage: node build.mjs [--watch]
import {build, context} from 'esbuild';
import {cpSync, mkdirSync, rmSync} from 'node:fs';

const outdir = new URL('./dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
rmSync(outdir, {recursive: true, force: true});
mkdirSync(outdir, {recursive: true});
cpSync(new URL('./public/', import.meta.url), outdir, {recursive: true});

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  outfile: `${outdir}/app.js`,
  minify: !process.argv.includes('--watch'),
  sourcemap: true,
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
