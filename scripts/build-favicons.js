#!/usr/bin/env node
// Favicons a partir de assets/brand/ampersand.svg (el "&" de Felipe).
//  - public/favicon.svg: el "&" solo, sin fondo; noche en tema claro, blanco en tema oscuro
//    (Chrome, Edge y Firefox lo usan y lo cambian según el tema del sistema).
//  - public/favicon.ico: respaldo para Safari y navegadores viejos: "&" blanco en un círculo de noche.
//  - public/apple-touch-icon.png: ícono del iPhone (iOS siempre le pone su forma de cuadro redondeado).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public');
const D = fs.readFileSync(path.join(ROOT, 'assets/brand/ampersand.svg'), 'utf8').match(/ d="([^"]+)"/)[1];
const VW = 172.77, VH = 166.38;

// "&" blanco centrado dentro de un círculo (o cuadro completo) de noche con auroras suaves.
function tileSvg(size, { circle, scale }) {
  const s = size * scale / VW;
  const x = (size - VW * s) / 2, y = (size - VH * s) / 2;
  const shape = circle
    ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/>`
    : `<rect width="${size}" height="${size}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="a" cx="0.15" cy="0.1" r="0.75"><stop offset="0" stop-color="#F02D3A" stop-opacity="0.5"/><stop offset="1" stop-color="#F02D3A" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="0.95" cy="0.9" r="0.8"><stop offset="0" stop-color="#7B4DFF" stop-opacity="0.6"/><stop offset="1" stop-color="#7B4DFF" stop-opacity="0"/></radialGradient>
      <clipPath id="c">${shape}</clipPath>
    </defs>
    <g clip-path="url(#c)">
      <rect width="${size}" height="${size}" fill="#120F2A"/><rect width="${size}" height="${size}" fill="url(#a)"/><rect width="${size}" height="${size}" fill="url(#b)"/>
    </g>
    <path d="${D}" fill="#ffffff" transform="translate(${x} ${y}) scale(${s})"/>
  </svg>`;
}
const png = (svg) => sharp(Buffer.from(svg), { density: 300 }).png().toBuffer();

// ICO con imágenes PNG adentro.
function ico(pngs) {
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size, o); dir.writeUInt8(size, o + 1); dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6); dir.writeUInt32LE(buf.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map(p => p.buf)]);
}

(async () => {
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, buf: await png(tileSvg(size, { circle: true, scale: size <= 16 ? 0.74 : 0.66 })) });
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), ico(pngs));
  fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), await png(tileSvg(180, { circle: false, scale: 0.6 })));
  console.log('Listo: favicon.ico y apple-touch-icon.png (favicon.svg se escribe a mano)');
})();
