// Bundles the phone app into dist/ with esbuild (already in the repo via tsx).
// Usage: node build.mjs [--watch]
import {build, context} from 'esbuild';
import {cpSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';

const outdir = new URL('./dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
rmSync(outdir, {recursive: true, force: true});
mkdirSync(outdir, {recursive: true});
cpSync(new URL('./public/', import.meta.url), outdir, {recursive: true});

// Design tokens → tokens.css, from the same source as the TV theme.
const tokens = await build({
  stdin: {contents: "import {cssVariables} from '@roomriddle/ui'; export default cssVariables();", resolveDir: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), loader: 'ts'},
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});
const {default: css} = await import(`data:text/javascript;base64,${Buffer.from(tokens.outputFiles[0].text).toString('base64')}`);
writeFileSync(`${outdir}/tokens.css`, css);

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
