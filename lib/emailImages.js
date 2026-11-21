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

// Un sticker como en el sitio: el emoji a color con su borde blanco recortado y sombra.
// Necesita la fuente Noto Color Emoji en el servidor (paquete fonts-noto-color-emoji).
const stickerCache = new Map();
async function stickerPng(emoji, S) {
  const key = `${emoji}@${S}`;
  if (stickerCache.has(key)) return stickerCache.get(key);
  const sharp = require('sharp');
  const size = 50 * S, pad = 8 * S, R = Math.round(2.5 * S);
  const safe = emoji.replace(/[<>&]/g, '');
  const em = await sharp({ text: { text: `<span font="Noto Color Emoji ${size}px">${safe}</span>`, rgba: true, dpi: 72 } }).png().toBuffer();
  const base = sharp(em).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const { data, info } = await base.clone().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // Silueta ensanchada (dilatación del alfa con un disco): el borde blanco.
  const A = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) A[i] = data[i * 4 + 3];
  const offs = []; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R + R) offs.push([dx, dy]);
  const D = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0;
    for (const [dx, dy] of offs) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const v = A[yy * W + xx]; if (v > m) { m = v; if (m === 255) break; } }
    D[y * W + x] = m;
  }
  const white = await sharp(Buffer.alloc(W * H * 3, 255), { raw: { width: W, height: H, channels: 3 } }).joinChannel(Buffer.from(D), { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
  const sh = await sharp(Buffer.from(D.map(v => Math.round(v * 0.3))), { raw: { width: W, height: H, channels: 1 } }).blur(4 * S).png().toBuffer();
  const shadow = await sharp({ create: { width: W, height: H, channels: 3, background: '#28143c' } }).joinChannel(sh).png().toBuffer();
  const png = await sharp({ create: { width: W, height: H + 6 * S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shadow, top: 5 * S, left: 0 }, { input: white, top: 0, left: 0 }, { input: await base.png().toBuffer(), top: 0, left: 0 }]).png().toBuffer();
  const out = { png, w: W, h: H + 6 * S };
  stickerCache.set(key, out);
  return out;
}

// Polaroid lista para el correo: fondo blanco (el de la tarjeta), marco, año y giro.
// stickers: [{ emoji, slot }] pegados como en el sitio (0 arriba a la derecha, 1 a la izquierda abajo).
// El nombre sale de un HMAC: estable para el mismo recuerdo, imposible de adivinar.
async function polaroidImage({ memoryId, photo, year, rot, stickers = [] }) {
  const src = path.join(config.PHOTOS_DIR, photo);
  if (!photo || !fs.existsSync(src)) return null;
  const key = crypto.createHmac('sha256', config.SESSION_SECRET || 'aniversario')
    .update(`${memoryId}:${photo}:${rot}` + (stickers.length ? ':' + stickers.map(x => x.slot + x.emoji).join(',') : '')).digest('hex').slice(0, 24);
  const file = `p-${key}.jpg`;
  const out = path.join(OUT_DIR, file);
  const S = 2;                        // retina
  const FRAME = 330 * S;              // ancho del marco
  const PAD = 12 * S, BOTTOM = 44 * S;
  const PHOTO = FRAME - PAD * 2;
  const FH = PHOTO + PAD + BOTTOM;    // alto del marco
  const MARGIN = (stickers.length ? 48 : 28) * S; // espacio para el giro, la sombra y los stickers
  const W = FRAME + MARGIN * 2, H = FH + MARGIN * 2;
  if (!fs.existsSync(out)) {
    const sharp = require('sharp');
    const img = await sharp(src).rotate().resize(PHOTO, PHOTO, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer();
    const cap = textPath('caveat', year, 22 * S);
    // Stickers: mismo lugar y giro que en el sitio (caja de 64 px saliendo del borde).
    let stk = '';
    for (const x of stickers) {
      let p; try { p = await stickerPng(x.emoji, S); } catch (_) { continue; }
      const box = 64 * S;
      const cx = x.slot === 0 ? FRAME + 24 * S - box / 2 : -28 * S + box / 2;
      const cy = x.slot === 0 ? -26 * S + box / 2 : FH - 64 * S - box / 2;
      const r = x.slot === 0 ? 14 : -12;
      const sc = box / Math.max(p.w, p.h) * 1.08;
      stk += `<g transform="translate(${cx} ${cy}) rotate(${r}) scale(${sc.toFixed(3)}) translate(${-p.w / 2} ${-p.h / 2})"><image width="${p.w}" height="${p.h}" xlink:href="data:image/png;base64,${p.png.toString('base64')}"/></g>`;
    }
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
        ${stk}
      </g>
    </svg>`;
    await sharp(Buffer.from(svg)).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
  }
  return { url: publicUrl(file), width: Math.round(W / S), height: Math.round(H / S) };
}

module.exports = { numberImage, polaroidImage, OUT_DIR };
