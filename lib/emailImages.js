// Imágenes para los correos (los correos no pueden pintar texto con degradado,
// girar fotos ni cargar fuentes en Gmail, así que se generan como imágenes):
//  - el número grande de años, con degradado (una vez por número, se reutiliza);
//  - la polaroid de cada recuerdo citado: foto recortada, marco, año escrito a mano y giro.
// Se guardan en data/correo/ y se sirven públicas en /correo/<archivo> con nombres
// imposibles de adivinar (las fotos del sitio son privadas; esto es solo una copia).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const opentype = require('opentype.js');
const config = require('./config');

const OUT_DIR = path.join(config.DATA_DIR, 'correo');
fs.mkdirSync(OUT_DIR, { recursive: true });

const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
let fonts;
function font(name) {
  fonts = fonts || {
    lora: opentype.loadSync(path.join(FONTS_DIR, 'lora-latin-700-normal.woff')),
    caveat: opentype.loadSync(path.join(FONTS_DIR, 'caveat-latin-500-normal.woff'))
  };
  return fonts[name];
}

const publicUrl = file => `${config.SITE_URL}/correo/${file}`;

// Texto convertido a trazos SVG (así no depende de fuentes instaladas en el servidor).
function textPath(fontName, text, size) {
  const p = font(fontName).getPath(String(text), 0, 0, size);
  const bb = p.getBoundingBox();
  return { d: p.toPathData(2), bb, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 };
}

// El número de años con el degradado del sitio. Se dibuja al doble para pantallas retina.
async function numberImage(n) {
  const file = `numero-${n}.png`;
  const out = path.join(OUT_DIR, file);
  const SCALE = 2, SIZE = 180 * SCALE;
  const t = textPath('lora', n, SIZE);
  const pad = 12 * SCALE;
  const W = Math.ceil(t.w + pad * 2), H = Math.ceil(t.h + pad * 2);
  if (!fs.existsSync(out)) {
    const sharp = require('sharp');
    // 160deg en CSS ≈ de arriba-izquierda hacia abajo-derecha, casi vertical.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><linearGradient id="g" x1="0.33" y1="0" x2="0.67" y2="1">
        <stop offset="0" stop-color="#FFE1C4"/><stop offset="0.45" stop-color="#FF7A85"/><stop offset="1" stop-color="#B983FF"/>
      </linearGradient></defs>
      <path d="${t.d}" fill="url(#g)" transform="translate(${pad - t.bb.x1} ${pad - t.bb.y1})"/>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(out);
  }
  return { url: publicUrl(file), width: Math.round(W / SCALE), height: Math.round(H / SCALE) };
}

// Polaroid lista para el correo: fondo blanco (el de la tarjeta), marco, año y giro.
// El nombre sale de un HMAC: estable para el mismo recuerdo, imposible de adivinar.
async function polaroidImage({ memoryId, photo, year, rot }) {
  const src = path.join(config.PHOTOS_DIR, photo);
  if (!photo || !fs.existsSync(src)) return null;
  const key = crypto.createHmac('sha256', config.SESSION_SECRET || 'aniversario')
    .update(`${memoryId}:${photo}:${rot}`).digest('hex').slice(0, 24);
  const file = `p-${key}.jpg`;
  const out = path.join(OUT_DIR, file);
  const S = 2;                        // retina
  const FRAME = 330 * S;              // ancho del marco
  const PAD = 12 * S, BOTTOM = 44 * S;
  const PHOTO = FRAME - PAD * 2;
  const FH = PHOTO + PAD + BOTTOM;    // alto del marco
  const MARGIN = 28 * S;              // espacio para el giro y la sombra
  const W = FRAME + MARGIN * 2, H = FH + MARGIN * 2;
  if (!fs.existsSync(out)) {
    const sharp = require('sharp');
    const img = await sharp(src).rotate().resize(PHOTO, PHOTO, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    const cap = textPath('caveat', year, 22 * S);
    const capX = (FRAME - cap.w) / 2 - cap.bb.x1;
    const capY = FH - BOTTOM / 2 - cap.h / 2 - cap.bb.y1 - 2 * S;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">
      <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="${14 * S / 2}"/>
        <feOffset dy="${10 * S}" result="b"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.22"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter></defs>
      <rect width="${W}" height="${H}" fill="#ffffff"/>
      <g transform="rotate(${rot} ${W / 2} ${H / 2}) translate(${MARGIN} ${MARGIN})">
        <rect width="${FRAME}" height="${FH}" rx="${3 * S}" fill="#ffffff" filter="url(#s)"/>
        <image x="${PAD}" y="${PAD}" width="${PHOTO}" height="${PHOTO}" xlink:href="data:image/jpeg;base64,${img.toString('base64')}"/>
        <path d="${cap.d}" fill="#4A4560" transform="translate(${capX} ${capY})"/>
      </g>
    </svg>`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
  }
  return { url: publicUrl(file), width: Math.round(W / S), height: Math.round(H / S) };
}

module.exports = { numberImage, polaroidImage, OUT_DIR };
