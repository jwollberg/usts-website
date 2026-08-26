/**
 * End-to-end check against the deployed site: walks the application form using
 * the real API, confirms the review step shows every answer, and confirms the
 * optional questions can be cleared. Does NOT submit.
 *
 *   node scripts/live-check.mjs https://<host>
 */
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'https://ambitious-tree-058d7ee10.7.azurestaticapps.net';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const fails = [];
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); if (!ok) fails.push(n); };

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${base}/careers/apply`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}.site-header{position:static !important}' });

const click = (n) => page.getByRole('button', { name: n, exact: true }).click();
const pick = (name, i = 0) => page.locator(`label.usts-choice:has(input[name="${name}"])`).nth(i).click();

// 1 eligibility
for (const q of ['yearsOld', 'eligibleForUsEmployment', 'canUndergoBackgroundChecks', 'ableToPerformRole']) await pick(q);
await click('Continue'); await page.waitForTimeout(250);

// 2 contact
await page.fill('#firstName', 'Livecheck'); await page.fill('#lastName', 'Probe');
await page.fill('#email', 'livecheck@example.invalid'); await page.fill('#phone', '(602) 555-0143');
await page.fill('#street1', '1 Probe Way'); await page.fill('#city', 'Gilbert');
await page.selectOption('#state', 'AZ'); await page.fill('#zip', '85298');
await click('Continue'); await page.waitForTimeout(250);

// 3 role — driven by the live /api/options
const posCount = await page.locator('#positionId option').count();
check('live positions loaded', posCount > 5, `${posCount - 1} roles`);
const mkts = await page.locator('#marketId option').allTextContents();
check('markets limited to operating three', mkts.length === 4, mkts.slice(1).join(', '));
const offs = await page.locator('#officeId option').allTextContents();
check('offices show metro names', offs.some((o) => o.startsWith('Los Angeles')) && offs.some((o) => o.startsWith('Phoenix')), offs.slice(1).join(' | '));

await page.selectOption('#positionId', { label: 'Tower Technician 1' });
await page.selectOption('#marketId', { label: 'Arizona' });
await pick('experience', 4);
await page.fill('#askingPay', '$30/hr');
await page.selectOption('#education', { label: 'High school or GED' });
await click('Continue'); await page.waitForTimeout(250);

// 4 availability — day order and optional-clear
const days = await page.locator('fieldset:has(legend:text-matches("Which days")) label.usts-choice').allTextContents();
check('days run Sun to Sat', days.join(',') === 'Sun,Mon,Tue,Wed,Thu,Fri,Sat', days.join(','));

await pick('shiftLength', 1);
check('optional choice set', await page.locator('input[name="shiftLength"]').nth(1).isChecked());
await pick('shiftLength', 1);
await page.waitForTimeout(150);
check('optional choice CLEARS on second click', !(await page.locator('input[name="shiftLength"]').nth(1).isChecked()));

await page.selectOption('#employmentType, [name="employmentType"]', {}).catch(() => {});
await pick('employmentType');
await page.selectOption('#travelAvailability', { label: '1–2 weeks at a time' });
for (const q of ['canWorkOvertime', 'canWorkWeekend', 'canWorkOvernight', 'canMakeWorkSchedule', 'canMakeLocalCommute', 'canRelocate']) await pick(q);
await page.selectOption('#startingTimeframe', { label: 'As soon as possible' });
await click('Continue'); await page.waitForTimeout(250);

// 5 history — optional yes/no clear
await page.selectOption('#longestEmployment', { label: '5+ years' });
for (const q of ['hasValidDriversLicense', 'driver', 'hasReliableTransportation']) await pick(q);
await pick('hasMilitaryService', 1);
check('optional yes/no set', await page.locator('input[name="hasMilitaryService"]').nth(1).isChecked());
await pick('hasMilitaryService', 1);
await page.waitForTimeout(150);
check('optional yes/no CLEARS on second click', !(await page.locator('input[name="hasMilitaryService"]').nth(1).isChecked()));
await page.selectOption('#referralSource', { label: 'This website' });
await click('Continue'); await page.waitForTimeout(300);

// 6 review — the bug Josh found
const rows = {};
for (const el of await page.locator('dl > div').all()) {
  const [k, v] = await el.locator('dt, dd').allTextContents();
  rows[k] = v;
}
console.log('  review:', JSON.stringify(rows));
check('review shows Available from', rows['Available from'] === 'As soon as possible', rows['Available from']);
check('review shows Education', rows['Education'] === 'High school or GED', rows['Education']);
check('review shows Travel', (rows['Travel'] || '').includes('1'), rows['Travel']);
check('review shows Role', rows['Role'] === 'Tower Technician 1', rows['Role']);

// error summary must name the field and be actionable
await click('Submit application'); await page.waitForTimeout(300);
const alertText = await page.getByRole('alert').textContent();
check('error names the field', /Certification/.test(alertText || ''), (alertText || '').slice(0, 90).replace(/\s+/g, ' '));
check('error summary is clickable', (await page.getByRole('alert').locator('button').count()) > 0);

check('no page errors', errors.length === 0, errors.join('; '));
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
