// Bundles the phone app into dist/ with esbuild (already in the repo via tsx).
// Usage: node build.mjs [--watch]
import {build, context} from 'esbuild';
import {cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs';

const outdir = new URL('./dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
rmSync(outdir, {recursive: true, force: true});
mkdirSync(outdir, {recursive: true});
cpSync(new URL('./public/', import.meta.url), outdir, {recursive: true});

// The painted art the TV ships, reused on the phone: suspect portraits (calm)
// and the rainy-street key art as a dimmed backdrop. Missing art just means
// initials, so other cases work before their portraits exist.
const tvAssets = new URL('../tv/src/assets/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const portraits = [];
for (const mystery of existsSync(`${tvAssets}mysteries`) ? readdirSync(`${tvAssets}mysteries`) : []) {
  const dir = `${tvAssets}mysteries/${mystery}/portraits`;
  if (!existsSync(dir)) continue;
  mkdirSync(`${outdir}/portraits/${mystery}`, {recursive: true});
  for (const file of readdirSync(dir).filter(f => f.endsWith('.calm.png'))) {
    const id = file.replace('.calm.png', '');
    cpSync(`${dir}/${file}`, `${outdir}/portraits/${mystery}/${id}.png`);
    portraits.push(`${mystery}/${id}`);
  }
}
if (existsSync(`${tvAssets}ui/home.jpg`)) cpSync(`${tvAssets}ui/home.jpg`, `${outdir}/backdrop.jpg`);

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
  define: {__PORTRAITS__: JSON.stringify(portraits)},
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
