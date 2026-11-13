// Прави иконите и началния екран на приложението (sharp).
import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CAR = 'M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v8c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-1h12v1c0 .6.4 1 1 1h1c.6 0 1-.4 1-1v-8l-2.1-6zM6.5 16c-.8 0-1.5-.7-1.5-1.5S5.7 13 6.5 13s1.5.7 1.5 1.5S7.3 16 6.5 16zm11 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z';
const NAVY = '#0B1B3F', GOLD = '#D4A72C', GOLD2 = '#F2D27A';

function mark(fg, ring, sign) {
  let chk = '';
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) chk += `<rect x="${202 + i * 18}" y="${114 + j * 16}" width="18" height="16" fill="${sign}"/>`;
  return `<circle cx="256" cy="256" r="214" fill="none" stroke="${ring}" stroke-width="16"/>
    <rect x="196" y="108" width="120" height="44" rx="10" fill="${fg}"/>${chk}
    <path transform="translate(256 270) scale(9.2) translate(-12 -13)" d="${CAR}" fill="${fg}"/>
    <path d="M120 404 Q256 456 392 404" fill="none" stroke="${ring}" stroke-width="14" stroke-linecap="round"/>`;
}
const full = (shape) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${shape === 'round' ? `<circle cx="256" cy="256" r="256" fill="${GOLD}"/>` : `<rect width="512" height="512" rx="96" fill="${GOLD}"/>`}
  <g transform="translate(256 256) scale(.9) translate(-256 -256)">${mark(NAVY, NAVY, GOLD2)}</g></svg>`;
const fore = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <g transform="translate(256 256) scale(.6) translate(-256 -256)">${mark(NAVY, NAVY, GOLD2)}</g></svg>`;
const splashMark = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="250" fill="${GOLD}"/><g transform="translate(256 256) scale(.85) translate(-256 -256)">${mark(NAVY, NAVY, GOLD2)}</g></svg>`;

const res = 'android/app/src/main/res';
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(legacy)) {
  await sharp(Buffer.from(full('square'))).resize(s, s).png().toFile(`${res}/mipmap-${d}/ic_launcher.png`);
  await sharp(Buffer.from(full('round'))).resize(s, s).png().toFile(`${res}/mipmap-${d}/ic_launcher_round.png`);
  await sharp(Buffer.from(fore)).resize(Math.round(s * 2.25), Math.round(s * 2.25)).png().toFile(`${res}/mipmap-${d}/ic_launcher_foreground.png`);
}
// Начален екран: тъмносин фон и знакът в средата.
for (const dir of readdirSync(res)) {
  const f = join(res, dir, 'splash.png');
  try { statSync(f); } catch { continue; }
  const meta = await sharp(f).metadata();
  const m = Math.round(Math.min(meta.width, meta.height) * 0.32);
  const logo = await sharp(Buffer.from(splashMark)).resize(m, m).png().toBuffer();
  await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: NAVY } })
    .composite([{ input: logo, gravity: 'center' }]).png().toFile(f + '.tmp.png');
  const { renameSync } = await import('node:fs');
  renameSync(f + '.tmp.png', f);
}
await sharp(Buffer.from(full('square'))).resize(192, 192).png().toFile('www/icon-192.png');
await sharp(Buffer.from(full('round'))).resize(512, 512).png().toFile('tools/preview-icon.png');
console.log('icons ok');
