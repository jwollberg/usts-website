/**
 * Drives the application form end to end against the dev server: checks that
 * validation blocks a step, that answering unblocks it, and that progress and
 * focus move as intended. Run with the dev server up.
 */
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:4321';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const fails = [];
/**
 * This suite exercises form logic, not layout. Playwright scrolls a target
 * flush to the top of the viewport, where the sticky masthead covers it, and
 * smooth scrolling races its stability check — so both are neutralised here.
 * Sticky-header behaviour is verified by screenshot instead.
 */
async function neutralizeChrome() {
  await page.addStyleTag({
    content: 'html{scroll-behavior:auto !important}.site-header{position:static !important}',
  });
}

async function clickBtn(name) {
  await page.getByRole('button', { name, exact: true }).click();
}

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails.push(name);
};

await page.goto(`${base}/careers/apply`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await neutralizeChrome();

check('step 1 renders', await page.getByRole('heading', { name: 'Eligibility', level: 2 }).isVisible());

// Continue with nothing answered must be blocked and must announce why.
await clickBtn('Continue');
await page.waitForTimeout(250);
const alert = page.getByRole('alert');
check('empty step blocked', await alert.isVisible());
check('error summary lists all 4', (await alert.locator('li').count()) === 4, `${await alert.locator('li').count()} items`);
check('still on step 1', await page.getByRole('heading', { name: 'Eligibility', level: 2 }).isVisible());

// Answer everything Yes, then advance.
// The radio itself is sr-only; a user clicks the styled label, so does the test.
for (const q of ['yearsOld', 'eligibleForUsEmployment', 'canUndergoBackgroundChecks', 'ableToPerformRole']) {
  await page.locator(`label.usts-choice:has(input[name="${q}"])`).first().click();
}
check('answers registered', await page.locator('input[name="yearsOld"]').first().isChecked());
await clickBtn('Continue');
await page.waitForTimeout(350);
check('advanced to step 2', await page.getByRole('heading', { name: 'About you', level: 2 }).isVisible());
check('focus moved to heading', await page.evaluate(() => document.activeElement?.textContent?.trim()) === 'About you');

const pb = page.getByRole('progressbar');
check('progress advanced', (await pb.getAttribute('aria-valuenow')) === '2', `aria-valuenow=${await pb.getAttribute('aria-valuenow')}`);

// Invalid email / phone / zip must each be caught.
await page.fill('#firstName', 'Test');
await page.fill('#lastName', 'Applicant');
await page.fill('#email', 'not-an-email');
await page.fill('#phone', '123');
await page.fill('#street1', '1 Main St');
await page.fill('#city', 'Gilbert');
await page.selectOption('#state', 'AZ');
await page.fill('#zip', 'abc');
await clickBtn('Continue');
await page.waitForTimeout(250);
const msgs = await page.getByRole('alert').locator('li').allTextContents();
check('email validated', msgs.some((m) => /valid email/i.test(m)));
check('phone validated', msgs.some((m) => /10-digit/i.test(m)));
check('zip validated', msgs.some((m) => /ZIP/i.test(m)));

// Fix them and advance.
await page.fill('#email', 'test.applicant@example.com');
await page.fill('#phone', '(602) 555-0184');
await page.fill('#zip', '85298');
await clickBtn('Continue');
await page.waitForTimeout(350);
check('advanced to step 3', await page.getByRole('heading', { name: 'Role', level: 2 }).isVisible());

// Draft persistence: reload and confirm we resume where we were.
await page.reload({ waitUntil: 'networkidle' });
await neutralizeChrome();
await page.waitForTimeout(400);
check('draft restored on reload', await page.getByRole('heading', { name: 'Role', level: 2 }).isVisible());
check('restored values kept', (await page.evaluate(() =>
  JSON.parse(localStorage.getItem('usts:application:v1') || '{}').data?.email)) === 'test.applicant@example.com');

// Back navigation.
await clickBtn('Back');
await page.waitForTimeout(300);
check('back works', await page.getByRole('heading', { name: 'About you', level: 2 }).isVisible());

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
