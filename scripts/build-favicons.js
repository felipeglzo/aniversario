#!/usr/bin/env node
// Favicons: el "&" blanco sobre un cuadro de noche con auroras suaves.
// Fuente: assets/brand/ampersand.webp → public/favicon.ico, public/favicon-*.png, public/apple-touch-icon.png
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/brand/ampersand.webp');
const OUT = path.join(ROOT, 'public');

async function tile(size, { rounded }) {
  const r = rounded ? Math.round(size * 0.22) : 0;
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="a" cx="0.15" cy="0.1" r="0.75"><stop offset="0" stop-color="#F02D3A" stop-opacity="0.55"/><stop offset="1" stop-color="#F02D3A" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="0.95" cy="0.9" r="0.8"><stop offset="0" stop-color="#7B4DFF" stop-opacity="0.65"/><stop offset="1" stop-color="#7B4DFF" stop-opacity="0"/></radialGradient>
      <clipPath id="c"><rect width="${size}" height="${size}" rx="${r}"/></clipPath>
    </defs>
    <g clip-path="url(#c)"><rect width="${size}" height="${size}" fill="#120F2A"/><rect width="${size}" height="${size}" fill="url(#a)"/><rect width="${size}" height="${size}" fill="url(#b)"/></g>
  </svg>`;
  // El "&" ocupa ~86% (en tamaños chicos un poco más, para que se lea).
  const k = size <= 32 ? 0.98 : 0.86;
  const amp = await sharp(SRC).resize(Math.round(size * k), Math.round(size * k)).png().toBuffer();
  return sharp(Buffer.from(bg)).composite([{ input: amp, gravity: 'center' }]).png().toBuffer();
}

// ICO con imágenes PNG adentro (lo aceptan todos los navegadores actuales).
function ico(pngs) {
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o); dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3); dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map(p => p.buf)]);
}

(async () => {
  const s16 = await tile(16, { rounded: true }), s32 = await tile(32, { rounded: true }), s48 = await tile(48, { rounded: true });
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico([{ size: 16, buf: s16 }, { size: 32, buf: s32 }, { size: 48, buf: s48 }]));
  fs.writeFileSync(path.join(OUT, 'favicon-32.png'), s32);
  fs.writeFileSync(path.join(OUT, 'favicon-192.png'), await tile(192, { rounded: true }));
  fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), await tile(180, { rounded: false })); // iOS redondea solo
  console.log('Listo: favicons en public/');
})();
