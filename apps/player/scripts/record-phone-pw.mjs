// Dev tool (runs in WSL with Playwright): a recorded phone. Opens the player app
// at phone size and records a video. Each new line in <dir>/cmd.txt is
// JavaScript run in the page; touch <dir>/stop to finish.
//   node record-phone-pw.mjs <url> <dir>
// Writes <dir>/phone.webm and <dir>/t0.txt (epoch ms when recording began).
import {chromium} from 'playwright';
import {existsSync, readFileSync, writeFileSync, renameSync, mkdirSync} from 'node:fs';

const [url, dir] = process.argv.slice(2);
mkdirSync(dir, {recursive: true});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: {dir, size: {width: 780, height: 1688}},
});
const page = await context.newPage();
const t0 = Date.now();
writeFileSync(`${dir}/t0.txt`, String(t0));
await page.goto(url);
console.log(`[phone] recording ${url} (t0=${t0})`);
const control = `${dir}/cmd.txt`;
if (!existsSync(control)) writeFileSync(control, '');
let done = 0;
while (!existsSync(`${dir}/stop`)) {
  const lines = readFileSync(control, 'utf8').split('\n').filter(Boolean);
  for (; done < lines.length; done++) {
    try {
      const v = await page.evaluate(lines[done]);
      console.log(`[phone] ${Date.now() - t0}ms ${lines[done].slice(0, 70)} -> ${JSON.stringify(v ?? null).slice(0, 120)}`);
    } catch (e) {
      console.log(`[phone] ${Date.now() - t0}ms ERROR ${String(e).slice(0, 160)}`);
    }
  }
  await sleep(150);
}
const video = page.video();
await context.close();
renameSync(await video.path(), `${dir}/phone.webm`);
await browser.close();
console.log('[phone] saved phone.webm');
