/**
 * Screenshot helper for design review. Drives the locally installed Chrome via
 * playwright-core (no browser download) against the dev server.
 *
 *   node scripts/shot.mjs /careers --width 1440 --dark --full
 */
import { chromium } from 'playwright-core';
import path from 'node:path';

const args = process.argv.slice(2);
const VALUE_OPTS = new Set(['--base', '--width', '--height', '--out']);
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => {
  const i = args.indexOf('--' + n);
  return i === -1 ? d : args[i + 1];
};
// Positional routes only: skip both the flag and the value of value-taking options.
const routes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    if (VALUE_OPTS.has(args[i])) i++;
    continue;
  }
  routes.push(args[i]);
}

const base = opt('base', 'http://localhost:4321');
const width = Number(opt('width', 1440));
const height = Number(opt('height', 900));
const outDir = opt('out', process.env.SHOT_DIR || '.shots');
const dark = flag('dark');
const full = flag('full');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const ctx = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: 2,
  colorScheme: dark ? 'dark' : 'light',
});
// The Astro dev toolbar floats over every page and ruins review shots. Must be
// registered on the context before the page is created.
await ctx.addInitScript(() => {
  const hide = () => document.querySelector('astro-dev-toolbar')?.remove();
  document.addEventListener('DOMContentLoaded', hide);
  const t = setInterval(hide, 150);
  setTimeout(() => clearInterval(t), 3000);
});

const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

for (const route of routes.length ? routes : ['/']) {
  const url = base + route;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  const name = (route === '/' ? 'home' : route.replace(/\W+/g, '-').replace(/^-|-$/g, '')) +
    `-${width}${dark ? '-dark' : ''}${full ? '-full' : ''}.png`;
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: full });
  console.log('shot:', file);
}

if (errors.length) {
  console.log('\nCONSOLE ERRORS:');
  errors.forEach((e) => console.log('  ' + e));
}

await browser.close();
