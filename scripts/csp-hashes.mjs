/**
 * Post-build step: add SHA-256 hashes for every inline script to the CSP.
 *
 * Astro inlines small scripts (the nav toggle, the careers openings fetch) and
 * its island loader straight into the HTML. The site's CSP is `script-src 'self'`
 * with no unsafe-inline, so without this those scripts are silently blocked in
 * production — which left the careers page showing a loading skeleton forever.
 *
 * Hashing keeps the policy strict. The alternative, 'unsafe-inline', would let
 * any injected script run.
 *
 * Runs against dist/ after `astro build`; the config is served from dist/ because
 * it lives in public/.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const CONFIG = path.join(DIST, 'staticwebapp.config.json');

function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (e.endsWith('.html')) out.push(p);
  }
  return out;
}

const hashes = new Set();
const SCRIPT_RE = /<script([^>]*)>([\s\S]*?)<\/script>/g;

for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(SCRIPT_RE)) {
    const [, attrs, body] = m;
    if (/\ssrc\s*=/.test(attrs)) continue; // external, covered by 'self'
    // Data blocks (JSON-LD) are never executed, so CSP does not apply to them.
    if (/type\s*=\s*["'][^"']*(ld\+json|importmap)/i.test(attrs)) continue;
    if (!body.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
const csp = config.globalHeaders['Content-Security-Policy'];
const sorted = [...hashes].sort();
const updated = csp.replace(/script-src [^;]+;/, `script-src 'self' ${sorted.join(' ')};`);

if (updated === csp && hashes.size) {
  console.error('csp-hashes: could not find a script-src directive to update');
  process.exit(1);
}

config.globalHeaders['Content-Security-Policy'] = updated;
writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log(`csp-hashes: added ${hashes.size} inline-script hash(es) to script-src`);
