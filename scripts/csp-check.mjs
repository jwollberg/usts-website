/** Loads pages and reports anything the CSP blocked, plus whether the dynamic
 *  bits actually rendered. */
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'https://ambitious-tree-058d7ee10.7.azurestaticapps.net';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const blocked = [];
page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) blocked.push(m.text().slice(0, 110)); });

for (const [route, probe] of [
  ['/careers', async () => (await page.locator('#openings').getAttribute('data-state'))],
  ['/careers/apply', async () => ((await page.locator('form#apply-top').count()) ? 'form rendered' : 'FORM MISSING')],
  ['/contractors', async () => ((await page.locator('input[type=file]').count()) ? 'form rendered' : 'FORM MISSING')],
  ['/contact', async () => ((await page.locator('#topic').count()) ? 'form rendered' : 'FORM MISSING')],
]) {
  blocked.length = 0;
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  console.log(`${route.padEnd(16)} -> ${await probe()}   cspBlocked=${blocked.length}`);
  if (blocked.length) console.log('     ', blocked[0]);
}
await browser.close();
