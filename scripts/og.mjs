// Generates public/og/default.png (1200×630) from site/profile JSON. Run: npm run og
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const site = JSON.parse(await readFile(new URL('../src/data/site.json', import.meta.url)));
const profile = JSON.parse(await readFile(new URL('../src/data/profile.json', import.meta.url)));
const { accent, dark } = { accent: site.theme.accent, dark: site.theme.dark };
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const stack = profile.primaryStack.slice(0, 6);

let x = 80;
const chips = stack
  .map((t) => {
    const w = t.length * 13 + 32;
    const g = `<rect x="${x}" y="470" width="${w}" height="44" rx="22" fill="${dark.surfaceRaised}" stroke="${dark.border}"/>
  <text x="${x + w / 2}" y="499" text-anchor="middle" font-family="DejaVu Sans Mono, monospace" font-size="20" fill="${dark.muted}">${esc(t)}</text>`;
    x += w + 12;
    return g;
  })
  .join('');

const grid =
  Array.from(
    { length: 26 },
    (_, i) => `<line x1="${i * 48}" y1="0" x2="${i * 48}" y2="630" stroke="${dark.border}" stroke-opacity="0.35"/>`,
  ).join('') +
  Array.from(
    { length: 14 },
    (_, i) => `<line x1="0" y1="${i * 48}" x2="1200" y2="${i * 48}" stroke="${dark.border}" stroke-opacity="0.35"/>`,
  ).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <radialGradient id="g" cx="0.2" cy="0" r="0.9"><stop offset="0" stop-color="${accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dark.bg}" stop-opacity="0"/><stop offset="1" stop-color="${dark.bg}" stop-opacity="1"/></linearGradient>
  </defs>
  <rect width="1200" height="630" fill="${dark.bg}"/>
  ${grid}
  <rect width="1200" height="630" fill="url(#fade)"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="80" y="130" font-family="DejaVu Sans Mono, monospace" font-size="24" fill="${accent}" letter-spacing="2">${esc(profile.apiConsole.method)} ${esc(profile.apiConsole.path)}</text>
  <text x="80" y="250" font-family="DejaVu Sans, sans-serif" font-size="84" font-weight="700" fill="${dark.text}">${esc(profile.name)}</text>
  <text x="80" y="325" font-family="DejaVu Sans, sans-serif" font-size="42" fill="${dark.muted}">${esc(profile.role)}</text>
  <text x="80" y="400" font-family="DejaVu Sans, sans-serif" font-size="26" fill="${dark.subtle}">${esc(profile.headline)}</text>
  ${chips}
  <text x="1120" y="580" text-anchor="end" font-family="DejaVu Sans Mono, monospace" font-size="22" fill="${dark.subtle}">${esc(new URL(site.seo.url).host)}</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(new URL('../public/og/default.png', import.meta.url).pathname);
console.log('wrote public/og/default.png');
