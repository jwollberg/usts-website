/**
 * Generates public/og.png (1200x630) for link previews. Run after any change to
 * the logo or tagline:  node scripts/make-og.mjs
 */
import sharp from 'sharp';
import fs from 'node:fs';

const logo = fs.readFileSync('public/logo-inverse.svg', 'utf8');
// Strip the outer <svg> so it can be nested inside the card at a known position.
const inner = logo.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#131226"/>
      <stop offset="1" stop-color="#1d1c36"/>
    </linearGradient>
    <radialGradient id="glow" cx="1010" cy="140" r="340" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#B22234" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#B22234" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <g stroke="#ffffff" stroke-opacity="0.05">
    ${Array.from({ length: 14 }, (_, i) => `<line x1="${i * 88}" y1="0" x2="${i * 88}" y2="630"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<line x1="0" y1="${i * 88}" x2="1200" y2="${i * 88}"/>`).join('')}
  </g>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <g transform="translate(88, 92) scale(0.1355)">${inner}</g>

  <text x="88" y="360" font-family="Archivo, Segoe UI, sans-serif" font-size="82" font-weight="700"
        fill="#ffffff" letter-spacing="-2">Keeping people connected.</text>
  <text x="88" y="428" font-family="Inter, Segoe UI, sans-serif" font-size="30" fill="#b9b8cd">
    Wireless infrastructure contractor — towers, fiber and power since 2002
  </text>

  <rect x="88" y="486" width="64" height="4" fill="#B22234"/>
  <text x="88" y="548" font-family="Inter, Segoe UI, sans-serif" font-size="26" fill="#8f8ea6">
    usts1.com
  </text>
</svg>`;

await sharp(Buffer.from(card)).png({ compressionLevel: 9 }).toFile('public/og.png');
const m = await sharp('public/og.png').metadata();
console.log(`public/og.png ${m.width}x${m.height} ${(fs.statSync('public/og.png').size / 1024).toFixed(0)} KB`);
