// Correos con la identidad "Noche mágica" (maquetas en el lienzo del rediseño).
// HTML de correo: tablas, estilos en línea y colores de respaldo para Outlook.
// Lo que el correo no puede pintar (número con degradado, polaroids giradas, logos)
// va como imagen: ver lib/emailImages.js y scripts/build-email-assets.js.
const config = require('./config');
const { stats, todayParts, daysBetween, RELATIONSHIP_START } = require('./dates');
const { pickMemoriesForEmail } = require('./memories');
const { numberImage, polaroidImage } = require('./emailImages');

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SITE = config.SITE_URL;
const SERIF = "'Instrument Serif', Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, Helvetica, sans-serif";
const GRAD = 'background-color:#E0457A;background-image:linear-gradient(135deg,#FF6B7A,#C2389B);';
const TONE = {
  felipe: { ring: '#FF8A95', quote: '#FF7A85', chipBg: '#FFEDEA', chipFg: '#8A1F3B', playBg: '#E0457A', playGrad: 'linear-gradient(135deg,#FF6B7A,#C2389B)', line: '#FFD3D8' },
  fernanda: { ring: '#B983FF', quote: '#A774F2', chipBg: '#F1EAFF', chipFg: '#4A2A8C', playBg: '#9A63F5', playGrad: 'linear-gradient(135deg,#B983FF,#7B4DFF)', line: '#E6D6FF' }
};
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtShort(sqliteUtc) {
  if (!sqliteUtc) return '';
  const t = todayParts(new Date(sqliteUtc.replace(' ', 'T') + 'Z'));
  return `${t.d} ${MESES[t.m - 1]} ${t.y}`;
}

// Preview text: rota cada año empezando en 2026 (8º aniversario = frase 1),
// y vuelve a empezar después de la décima.
const PREVIEW_FIRST_ANNIVERSARY = 8;
const PREVIEW_TEXTS = [
  'Revivamos estos momentos épicos (y los no tanto).',
  'Tantas cosas han pasado… y ni una sola discusión. 😇',
  'Otro año más escribiendo nuestra historia.',
  'Mira todo lo que hemos vivido juntos.',
  'Un año más de risas, viajes y "¿qué cenamos?".',
  'Nuestro cofre de recuerdos se abre otra vez.',
  'Lo mejor de nosotros, sin bloopers incluidos.',
  'Felipe y Fernanda del pasado tienen algo que decirles.',
  'Seguimos sumando días, recuerdos y fotos borrosas.',
  'Lo que empezó en un coche sigue sin estacionarse.'
];

function previewText(aniversarioN) {
  const i = aniversarioN - PREVIEW_FIRST_ANNIVERSARY;
  return PREVIEW_TEXTS[((i % 10) + 10) % 10];
}

// ---------- Piezas comunes ----------
function documentShell({ title, preheader, body }) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  @media (max-width: 620px) {
    .outer { padding:0 !important; }
    .card { border-radius:0 !important; }
    .px { padding-left:20px !important; padding-right:20px !important; }
    .px16 { padding-left:16px !important; padding-right:16px !important; }
    .num { width:auto !important; height:140px !important; }
    .h-years { font-size:32px !important; }
    .h-cofre { font-size:36px !important; }
    .h-cta { font-size:28px !important; }
    .stat { padding:13px 14px !important; }
    .stat-n { font-size:23px !important; }
    .stat-l { font-size:15px !important; }
    .mem { padding:18px !important; }
    .quote { font-size:21px !important; }
    .pol { width:100% !important; max-width:300px !important; height:auto !important; }
    .btn-full { display:block !important; text-align:center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#EEE8F0;">
<div style="display:none;font-size:1px;color:#EEE8F0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}${'&#847; &zwnj; &nbsp; '.repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEE8F0" style="background-color:#EEE8F0;">
<tr><td align="center" class="outer" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:100%;max-width:600px;background-color:#FBF7F4;border-radius:28px;overflow:hidden;">
${body}
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Franja de noche con auroras (imagen de fondo; Outlook muestra el azul noche liso).
function night(inner, { padding = '32px 40px 44px' } = {}) {
  return `<tr><td class="px" background="${SITE}/correo/aurora.jpg" bgcolor="#120F2A" style="background-color:#120F2A;background-image:url('${SITE}/correo/aurora.jpg');background-size:cover;background-position:center top;padding:${padding};color:#ffffff;font-family:${SANS};">
${inner}
</td></tr>`;
}

function logoRow(right) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
  <td align="left" valign="middle"><img src="${SITE}/correo/ff-blanco.png" width="45" height="24" alt="F &amp; F" style="display:block;height:24px;width:auto;"></td>
  <td align="right" valign="middle" style="font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9C3DB;">${right}</td>
</tr></table>`;
}

function button(href, label, { full = false } = {}) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${full ? 'width="100%"' : 'align="center"'}><tr>
  <td align="center" bgcolor="#E0457A" style="${GRAD}border-radius:999px;">
    <a href="${href}" target="_blank" class="${full ? 'btn-full' : ''}" style="display:inline-block;padding:15px 26px;font-family:${SANS};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${label}&nbsp;&rarr;</a>
  </td>
</tr></table>`;
}

function pill(text, bg = '#ECE6F7', fg = '#3F3466') {
  return `<span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:${bg};color:${fg};font-family:${SANS};font-size:12px;font-weight:600;">${text}</span>`;
}

function signature() {
  return `<tr><td align="center" style="padding:8px 40px 40px;font-family:${SANS};">
  <img src="${SITE}/correo/fernanda-felipe-profundo.png" width="140" alt="Fernanda &amp; Felipe" style="display:block;width:140px;height:auto;margin:0 auto;">
  <p style="margin:10px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5E5A73;">Desde el 24 de noviembre de 2018</p>
</td></tr>`;
}

function avatar(username, size, { border = '#120F2A' } = {}) {
  const t = TONE[username] || TONE.felipe;
  return `<img src="${SITE}/avatars/${username}.png" width="${size}" height="${size}" alt="" style="display:block;width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${t.ring};padding:2px;background-color:${border};object-fit:cover;">`;
}

// ---------- Correo de aniversario ----------
function statCell(n, label) {
  return `<td class="stat" width="50%" valign="top" bgcolor="#28224A" style="background-color:#28224A;background-color:rgba(255,255,255,0.08);border-radius:16px;padding:16px 18px;">
    <div class="stat-n" style="font-family:${SANS};font-size:28px;font-weight:600;letter-spacing:-0.5px;line-height:1.15;color:#FF9AA6;">${n}</div>
    <div class="stat-l" style="font-family:${SERIF};font-style:italic;font-size:17px;line-height:1.3;color:#DCD8E8;">${label}</div>
  </td>`;
}

function statsBox(s) {
  const rows = [
    [[s.s_diasRelacion, 'días juntos'], [s.s_horasJuntos, 'horas lado a lado']],
    [[s.s_lunasLlenas, 'lunas llenas'], [s.s_añosMatrimonio, 'de ellos, casados']],
    [[`${s.s_porcentajeVida_fer}%`, 'de la vida de Fernanda, juntos'], [`${s.s_porcentajeVida_felipe}%`, 'de la vida de Felipe, juntos']]
  ];
  const grid = rows.map((r, i) => `<tr>${statCell(...r[0])}<td width="10" style="font-size:0;line-height:0;">&nbsp;</td>${statCell(...r[1])}</tr>${i < rows.length - 1 ? '<tr><td colspan="3" height="10" style="font-size:0;line-height:0;height:10px;">&nbsp;</td></tr>' : ''}`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;"><tr>
  <td bgcolor="#1E1A3A" style="background-color:#1E1A3A;background-color:rgba(255,255,255,0.07);border:1px solid #3A3558;border-color:rgba(255,255,255,0.14);border-radius:24px;padding:24px;text-align:left;" class="px16">
    <p style="margin:0 0 16px;font-family:${SERIF};font-size:26px;line-height:1.2;color:#ffffff;">Esos ${s.s_añosNoviazgo} años son…</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${grid}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
      <td align="left" style="font-family:${SANS};font-size:13px;color:#D6D2E2;">Camino a nuestro <b style="color:#ffffff;">${s.s_hitoN}º aniversario</b></td>
      <td align="right" style="font-family:${SANS};font-size:13px;color:#D6D2E2;">faltan ${s.s_diasHito} días</td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;background-color:#3A3556;border-radius:999px;"><tr>
      <td width="${s.progresoHito}%" height="8" bgcolor="#FF6B7A" style="height:8px;font-size:0;line-height:0;border-radius:999px;background-color:#FF6B7A;background-image:linear-gradient(90deg,#FFB37A,#FF6B7A,#B983FF);">&nbsp;</td>
      <td style="font-size:0;line-height:0;">&nbsp;</td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr>
      <td align="left" style="font-family:${SANS};font-size:11px;color:#A9A3BE;">${RELATIONSHIP_START.y}</td>
      <td align="right" style="font-family:${SANS};font-size:11px;color:#A9A3BE;">${s.hitoAño}</td>
    </tr></table>
  </td>
</tr></table>`;
}

function songChip(mem, t) {
  if (!mem.song && !mem.song_url) return '';
  const label = esc(mem.song || 'Escúchala aquí');
  const chip = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr>
    <td bgcolor="${t.chipBg}" style="background-color:${t.chipBg};border-radius:999px;padding:5px 14px 5px 5px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="26" height="26" align="center" valign="middle" bgcolor="${t.playBg}" style="width:26px;height:26px;border-radius:50%;background-color:${t.playBg};background-image:${t.playGrad};color:#ffffff;font-size:10px;line-height:26px;">&#9654;</td>
        <td style="padding-left:10px;font-family:${SANS};font-size:13px;font-weight:500;color:${t.chipFg};">${label}</td>
      </tr></table>
    </td>
  </tr></table>`;
  return mem.song_url
    ? `<a href="${esc(mem.song_url)}" target="_blank" style="text-decoration:none;display:inline-block;">${chip}</a>`
    : chip;
}

function memoryCard(mem, username, name, year, pol) {
  const t = TONE[username];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr>
  <td class="mem" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${t.line};border-radius:24px;padding:24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle">${avatar(username, 40, { border: '#ffffff' })}</td>
      <td valign="middle" style="padding-left:12px;font-family:${SANS};">
        <div style="font-size:15px;font-weight:600;color:#1E1B33;">${esc(name)}</div>
        <div style="font-size:13px;color:#5E5A73;">Su momento favorito de ${year}</div>
      </td>
    </tr></table>
    ${pol ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr><td align="center">
      <img class="pol" src="${pol.url}" width="${pol.width}" height="${pol.height}" alt="Foto del recuerdo de ${esc(name)}" style="display:block;width:${pol.width}px;max-width:100%;height:auto;margin:0 auto;">
    </td></tr></table>` : ''}
    <p class="quote" style="margin:${pol ? '6px' : '18px'} 0 0;font-family:${SERIF};font-style:italic;font-size:23px;line-height:1.35;color:#1E1B33;"><span style="color:${t.quote};">&ldquo;</span>${esc(mem.body).replace(/\n/g, '<br>')}<span style="color:${t.quote};">&rdquo;</span></p>
    ${songChip(mem, t)}
    <p style="margin:16px 0 0;font-family:${SANS};font-size:12px;color:#5E5A73;">Escrito el ${fmtShort(mem.updated_at)}</p>
  </td>
</tr></table>`;
}

// Construye asunto + HTML. picked puede venir de pickMemoriesForEmail(..., {commit}).
async function buildEmail({ now = new Date(), picked } = {}) {
  const s = stats(now);
  if (picked === undefined) {
    picked = pickMemoriesForEmail(s.currentYear, { commit: false });
  }
  const n = s.añosNoviazgo;
  const asunto = `¡Feliz ${n}º Aniversario! 🥂`;
  const t = s.today;
  const num = await numberImage(n);

  let cofre;
  if (picked) {
    const y = picked.year;
    const stk = require('./stickers').forMemories([picked.felipe.id, picked.fernanda.id]);
    const [polF, polR] = await Promise.all([
      polaroidImage({ memoryId: picked.felipe.id, photo: picked.felipe.photo, year: y, rot: -2, stickers: stk.get(picked.felipe.id) || [] }),
      polaroidImage({ memoryId: picked.fernanda.id, photo: picked.fernanda.photo, year: y, rot: 2, stickers: stk.get(picked.fernanda.id) || [] })
    ]);
    cofre = `
    <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B3134A;font-weight:600;">Del Cofre de Recuerdos</p>
    <h2 class="h-cofre" style="margin:10px 0 0;font-family:${SERIF};font-weight:400;font-size:44px;line-height:1.05;color:#1E1B33;">Un recuerdo de ${y}</h2>
    <p style="margin:10px 0 0;font-family:${SANS};font-size:15px;line-height:1.55;color:#5E5A73;">Felipe y Fernanda del pasado les dejaron esto.</p>
    <p style="margin:12px 0 0;">${pill(`Nuestro ${y - RELATIONSHIP_START.y}º año`)}</p>
  </td></tr>
  <tr><td class="px16" style="padding:10px 40px 0;text-align:left;">
    ${memoryCard(picked.felipe, 'felipe', 'Felipe', y, polF)}
    ${memoryCard(picked.fernanda, 'fernanda', 'Fernanda', y, polR)}`;
  } else {
    cofre = `
    <p style="margin:0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#B3134A;font-weight:600;">Del Cofre de Recuerdos</p>
    <h2 class="h-cofre" style="margin:10px 0 0;font-family:${SERIF};font-weight:400;font-size:40px;line-height:1.05;color:#1E1B33;">El cofre espera sus primeros recuerdos</h2>`;
  }

  const hero = night(`
    ${logoRow(`${t.d} ${MESES[t.m - 1]} ${t.y}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="text-align:center;">
      <p style="margin:36px 0 0;font-family:${SERIF};font-style:italic;font-size:30px;line-height:1.1;color:#FFE1C4;">¡Feliz aniversario!</p>
      <img class="num" src="${num.url}" width="${num.width}" height="${num.height}" alt="${n}" style="display:block;margin:10px auto 6px;width:${num.width}px;height:${num.height}px;font-family:Georgia,serif;font-size:120px;font-weight:bold;color:#FF7A85;">
      <p class="h-years" style="margin:0;font-family:${SERIF};font-size:40px;line-height:1.1;color:#ffffff;">años de relación</p>
      <p style="margin:8px 0 0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9C3DB;">Desde el 24 de noviembre de 2018</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:28px auto 0;"><tr>
        <td align="center" valign="top" style="font-family:${SANS};font-size:13px;font-weight:600;color:#ffffff;">${avatar('felipe', 60)}<div style="margin-top:8px;">Felipe</div></td>
        <td align="center" valign="top" style="padding:12px 18px 0;font-family:${SERIF};font-style:italic;font-size:38px;line-height:1;color:#FF9AA6;">&amp;</td>
        <td align="center" valign="top" style="font-family:${SANS};font-size:13px;font-weight:600;color:#ffffff;">${avatar('fernanda', 60)}<div style="margin-top:8px;">Fernanda</div></td>
      </tr></table>
      <p style="margin:22px auto 0;max-width:400px;font-family:${SERIF};font-style:italic;font-size:20px;line-height:1.4;color:#E4E0EE;">Después de aquel día en el coche de Felipe, afuera de la casa de Fernanda.</p>
    </td></tr></table>
    ${statsBox(s)}`);

  const body = `
${hero}
<tr><td class="px" align="center" style="padding:44px 40px 0;text-align:center;background-color:#FBF7F4;">
    ${cofre}
</td></tr>
<tr><td class="px16" style="padding:32px 40px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="#FFF1EC" style="background-color:#FFF1EC;background-image:linear-gradient(140deg,#FFE2D8,#FFFFFF 55%,#E9DEFF);border:1.5px dashed #F0A3B8;border-radius:24px;padding:32px 28px;text-align:center;" class="px">
      ${pill(`Nuestro ${n}º año`)}
      <p class="h-cta" style="margin:12px 0 0;font-family:${SERIF};font-size:34px;line-height:1.15;color:#1E1B33;">¿Cuál fue tu momento favorito de ${s.currentYear}?</p>
      <p style="margin:12px auto 0;max-width:420px;font-family:${SANS};font-size:15px;line-height:1.55;color:#5E5A73;">Un viaje, una escena o una tontería que todavía los hace reír. El cofre de ${s.currentYear} está abierto hasta el 31 de diciembre.</p>
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      ${button(`${SITE}/nuevo`, `Escribir mi recuerdo de ${s.currentYear}`)}
    </td>
  </tr></table>
</td></tr>
${signature()}`;

  const htmlBody = documentShell({ title: asunto, preheader: previewText(n), body });
  return { asunto, htmlBody, picked, stats: s };
}

// ---------- Recordatorio del 1 de diciembre ----------
function buildReminder({ name, username, year, now = new Date(), otherName = null }) {
  // otherName: si la otra persona ya guardó el suyo (los dos se abren cuando guardes el tuyo).
  const asunto = otherName ? `${name}, ${otherName} ya guardó el suyo` : `${name}, falta tu recuerdo de ${year}`;
  const t = todayParts(now);
  const left = Math.max(0, daysBetween(t, { y: year, m: 12, d: 31 }));
  const quedan = left === 0 ? 'Hoy es el último día' : left === 1 ? 'Queda 1 día' : `Quedan ${left} días`;
  const body = `
${night(`
  ${logoRow(`Cofre de ${year}`)}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;"><tr>
    <td valign="middle">${avatar(username, 56)}</td>
    <td valign="middle" style="padding-left:16px;font-family:${SERIF};font-size:44px;line-height:1.05;color:#ffffff;">Hola, ${esc(name)}</td>
  </tr></table>
  <p style="margin:14px 0 0;font-family:${SANS};font-size:16px;line-height:1.55;color:#E4E0EE;">${otherName
    ? `${esc(otherName)} ya guardó el suyo. Falta el tuyo para abrirlos.`
    : `El cofre de ${year} sigue esperando tu momento favorito del año.`}</p>`, { padding: '28px 40px 40px' })}
<tr><td class="px16" style="padding:32px 40px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td class="px" bgcolor="#FFF1EC" style="background-color:#FFF1EC;background-image:linear-gradient(140deg,#FFE2D8,#FFFFFF 55%,#E9DEFF);border:1.5px dashed #F0A3B8;border-radius:24px;padding:28px;text-align:left;">
      <p style="margin:0;font-family:${SERIF};font-size:32px;line-height:1.15;color:#1E1B33;">¿Cuál fue tu momento favorito de ${year}?</p>
      <p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:1.55;color:#5E5A73;">No tiene que ser el mejor viaje ni el día más especial. Puede ser algo pequeño que todavía te haga sonreír.</p>
      <p style="margin:16px 0 0;">${pill(`${quedan} · hasta el 31 de diciembre`, '#FFE8D6', '#8A4413')}</p>
      <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#E0457A" style="${GRAD}border-radius:999px;">
        <a href="${SITE}/nuevo" target="_blank" style="display:inline-block;padding:15px 26px;font-family:${SANS};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Escribir mi recuerdo de ${year}&nbsp;&rarr;</a>
      </td></tr></table>
    </td>
  </tr></table>
  <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:#5E5A73;text-align:center;">Si ya empezaste, tu borrador te está esperando tal como lo dejaste.</p>
</td></tr>
${signature()}`;
  const preheader = otherName
    ? `Ninguno ha visto el del otro. Se abren los dos en cuanto guardes el tuyo.`
    : 'Tienes hasta el 31 de diciembre para guardarlo en el cofre.';
  return { asunto, htmlBody: documentShell({ title: asunto, preheader, body }) };
}

// ---------- Revelación: los recuerdos del año ya se pueden ver ----------
// writers: [{ username, name }] de quienes guardaron (uno solo si se abrió el 1 de enero).
// No muestra los recuerdos: se abren en el sitio, con su animación.
function buildRevealEmail({ year, writers }) {
  const both = writers.length >= 2;
  const asunto = both ? `Sus recuerdos de ${year} ya se pueden ver` : `El recuerdo de ${writers[0].name} de ${year} ya se puede ver`;
  const eyebrow = both ? 'Los dos ya guardaron el suyo' : 'Llegó el 1 de enero';
  const title = both ? `Sus recuerdos de ${year} ya están en el cofre` : `El cofre de ${year} ya se abrió`;
  const lead = both
    ? 'Ninguno ha visto el del otro todavía. Ábranlos cuando quieran, juntos o cada quien por su lado.'
    : `${esc(writers[0].name)} guardó su momento favorito del año y ya pueden verlo los dos.`;
  const lockCard = (w) => {
    const t = TONE[w.username] || TONE.felipe;
    const lock = w.username === 'fernanda' ? 'candado-lila.png' : 'candado-coral.png';
    return `<td width="${both ? '48%' : '100%'}" align="center" valign="top" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid ${t.line};border-radius:20px;padding:18px;text-align:center;">
      <img src="${SITE}/correo/${lock}" width="44" height="44" alt="" style="display:block;margin:0 auto;width:44px;height:44px;">
      <p style="margin:10px 0 0;font-family:${SERIF};font-size:20px;line-height:1.2;color:#1E1B33;">El de ${esc(w.name)}</p>
    </td>`;
  };
  const body = `
${night(`
  ${logoRow(`Cofre de ${year}`)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:32px auto 0;"><tr>
      <td align="center" valign="middle">${avatar('felipe', 64)}</td>
      <td align="center" valign="middle" style="padding:0 16px;font-family:${SERIF};font-style:italic;font-size:38px;line-height:1;color:#FF9AA6;">&amp;</td>
      <td align="center" valign="middle">${avatar('fernanda', 64)}</td>
    </tr></table>
    <p style="margin:22px 0 0;font-family:${SANS};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9C3DB;">${eyebrow}</p>
    <h1 class="h-cofre" style="margin:10px 0 0;font-family:${SERIF};font-weight:400;font-size:44px;line-height:1.08;color:#ffffff;">${title}</h1>
    <p style="margin:14px auto 0;max-width:430px;font-family:${SANS};font-size:16px;line-height:1.55;color:#E4E0EE;">${lead}</p>
  </td></tr></table>`, { padding: '28px 40px 44px' })}
<tr><td class="px16" style="padding:32px 40px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    ${writers.map(lockCard).join(both ? '<td width="4%" style="font-size:0;line-height:0;">&nbsp;</td>' : '')}
  </tr></table>
  <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
  ${button(`${SITE}/`, 'Abrir el cofre')}
  <p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.5;color:#5E5A73;text-align:center;">El correo no muestra los recuerdos: se abren en el sitio.</p>
</td></tr>
${signature()}`;
  const preheader = both ? 'Los dos ya guardaron el suyo. Es hora de abrirlos.' : 'Ya pueden verlo en el cofre.';
  return { asunto, htmlBody: documentShell({ title: asunto, preheader, body }) };
}

// ---------- Recuperar contraseña ----------
function buildResetEmail({ name, username, link }) {
  const subject = 'Tu enlace para entrar al cofre';
  const body = `
${night(`
  ${logoRow('')}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>
    <td valign="middle">${avatar(username, 56)}</td>
    <td valign="middle" style="padding-left:16px;font-family:${SERIF};font-size:40px;line-height:1.05;color:#ffffff;">Hola, ${esc(name)}</td>
  </tr></table>
  <p style="margin:18px 0 0;font-family:${SANS};font-size:16px;line-height:1.55;color:#E4E0EE;">Alguien (seguro tú) pidió crear una nueva contraseña para entrar a nuestro cofre. Toca el botón y elige una nueva.</p>
  <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#E0457A" style="${GRAD}border-radius:999px;">
    <a href="${esc(link)}" target="_blank" style="display:inline-block;padding:15px 26px;font-family:${SANS};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Crear nueva contraseña&nbsp;&rarr;</a>
  </td></tr></table>
  <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #3A3558;font-family:${SANS};font-size:13px;line-height:1.55;color:#B9B3CF;">El enlace funciona una sola vez y vence en 1 hora. Si no lo pediste, ignora este correo: tu contraseña sigue igual.</p>`, { padding: '32px 40px 40px' })}
<tr><td style="padding-top:32px;"></td></tr>
${signature()}`;
  return { subject, html: documentShell({ title: subject, preheader: 'Crea tu nueva contraseña. El enlace vence en 1 hora.', body }) };
}

// Inserta un aviso al principio del correo (para los correos de prueba).
function withBanner(html, text) {
  return html.replace(/<body[^>]*>/, m => `${m}
<div style="font-family:Arial,Helvetica,sans-serif;background:#fff3cd;color:#5c4400;padding:10px 16px;font-size:13px;">${text}</div>`);
}

module.exports = { buildEmail, buildReminder, buildRevealEmail, buildResetEmail, withBanner, previewText, PREVIEW_TEXTS };
