#!/usr/bin/env node
// Genera las imágenes fijas de los correos (se guardan en public/correo/ y van en el repo):
// logos en PNG (Gmail no muestra SVG) y el fondo de auroras de la noche.
const path = require('path');
const sharp = require('sharp');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'correo');

(async () => {
  await sharp(path.join(ROOT, 'public/brand/ff-blanco.svg'), { density: 600 })
    .resize({ height: 48 }).png().toFile(path.join(OUT, 'ff-blanco.png'));
  await sharp(path.join(ROOT, 'public/brand/fernanda-felipe-profundo.svg'), { density: 600 })
    .resize({ width: 280 }).png().toFile(path.join(OUT, 'fernanda-felipe-profundo.png'));

  // Auroras: círculos de color muy desenfocados sobre la noche.
  const W = 1200, H = 2400;
  const orb = (cx, cy, r, color, op) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="${op}" filter="url(#b)"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="170"/></filter></defs>
    <rect width="${W}" height="${H}" fill="#120F2A"/>
    ${orb(80, 60, 460, '#F02D3A', 0.55)}
    ${orb(1180, 620, 480, '#7B4DFF', 0.6)}
    ${orb(600, 1500, 420, '#FF9F6B', 0.35)}
    ${orb(120, 2000, 420, '#7B4DFF', 0.4)}
    ${orb(1100, 2300, 380, '#F02D3A', 0.3)}
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, 'aurora.jpg'));
  // Candados del correo de revelación (círculo con degradado, como en el sitio). 2× para pantallas finas.
  const lock = (a, b) => `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 44 44">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <circle cx="22" cy="22" r="22" fill="url(#g)"/>
    <g transform="translate(12 12) scale(0.8333)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>
    </g></svg>`;
  await sharp(Buffer.from(lock('#FF8A95', '#C2389B')), { density: 144 }).resize(88, 88).png().toFile(path.join(OUT, 'candado-coral.png'));
  await sharp(Buffer.from(lock('#B983FF', '#7B4DFF')), { density: 144 }).resize(88, 88).png().toFile(path.join(OUT, 'candado-lila.png'));
  console.log('Listo: public/correo/');
})();
