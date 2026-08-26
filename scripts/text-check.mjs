/**
 * Catches words run together across an inline-element boundary — the Astro
 * whitespace trap, where `email\n<a>x@y.com</a>` renders as "emailx@y.com".
 *
 * Detects it structurally rather than by regex: for each inline element, look at
 * the text node beside it and flag when a letter sits flush against the
 * element's text with no space. A regex over the rendered text cannot tell that
 * apart from a legitimate block boundary, and matches inside the email itself.
 */
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:4321';
const routes = ['/', '/services', '/about', '/team', '/careers', '/careers/apply', '/contractors', '/contact', '/employees', '/privacy', '/404'];

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

let bad = 0;
for (const route of routes) {
  const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  if (!resp || (resp.status() >= 400 && route !== '/404')) continue;
  await page.waitForTimeout(350);

  const issues = await page.evaluate(() => {
    const INLINE = new Set(['A', 'STRONG', 'EM', 'B', 'I', 'SPAN', 'CODE', 'ABBR']);
    const found = [];
    for (const el of document.querySelectorAll('a, strong, em, b, i, span, code, abbr')) {
      if (!INLINE.has(el.tagName)) continue;
      const style = getComputedStyle(el);
      if (style.display !== 'inline' || !el.textContent?.trim()) continue;

      const prev = el.previousSibling;
      if (prev && prev.nodeType === 3) {
        const before = prev.textContent ?? '';
        const first = el.textContent.trim()[0];
        if (/[A-Za-z]$/.test(before) && /[A-Za-z0-9]/.test(first)) {
          found.push(`"${before.slice(-24)}" + "${el.textContent.trim().slice(0, 24)}"`);
        }
      }
      const next = el.nextSibling;
      if (next && next.nodeType === 3) {
        const after = next.textContent ?? '';
        const last = el.textContent.trim().slice(-1);
        if (/^[A-Za-z]/.test(after) && /[A-Za-z0-9]/.test(last)) {
          found.push(`"${el.textContent.trim().slice(-24)}" + "${after.slice(0, 24)}"`);
        }
      }
    }
    return found;
  });

  for (const i of issues) {
    console.log(`  ${route}: ${i}`);
    bad++;
  }
}

await browser.close();
console.log(bad ? `\n${bad} run-together text issue(s)` : 'no run-together text issues');
process.exit(bad ? 1 : 0);
