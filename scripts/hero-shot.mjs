/** Screenshots the hero once the video has actually started playing. */
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'https://ambitious-tree-058d7ee10.7.azurestaticapps.net';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const dark of [false, true]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2, colorScheme: dark ? 'dark' : 'light' });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => {
    const v = document.getElementById('hero-video');
    return v && v.readyState >= 2 && !v.paused && v.currentTime > 2;
  }, { timeout: 30000 }).catch(() => console.log('  (video did not start)'));
  await page.waitForTimeout(1200);
  const f = `.shots/hero${dark ? '-dark' : ''}.png`;
  await page.screenshot({ path: f });
  const state = await page.evaluate(() => {
    const v = document.getElementById('hero-video');
    return v ? { playing: !v.paused, t: +v.currentTime.toFixed(1), w: v.videoWidth, h: v.videoHeight } : null;
  });
  console.log(`  ${dark ? 'dark' : 'light'}: ${JSON.stringify(state)} -> ${f}`);
  await ctx.close();
}
await browser.close();
