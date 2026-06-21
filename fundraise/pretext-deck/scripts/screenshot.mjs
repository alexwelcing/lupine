// Render every slide to samples/slide-NN.png via the in-app dataURL() API
// (the same path the "Export all" button uses) so the screenshots ARE the
// production asset output, not viewport grabs.
import { preview } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(here, '..');
mkdirSync(path.join(proj, 'samples'), { recursive: true });

const server = await preview({ root: proj, preview: { port: 4317 } });
const url = server.resolvedUrls.local[0];
console.log('preview at', url);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  // @ts-ignore
  await window.deck.ready;
});
const count = await page.evaluate(() => window.deck.count);
for (let i = 0; i < count; i++) {
  const durl = await page.evaluate((j) => window.deck.dataURL(j, 2), i);
  const b64 = durl.split(',')[1];
  writeFileSync(path.join(proj, 'samples', `slide-${String(i + 1).padStart(2, '0')}.png`), Buffer.from(b64, 'base64'));
  console.log('wrote slide', i + 1);
}
await browser.close();
await server.close();
console.log('done');
