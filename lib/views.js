// Vistas HTML del sitio (sin motor de plantillas: funciones que regresan HTML).
// Diseño "Noche mágica": franja de noche con auroras arriba y una hoja crema
// que sube encima con el contenido.
const { stats, creationWindowOpen, todayParts, daysBetween, RELATIONSHIP_START } = require('./dates');
const config = require('./config');

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Versión de los estilos/JS: cambia en cada despliegue para saltarse la caché del navegador.
const ASSET_V = (() => {
  const fs = require('fs'), path = require('path'), crypto = require('crypto');
  const h = crypto.createHash('md5');
  for (const f of ['style.css', 'app.js']) h.update(fs.readFileSync(path.join(__dirname, '..', 'public', f)));
  return h.digest('hex').slice(0, 8);
})();

// ---------- Íconos (trazo, heredan el color del texto) ----------
const svg = (d, size = 16, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
const I = {
  plus: (s = 16) => svg('<path d="M12 5v14M5 12h14"/>', s, ' stroke-width="2.2"'),
  close: (s = 16) => svg('<path d="M6 6l12 12M18 6 6 18"/>', s, ' stroke-width="2.2"'),
  stickerPlus: (s = 22) => svg('<path d="M21 11.5V12a9 9 0 1 1-8.5-9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/><path d="M19 2v6M16 5h6"/>', s),
  arrow: (s = 16) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', s),
  pencil: (s = 14) => svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', s),
  music: (s = 18) => svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', s),
  photo: (s = 18) => svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', s),
  upload: (s = 20) => svg('<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>', s),
  calendar: (s = 16) => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', s),
  check: (s = 14) => svg('<path d="M20 6 9 17l-5-5"/>', s, ' stroke-width="2.4"'),
  back: (s = 16) => svg('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>', s),
  arrow: (s = 18) => svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', s),
  lock: (s = 16) => svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', s),
  send: (s = 18) => svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>', s),
  mail: (s = 32) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s, ' stroke-width="1.6"'),
  mailSend: (s = 20) => svg('<path d="M21 12.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"/><path d="m3 7 9 6 9-6"/><path d="M16 19h6"/><path d="m19 16 3 3-3 3"/>', s, ' stroke-width="1.8"'),
  play: (s = 12) => `<svg class="ico-play" viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
  info: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`,
  alert: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`
};

// Colores por persona (aro del avatar, comillas, canción).
const PERSON = {
  felipe: { tone: 'coral' },
  fernanda: { tone: 'lila' }
};
const tone = (username) => (PERSON[username] || PERSON.felipe).tone;

function avatarUrl(user) {
  return `/avatars/${user.username}.png${user.avatar ? `?v=${encodeURIComponent(user.avatar)}` : ''}`;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDate(sqliteUtc) {
  if (!sqliteUtc) return '';
  const d = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
  const t = todayParts(d);
  return `${t.d} ${MESES[t.m - 1]} ${t.y}`;
}
function isRecent(sqliteUtc, days = 3) {
  if (!sqliteUtc) return false;
  return Date.now() - new Date(sqliteUtc.replace(' ', 'T') + 'Z').getTime() < days * 86400000;
}

// Giro fijo de cada polaroid, calculado del id: siempre el mismo, nunca igual al vecino.
function polaroidRot(id) {
  let r = (((id * 73) % 9) - 4) * 0.7;          // -2.8 … 2.8
  if (Math.abs(r) < 1) r = r < 0 ? -1.4 : 1.4;  // que siempre se note
  return r.toFixed(1);
}

// ---------- Piezas comunes ----------
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=Lora:wght@700&display=swap" rel="stylesheet">`;

const AURORAS = `<div class="aurora a1" aria-hidden="true"></div><div class="aurora a2" aria-hidden="true"></div><div class="aurora a3" aria-hidden="true"></div>`;

function flashBanner({ type, text }) {
  const err = type === 'error';
  return `<div class="flash ${err ? 'flash-error' : 'flash-info'}" role="${err ? 'alert' : 'status'}" id="flash">
  <div class="flash-inner">
    <span class="flash-icon">${err ? I.alert : I.info}</span>
    <span class="flash-text">${esc(text)}</span>
    <button class="flash-close" aria-label="Cerrar aviso" type="button">&times;</button>
  </div>
</div>`;
}

function topbar(user) {
  return `<nav class="topbar">
  <a href="/" class="brand" aria-label="Inicio"><img src="/brand/ff-blanco.svg" alt="F &amp; F"></a>
  <div class="topbar-right">
    <a href="/nuevo" class="btn-grad btn-recuerdo" aria-label="Añadir recuerdo">${I.plus()}<span>Recuerdo</span></a>
    ${user.username === 'felipe' ? `<form method="post" action="/prueba-correo" class="inline" onsubmit="return confirm('Se enviará un correo de prueba solo a Felipe. ¿Enviar?');"><button class="icon-btn" title="Enviar correo de prueba" aria-label="Enviar correo de prueba">${I.mailSend()}</button></form>` : ''}
    <div class="user-menu">
      <button class="avatar-btn" id="avatar-btn" aria-haspopup="true" aria-expanded="false" title="${esc(user.display_name)}">
        <img src="${avatarUrl(user)}" alt="${esc(user.display_name)}">
        <span class="status-dot" title="En línea"></span>
      </button>
      <div class="dropdown" id="user-dropdown" hidden>
        <div class="dropdown-head"><b>${esc(user.display_name)}</b></div>
        <a href="/ajustes">Ajustes</a>
        <form method="post" action="/logout"><button>Cerrar sesión</button></form>
      </div>
    </div>
  </div>
</nav>`;
}

const SIGNATURE = `<footer class="signature">
  <img src="/brand/fernanda-felipe-profundo.svg" alt="Fernanda &amp; Felipe">
  <p>Desde el 24 de noviembre de 2018</p>
</footer>`;

// Página con barra, franja de noche (night) y hoja crema (sheet).
// Entrada del inicio: se decide antes del primer pintado (en el <head>) para que no parpadee.
// Completa la primera vez de la sesión; después, un fundido rápido. Con «reducir movimiento», nada.
// Si el script no corre, no se añade ninguna clase y todo se ve normal.
const ENTRANCE = `<script>(function(){var h=document.documentElement;h.classList.add('js');try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var k='entrada';h.classList.add(sessionStorage.getItem(k)?'enter-quick':'enter-full');sessionStorage.setItem(k,'1')}catch(e){h.classList.add('enter-full')}})()</script>`;

function layout({ title, user, flash, night, sheet, heroSticky = false, bodyClass = '', after = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#120F2A">
<title>${esc(title)}</title>
${FONTS}
<link rel="stylesheet" href="/style.css?v=${ASSET_V}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
${bodyClass === 'home' ? ENTRANCE : ''}
</head>
<body class="${bodyClass}">
${user ? topbar(user) : ''}
${flash ? flashBanner(flash) : ''}
<header class="night${heroSticky ? ' night-sticky' : ''}">
  ${AURORAS}
  <div class="night-inner">${night}</div>
</header>
<div class="sheet">
  <div class="glow g1" aria-hidden="true"></div><div class="glow g2" aria-hidden="true"></div>
  ${sheet}
  ${SIGNATURE}
</div>
${after}
<script src="/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

// Páginas a pantalla completa de noche (entrar, recuperar, nueva contraseña).
function nightPage({ title, content }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#120F2A">
<title>${esc(title)}</title>
${FONTS}
<link rel="stylesheet" href="/style.css?v=${ASSET_V}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
<body class="night-page">
  ${AURORAS}
  <main class="night-center">
    <img class="night-logo" src="/brand/fernanda-felipe-aurora.svg" alt="Fernanda &amp; Felipe">
    ${content}
  </main>
<script src="/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

// ---------- Entrar ----------
function loginPage({ error, username = 'felipe', users = [], next = '/' } = {}) {
  const s = stats();
  const people = users.length ? users : [
    { username: 'felipe', display_name: 'Felipe', avatar: '' },
    { username: 'fernanda', display_name: 'Fernanda', avatar: '' }
  ];
  const content = `
    <p class="night-tagline">Nuestro cofre de recuerdos</p>
    <form method="post" action="/login" class="glass-card stack">
      ${next && next !== '/' ? `<input type="hidden" name="next" value="${esc(next)}">` : ''}
      ${error ? `<p class="form-error">${I.alert}<span>${esc(error)}</span></p>` : ''}
      <fieldset class="who">
        <legend>¿Quién eres?</legend>
        <div class="who-grid">
          ${people.map(p => `
          <label class="who-option tone-${tone(p.username)}">
            <input type="radio" name="username" value="${esc(p.username)}"${p.username === username ? ' checked' : ''}>
            <span class="who-card">
              <img src="${avatarUrl(p)}" alt="">
              <span>${esc(p.display_name)}</span>
            </span>
          </label>`).join('')}
        </div>
      </fieldset>
      <label class="field-dark">Contraseña
        <input type="password" name="password" required autocomplete="current-password" placeholder="••••••••">
      </label>
      <a class="forgot" href="/recuperar">¿Olvidaste tu contraseña?</a>
      <button class="btn-grad btn-block">Abrir el cofre ${I.arrow()}</button>
    </form>
    <p class="night-foot">${s.s_diasRelacion} días juntos y contando</p>`;
  return nightPage({ title: 'F & F · Entrar', content });
}

// ---------- Recuperar contraseña ----------
function recoverPage({ sent = false, error } = {}) {
  const content = sent ? `
    <section class="glass-card stack center">
      <div class="mail-badge" aria-hidden="true">${I.mail()}</div>
      <h1 class="night-h1">Revisa tu correo</h1>
      <p class="night-p">Si ese correo es de uno de nosotros, ya va en camino un enlace para crear tu nueva contraseña. Vence en 1 hora.</p>
      <p class="night-small">¿No llega? Revisa en Promociones o Spam.</p>
      <a class="link-back" href="/login">${I.back()}Volver a entrar</a>
    </section>` : `
    <form method="post" action="/recuperar" class="glass-card stack">
      <div class="stack-tight">
        <h1 class="night-h1">¿Olvidaste tu contraseña?</h1>
        <p class="night-p">Pasa. Escribe tu correo y te mandamos un enlace para crear una nueva.</p>
      </div>
      ${error ? `<p class="form-error">${I.alert}<span>${esc(error)}</span></p>` : ''}
      <label class="field-dark">Tu correo
        <input type="email" name="email" required autocomplete="email" placeholder="tucorreo@gmail.com">
      </label>
      <button class="btn-grad btn-block">Enviar enlace ${I.send()}</button>
      <a class="link-back" href="/login">${I.back()}Volver a entrar</a>
    </form>`;
  return nightPage({ title: 'F & F · Recuperar contraseña', content });
}

function newPasswordPage({ user, token, error, invalid = false }) {
  const content = invalid ? `
    <section class="glass-card stack center">
      <h1 class="night-h1">Este enlace ya no sirve</h1>
      <p class="night-p">Puede que ya se haya usado o que haya pasado más de una hora. Pide uno nuevo y listo.</p>
      <a class="btn-grad btn-block" href="/recuperar">Pedir otro enlace</a>
      <a class="link-back" href="/login">${I.back()}Volver a entrar</a>
    </section>` : `
    <form method="post" action="/nueva-contrasena" class="glass-card stack">
      <input type="hidden" name="t" value="${esc(token)}">
      <div class="hello tone-${tone(user.username)}">
        <img src="${avatarUrl(user)}" alt="">
        <div>
          <h1 class="night-h1">Hola, ${esc(user.display_name)}</h1>
          <p class="night-p">Crea tu nueva contraseña.</p>
        </div>
      </div>
      ${error ? `<p class="form-error">${I.alert}<span>${esc(error)}</span></p>` : ''}
      <label class="field-dark">Nueva contraseña
        <input type="password" name="password" required minlength="8" autocomplete="new-password">
      </label>
      <label class="field-dark">Repítela
        <input type="password" name="password2" required minlength="8" autocomplete="new-password">
      </label>
      <p class="night-small" style="margin-top:-8px">Mínimo 8 caracteres.</p>
      <button class="btn-grad btn-block">Guardar y abrir el cofre ${I.arrow()}</button>
    </form>
    <p class="night-foot">Este enlace funciona una sola vez y vence en 1 hora.</p>`;
  return nightPage({ title: 'F & F · Nueva contraseña', content });
}

// ---------- Inicio ----------
// Luz coral que da la vuelta al borde del pill del contador cada 10 s: una sola línea
// continua (30% del contorno) cuya cola se desvanece. Son 24 tramos pegados, cada uno un
// poco más opaco; app.js ajusta el radio de las esquinas a la altura real del pill.
const PILL_LIGHT = (() => {
  const n = 24, len = 30 / n, over = 0.04;
  const segs = Array.from({ length: n }, (_, i) => {
    const start = i * len, op = Math.pow((i + 1) / n, 1.8);
    const dash = `0 ${start.toFixed(3)} ${(len + over).toFixed(3)} ${(100 - start - len - over).toFixed(3)}`;
    return `<rect x="0" y="0" width="100%" height="100%" rx="19.5" ry="19.5" pathLength="100" stroke-dasharray="${dash}" opacity="${op.toFixed(3)}"/>`;
  }).join('');
  return `<svg class="pill-light" aria-hidden="true" focusable="false">${segs}</svg>`;
})();

function heroBlock(s) {
  const start = Date.UTC(RELATIONSHIP_START.y, RELATIONSHIP_START.m - 1, RELATIONSHIP_START.d, 8, 0, 0);
  return `
<div class="hero-card">
  <div class="hero-main">
    <p class="hero-seven" aria-label="${s.s_añosNoviazgo} años de relación">${s.s_añosNoviazgo}</p>
    <p class="hero-years">años de relación</p>
    <p class="hero-since">Desde el 24 de noviembre de 2018</p>
    <p class="hero-counter"><span id="live-counter" data-start="${start}">${s.s_añosNoviazgo} años juntos</span>${PILL_LIGHT}</p>
  </div>
  <div class="hero-side">
    <p class="hero-side-title">Esos ${s.s_añosNoviazgo} años son…</p>
    <div class="stats">
      <div><b>${s.s_diasRelacion}</b><span>días juntos</span></div>
      <div><b>${s.s_horasJuntos}</b><span>horas lado a lado</span></div>
      <div><b>${s.s_lunasLlenas}</b><span>lunas llenas</span></div>
      <div><b>${s.s_añosMatrimonio}</b><span>de ellos, casados</span></div>
    </div>
    <div class="milestone">
      <div class="milestone-row"><span>Camino a nuestro <b>${s.s_hitoN}º aniversario</b></span><span>faltan ${s.s_diasHito} días</span></div>
      <div class="milestone-bar" role="progressbar" aria-valuenow="${s.progresoHito}" aria-valuemin="0" aria-valuemax="100" aria-label="Camino al ${s.s_hitoN}º aniversario"><div style="width: ${s.progresoHito}%"></div></div>
      <div class="milestone-ends"><span>${RELATIONSHIP_START.y}</span><span>${s.hitoAño}</span></div>
    </div>
  </div>
</div>`;
}

function personHead(m, own) {
  return `<div class="mem-head tone-${tone(m.username)}">
      <img src="${avatarUrl({ username: m.username, avatar: m.avatar })}" alt="Foto de ${esc(m.display_name)}" data-zoom data-caption="${esc(m.display_name)}" tabindex="0" role="button">
      <div class="mem-who"><p>${esc(m.display_name)}</p><p>${own ? 'Tu recuerdo' : 'Su recuerdo'}</p></div>
      ${m.badge || ''}
    </div>`;
}

// Canción del recuerdo: el chip abre debajo un reproductor con un fragmento de 30 s
// (catálogo de Apple, ver lib/preview.js). La maqueta está en el lienzo del rediseño.
function songChip(m) {
  if (!m.song && !m.song_url) return '';
  const label = esc(m.song || 'Nuestra canción');
  const t = tone(m.username);
  const { fresh } = require('./preview');
  const p = fresh(m);
  const src = p && p.url ? ` data-src="${esc(p.url)}"` : '';
  // Alturas de la onda: siempre las mismas para cada recuerdo.
  let seed = m.id * 9301 + 49297;
  const bars = Array.from({ length: 28 }, () => { seed = (seed * 9301 + 49297) % 233280; return 6 + Math.round((seed / 233280) * 20); });
  const credit = p && p.url
    ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.artist)} – ${esc(p.track)} · Apple Music</a>`
    : '';
  return `<button type="button" class="song-chip tone-${t}" data-player="${m.id}" aria-expanded="false" aria-controls="player-${m.id}">
      <span class="play">${I.play()}</span><span class="song-label">${label}</span>
      <svg class="chev" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <div class="player tone-${t}" id="player-${m.id}" data-id="${m.id}"${src} hidden>
      <div class="player-row">
        <button type="button" class="player-btn" aria-label="Reproducir el fragmento">${I.play(16)}<svg class="ico-pause" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg><span class="spin" aria-hidden="true"></span></button>
        <div class="player-main">
          <div class="wave" aria-hidden="true">${bars.map(h => `<span style="height:${h}px"></span>`).join('')}</div>
          <div class="player-meta"><span class="player-title">Un pedacito de la canción</span><span class="player-time">0:00 / 0:30</span></div>
        </div>
      </div>
      <p class="player-foot"><span class="player-credit">${credit}</span>${m.song_url ? `<a class="player-full" href="${esc(m.song_url)}" target="_blank" rel="noopener">Escuchar completa ↗</a>` : ''}</p>
      <p class="player-none" hidden>No encontramos un pedacito de esta canción.</p>
    </div>`;
}

// secret: el propio recuerdo antes de la revelación (el otro aún no lo puede ver).
// cover: tapa de la animación de revelación (solo la primera vez que se abre el año).
// ---------- Stickers ----------
const STICKER_CHOICES = ['❤️', '😂', '🥹', '🔥', '✨', '🥂', '🌙', '🫶'];
const shortDate = (sqliteUtc) => fmtDate(sqliteUtc).replace(/ \d{4}$/, '');

// Un sticker pegado en la polaroid. El mío (en la foto del otro) se despega al tocarlo;
// el del otro (en mi foto) muestra «Por Fernanda · 26 nov». Uno que no he visto entra con golpe.
function stickerHtml(st, user) {
  const mine = st.user_id === user.id;
  if (mine) return `<button type="button" class="stk stk-s${st.slot} stk-mine" data-stk-id="${st.id}" aria-label="Tu sticker ${esc(st.emoji)}. Tócalo para despegarlo">${esc(st.emoji)}</button>`;
  const tip = `Por ${esc(st.by_name)} · ${shortDate(st.created_at)}`;
  return `<button type="button" class="stk stk-s${st.slot}${st.seen_at ? '' : ' stk-new'}" data-stk-id="${st.id}" data-tip="${tip}" aria-label="Sticker ${esc(st.emoji)}. ${tip}">${esc(st.emoji)}</button>`;
}

function stickerTray(m, count) {
  return `<div class="stk-tray" data-stk-tray="${m.id}" hidden>
      <div class="stk-choices">
        ${STICKER_CHOICES.map(e => `<button type="button" data-emoji="${e}" aria-label="Pegar ${e}">${e}</button>`).join('')}
        <input type="text" class="stk-more" data-stk-input maxlength="16" autocomplete="off" placeholder="+" aria-label="Otro emoji (abre el teclado de emojis)">
      </div>
      <p class="stk-hint" data-stk-hint>${count === 1 ? 'Te queda 1' : 'Te quedan 2'} · Toca uno tuyo para quitarlo</p>
    </div>`;
}

function writtenCard(m, user, side, { secret = false, cover = false, stickers = [], canStick = false } = {}) {
  const own = user.id === m.user_id;
  const canEdit = own && m.edits_used === 0;
  const badge = secret ? `<span class="badge-new badge-secret">${I.lock(12)}Solo tú lo ves por ahora</span>`
    : isRecent(m.updated_at) ? '<span class="badge-new">Nuevo</span>' : '';
  const coverHtml = cover ? `<div class="reveal-cover" aria-hidden="true">
      <div class="lock-badge">${I.lock(26)}</div>
      <p class="sealed-title">${esc(m.display_name)} guardó su recuerdo</p>
      <p class="sealed-text">Ya pueden abrirse los dos.</p>
    </div>` : '';
  const stk = m.photo ? stickers.map(st => stickerHtml(st, user)).join('') : '';
  const addBtn = canStick ? `<button type="button" class="stk-add" data-stk-add="${m.id}" aria-expanded="false" aria-label="Pegar un sticker en la foto de ${esc(m.display_name)}"${stickers.length >= 2 ? ' hidden' : ''}>${I.stickerPlus()}</button>` : '';
  return `<article class="mem mem-written${badge ? ' mem-fresh' : ''}${cover ? ' mem-covered' : ''} tone-${tone(m.username)}" id="recuerdo-${m.id}">${coverHtml}
    ${personHead({ ...m, badge }, own)}
    ${m.photo ? `<figure class="polaroid pol-${side}" style="--rot: ${polaroidRot(m.id)}deg"><img src="/fotos/${esc(m.photo)}" alt="Foto del recuerdo de ${esc(m.display_name)}" loading="lazy" data-zoom data-caption="${m.year} · ${esc(m.display_name)}" tabindex="0" role="button"><figcaption>${m.year}</figcaption>${stk}${addBtn}</figure>` : ''}
    ${canStick ? stickerTray(m, 2 - stickers.length) : ''}
    <p class="mem-quote"><span aria-hidden="true">“</span>${esc(m.body)}<span aria-hidden="true">”</span></p>
    ${songChip(m)}
    <div class="mem-foot">
      <span>Guardado el ${fmtDate(m.updated_at)}</span>
      ${canEdit ? `<a class="btn-soft" href="/editar/${m.id}">${I.pencil()}Corregir</a>` : ''}
    </div>
  </article>`;
}

// El recuerdo del otro antes de la revelación. Secreto real: aquí no llega nada de su
// contenido (ni texto, ni foto, ni canción); lo borroso de fondo es un dibujo genérico.
function sealedCard(m, year) {
  const { FALLBACK_FROM } = require('./reveal');
  return `<article class="mem mem-sealed tone-${tone(m.username)}">
    ${personHead(m, false)}
    <div class="sealed-ghost" aria-hidden="true"><div></div><span></span><span></span><span></span><span></span></div>
    <div class="sealed-cover">
      <div class="lock-badge" aria-hidden="true">${I.lock(26)}</div>
      <p class="sealed-title">${esc(m.display_name)} ya guardó su recuerdo</p>
      <p class="sealed-text">Se revela cuando guardes el tuyo.</p>
      ${year >= FALLBACK_FROM ? '<p class="sealed-note">o el 1 de enero, lo que pase primero</p>' : ''}
    </div>
  </article>`;
}

// otherName: la otra persona ya guardó el suyo (está sellado esperando el tuyo).
function promptCard(m, year, href, hasDraft, otherName = null) {
  const hint = otherName ? `${esc(otherName)} ya guardó el suyo. En cuanto guardes el tuyo, se abren los dos.`
    : hasDraft ? 'Tienes un borrador guardado. Retómalo cuando quieras.'
      : 'Una escena, un viaje, una tontería que todavía los hace reír. Tu yo del futuro lo va a agradecer.';
  return `<article class="mem mem-prompt tone-${tone(m.username)}">
    ${personHead(m, true)}
    <p class="mem-question">¿Cuál fue tu momento favorito de ${year}?</p>
    <p class="mem-hint">${hint}</p>
    <a class="btn-grad" href="${href}">${hasDraft ? I.pencil(16) + 'Seguir escribiendo' : I.plus() + 'Añadir recuerdo'}</a>
  </article>`;
}

// mine: yo ya guardé el mío (se abren los dos cuando el otro guarde). missed: el año cerró sin el suyo.
function waitingCard(m, deadline, { mine = false, missed = false } = {}) {
  if (missed) return `<article class="mem mem-waiting tone-${tone(m.username)}">
    ${personHead(m, false)}
    <div class="waiting"><p>Este año no guardó el suyo.</p></div>
  </article>`;
  const note = [mine ? 'Cuando lo guarde, se abren los dos.' : '', deadline ? 'Tiene hasta el 31 de diciembre.' : ''].filter(Boolean);
  return `<article class="mem mem-waiting tone-${tone(m.username)}">
    ${personHead(m, false)}
    <div class="waiting">
      <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
      <p>Esperando su recuerdo…</p>
      ${note.length ? `<p class="waiting-note">${note.join('<br>')}</p>` : ''}
    </div>
  </article>`;
}

// Pantalla «Abrir el cofre»: la primera vez que cada quien entra después de que un año se abrió.
function revealOverlay(year, writers, users) {
  const both = writers.length >= 2;
  const av = (name) => avatarUrl(users.find(u => u.username === name) || { username: name });
  return `<div class="reveal" id="reveal" data-year="${year}" hidden>
  <div class="aurora a1" aria-hidden="true"></div><div class="aurora a2" aria-hidden="true"></div>
  <div class="reveal-box" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
    <div class="reveal-pair" aria-hidden="true">
      <img class="tone-coral" src="${av('felipe')}" alt="">
      <span>&amp;</span>
      <img class="tone-lila" src="${av('fernanda')}" alt="">
    </div>
    <p class="reveal-eyebrow">${both ? 'Los dos ya guardaron el suyo' : 'Llegó el 1 de enero'}</p>
    <h2 id="reveal-title">${both ? `Sus recuerdos de ${year} están listos` : `El cofre de ${year} ya se abrió`}</h2>
    <p class="reveal-lead">${both ? 'Ninguno ha visto el del otro. Ábranlos cuando quieran, juntos o cada quien por su lado.'
      : `${esc(writers[0].display_name)} guardó su momento favorito del año y ya pueden verlo los dos.`}</p>
    <button type="button" class="btn-grad" id="reveal-open">Abrir el cofre</button>
  </div>
</div>`;
}

function homePage({ user, byYear, users, drafts = new Set(), flash }) {
  const s = stats();
  const t = todayParts();
  const windowOpen = creationWindowOpen();
  const R = require('./reveal');

  // Años a mostrar: los que tienen recuerdos y, con la ventana abierta, el actual.
  const years = new Map(byYear);
  if (windowOpen && !years.has(t.y)) years.set(t.y, []);
  const ordered = [...years.keys()].sort((a, b) => b - a);

  const byName = Object.fromEntries(users.map(u => [u.username, u]));
  const left = byName.felipe, right = byName.fernanda;

  // Animación de apertura pendiente para este usuario (el año abierto más reciente que no ha visto).
  const unseen = R.unseenReveals(user.id)[0] || null;

  // Stickers de todas las fotos (solo se pintan en tarjetas visibles) y aviso de los que no he visto.
  const STK = require('./stickers');
  const stkByMem = STK.forMemories([...years.values()].flat().filter(m => !m.is_placeholder).map(m => m.id));
  const newStk = STK.unseenFor(user.id);

  const sections = ordered.map(year => {
    const mems = years.get(year) || [];
    const real = mems.filter(m => !m.is_placeholder);
    const revealed = R.isRevealed(year, { writers: [...new Set(real.map(m => m.user_id))], today: t });
    const animate = !!unseen && unseen.year === year;
    const isCurrentOpen = windowOpen && year === t.y;
    const closed = year >= R.FALLBACK_FROM && t.y > year;
    const iWrote = real.some(m => m.user_id === user.id);
    const cols = [left, right].map((person, i) => {
      const side = i === 0 ? 'left' : 'right';
      const m = mems.find(x => x.user_id === person.id);
      const base = { username: person.username, display_name: person.display_name, avatar: person.avatar, user_id: person.id };
      const mine = person.id === user.id;
      if (m && !m.is_placeholder) {
        if (mine || revealed) return writtenCard(m, user, side, {
          secret: mine && !revealed, cover: animate,
          stickers: stkByMem.get(m.id) || [], canStick: !mine && revealed && !!m.photo
        });
        return sealedCard(base, year); // del otro, aún sellado: su contenido no sale del servidor
      }
      const other = real.find(x => x.user_id !== user.id);
      const otherName = !revealed && other ? (users.find(u => u.id === other.user_id) || {}).display_name : null;
      if (mine) {
        if (m) return promptCard(base, year, `/editar/${m.id}`, drafts.has(`mem-${m.id}`), otherName);
        if (isCurrentOpen) return promptCard(base, year, '/nuevo', drafts.has(`nuevo-${year}`), otherName);
      }
      if (!m && closed) return waitingCard(base, false, { missed: true });
      return waitingCard(base, isCurrentOpen, { mine: !mine && iWrote && !revealed });
    });
    const done = real.length;
    const info = revealed ? R.revealInfo(year) : null;
    const justOpened = info && info.reason !== 'inicial' && fmtDate(info.revealed_at) === `${t.d} ${MESES[t.m - 1]} ${t.y}`;
    const openedPill = animate || justOpened
      ? `<span class="pill pill-verde"${animate ? ' data-reveal-pill hidden' : ''}>Revelados hoy</span>` : '';
    return `
  <section class="year${animate ? ' year-reveal' : ''}"${animate ? ` id="revelacion" data-reveal-year="${year}"` : ''}>
    <div class="year-head">
      <h2>${year}</h2>
      <span class="pill pill-lila">Nuestro ${year - RELATIONSHIP_START.y}º año</span>
      ${done < 2 && !(closed && revealed) ? `<span class="pill pill-durazno">Por completar · ${done} de 2</span>` : ''}
      ${openedPill}
      <div class="year-line" aria-hidden="true"></div>
    </div>
    <div class="year-grid">${cols.join('')}</div>
  </section>`;
  }).join('');

  let windowPill;
  if (windowOpen) {
    const d = daysBetween(t, { y: t.y, m: 12, d: 31 });
    const quedan = d === 0 ? 'hoy es el último día' : d === 1 ? 'queda 1 día' : `quedan ${d} días`;
    windowPill = `El cofre de ${t.y} está abierto hasta el 31 de diciembre · <b>${quedan}</b>`;
  } else {
    const d = daysBetween(t, { y: t.y, m: 11, d: 24 });
    windowPill = `El cofre de ${t.y} se abre ${d === 1 ? '<b>mañana</b>' : `en <b>${d} días</b>`} · 24 nov – 31 dic`;
  }

  const sheet = `
<main class="cofre">
  <header class="cofre-head">
    <p class="eyebrow">El corazón de todo</p>
    <h1>Cofre de Recuerdos</h1>
    <p class="cofre-sub">Cada año, cada quien guarda su momento favorito. Lo vamos llenando juntos, recuerdo por recuerdo.</p>
    <p class="glass-pill">${I.calendar()}<span>${windowPill}</span></p>
  </header>
  ${sections || '<p class="empty">Aún no hay recuerdos.</p>'}
</main>`;

  let after = '';
  if (unseen) {
    const ys = years.get(unseen.year) || [];
    const writers = users.filter(u => ys.some(m => m.user_id === u.id && !m.is_placeholder));
    if (writers.length) after = revealOverlay(unseen.year, writers, users);
  }
  let notice = '';
  if (newStk.length) {
    const first = newStk[0], by = users.find(u => u.username === first.by_username) || {};
    const sameYear = newStk.every(x => x.year === first.year);
    const text = newStk.length === 1 ? `${esc(first.by_name)} te dejó un sticker en <b>${first.year}</b>`
      : `${esc(first.by_name)} te dejó ${newStk.length} stickers${sameYear ? ` en <b>${first.year}</b>` : ''}`;
    notice = `<div class="stk-notice-row"><a class="stk-notice" href="#recuerdo-${first.memory_id}">
      <span class="stk-notice-face tone-${tone(first.by_username)}"><img src="${avatarUrl(by)}" alt=""><span aria-hidden="true">${esc(first.emoji)}</span></span>
      <span>${text}</span>${I.arrow()}</a></div>`;
  }
  return layout({ title: 'F & F · Aniversario', user, flash, night: notice + heroBlock(s), sheet, heroSticky: true, bodyClass: 'home', after });
}

// ---------- Escribir / corregir ----------
function memoryForm({ user, mem, year, draft, values, error }) {
  const mode = !mem ? 'nuevo' : mem.is_placeholder ? 'pendiente' : 'corregir';
  const y = mem ? mem.year : year;
  const target = mem ? `mem-${mem.id}` : `nuevo-${y}`;
  // values = lo que se acaba de enviar (si hubo error); draft = borrador guardado.
  if (values) draft = null;
  const src = values || draft;
  const val = {
    body: src ? src.body : (mode === 'corregir' ? mem.body : ''),
    song: src ? src.song : (mem ? mem.song : ''),
    song_url: src ? src.song_url : (mem ? mem.song_url : '')
  };
  const existingPhoto = mem && mem.photo ? `/fotos/${mem.photo}` : '';
  const songOpen = !!(val.song || val.song_url);
  const photoOpen = !!existingPhoto;
  const heading = mode === 'corregir' ? 'Ajusta lo que haga falta' : '¿Cuál fue tu momento favorito?';
  const sub = mode === 'corregir'
    ? 'Puedes cambiar el texto, la canción o la foto.'
    : 'No tiene que ser el mejor viaje ni el día más especial. Puede ser algo pequeño que todavía te haga sonreír.';
  const cta = mode === 'corregir' ? 'Guardar corrección' : 'Guardar en el cofre';
  const foot = mode === 'corregir' ? 'Después de esto ya no se podrá editar.' : 'Después podrás corregirlo una vez.';
  const action = mem ? `/editar/${mem.id}` : '/nuevo';

  const night = `
<div class="write-head">
  <div>
    <h1>${heading}</h1>
    <p>${sub}</p>
  </div>
  <p class="write-year" aria-label="Año ${y}">${y}</p>
</div>`;

  const sheet = `
<main class="write" id="write" data-target="${esc(target)}" data-year="${y}">
  <form class="write-form" id="write-form" method="post" action="${action}" enctype="multipart/form-data">
    ${mode === 'corregir' ? `<p class="note-warn">${I.alert}<span>Esta es tu única corrección de este recuerdo. Revísalo con calma antes de guardar.</span></p>` : ''}
    ${error ? `<p class="note-error">${I.alert}<span>${esc(error)}</span></p>` : ''}

    <label class="write-label" for="body">Tu recuerdo</label>
    <textarea id="body" name="body" rows="5" maxlength="1000" required placeholder="Empieza por donde quieras: dónde estaban, qué pasó, qué sentiste…">${esc(val.body)}</textarea>
    <div class="write-meta">
      <span class="draft-status" id="draft-status"${draft ? '' : ' hidden'}>${I.check()}<span>${draft ? `Borrador recuperado · ${fmtDate(draft.updated_at)}` : 'Borrador guardado'}</span></span>
      <span class="counter"><span id="count">${[...val.body].length}</span> / 1000</span>
    </div>

    <div class="extras">
      <div class="extra" id="extra-photo" data-open="${photoOpen}">
        <div class="extra-head">
          <span class="extra-icon">${I.photo()}</span>
          <span class="extra-title">Una foto de ese momento <span><i class="dot">· </i>opcional</span></span>
          <button type="button" class="extra-toggle" data-toggle="photo" aria-expanded="${photoOpen}" aria-label="${photoOpen ? 'Quitar la foto' : 'Añadir una foto'}">${I.plus()}${I.close()}</button>
        </div>
        <div class="extra-body">
          <input type="file" id="photo-input" name="photo" accept="image/jpeg,image/png,image/webp,image/heic" hidden>
          <input type="hidden" name="remove_photo" id="remove-photo" value="0">
          <button type="button" class="drop" id="photo-drop"${existingPhoto ? ' hidden' : ''}>${I.upload()}<span>Arrastra una foto o elige una</span><small>· hasta 10 MB</small></button>
          <div class="photo-preview" id="photo-preview"${existingPhoto ? '' : ' hidden'}>
            <img id="photo-img" src="${esc(existingPhoto)}" alt="Vista previa de la foto">
            <div class="photo-actions">
              <button type="button" id="photo-replace">Reemplazar</button>
              <button type="button" id="photo-remove" class="dark">Quitar</button>
            </div>
          </div>
        </div>
      </div>
      <div class="extra" id="extra-song" data-open="${songOpen}">
        <div class="extra-head">
          <span class="extra-icon">${I.music()}</span>
          <span class="extra-title">La canción de ese momento <span><i class="dot">· </i>opcional</span></span>
          <button type="button" class="extra-toggle" data-toggle="song" aria-expanded="${songOpen}" aria-label="${songOpen ? 'Quitar la canción' : 'Añadir una canción'}">${I.plus()}${I.close()}</button>
        </div>
        <div class="extra-body song-fields">
          <label>Artista – canción
            <input type="text" id="song" name="song" maxlength="200" value="${esc(val.song)}" placeholder="Vance Joy – Riptide">
          </label>
          <label>Enlace (Spotify o YouTube)
            <input type="url" id="song_url" name="song_url" maxlength="500" value="${esc(val.song_url)}" placeholder="https://open.spotify.com/…">
          </label>
        </div>
      </div>
    </div>

    <div class="write-actions">
      <button class="btn-grad" type="submit">${cta}</button>
      <button type="button" class="btn-text" id="later" hidden>Lo termino después</button>
      <a class="btn-text" id="cancel" href="/">Cancelar</a>
    </div>
    <p class="write-foot">${foot}</p>
  </form>

  <aside class="preview" aria-live="polite">
    <div>
      <p class="preview-title" id="pv-title">Así se verá tu recuerdo</p>
      <p class="preview-sub">Así lo verás en nuestro cofre${user.username === 'felipe' ? ', junto al de Fernanda' : ', junto al de Felipe'}.</p>
    </div>
    <article class="mem mem-written mem-fresh tone-${tone(user.username)}">
      <div class="mem-head tone-${tone(user.username)}">
        <img src="${avatarUrl(user)}" alt="">
        <div class="mem-who"><p>${esc(user.display_name)}</p><p>Tu recuerdo · ${y}</p></div>
      </div>
      <figure class="polaroid pol-center" id="pv-photo" style="--rot: -2deg"${existingPhoto ? '' : ' hidden'}><img id="pv-photo-img" src="${esc(existingPhoto)}" alt=""><figcaption>${y}</figcaption></figure>
      <p class="mem-quote" id="pv-quote"><span aria-hidden="true">“</span><span id="pv-text">Tu historia aparecerá aquí. Empieza a contarla…</span><span aria-hidden="true">”</span></p>
      <p class="song-chip tone-${tone(user.username)}" id="pv-song" hidden><span class="play">${I.play()}</span><span id="pv-song-text"></span></p>
    </article>
  </aside>
</main>

<div class="modal" id="leave-modal" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="leave-title">
    <p class="modal-title" id="leave-title">¿Lo dejas para después?</p>
    <p class="modal-text">Tu borrador ya está guardado. Cuando vuelvas, lo encontrarás tal como lo dejaste.</p>
    <p class="modal-note">La foto no se guarda en el borrador: vuelve a elegirla al terminar.</p>
    <div class="modal-actions">
      <button type="button" class="btn-grad" id="leave-stay">Seguir escribiendo</button>
      <a class="btn-muted" href="/" id="leave-go">Salir</a>
    </div>
    <button type="button" class="btn-link" id="leave-discard">Descartar borrador</button>
  </div>
</div>`;

  return layout({ title: `F & F · ${mode === 'corregir' ? 'Corregir recuerdo' : `Recuerdo de ${y}`}`, user, night, sheet, bodyClass: 'write-page' });
}

// ---------- Otras ----------
function closedPage(user) {
  const t = todayParts();
  const d = daysBetween(t, { y: t.y, m: 11, d: 24 });
  const night = `<div class="simple-head"><h1>El cofre de ${t.y} todavía está cerrado</h1>
    <p>Los recuerdos nuevos se escriben del 24 de noviembre al 31 de diciembre.</p></div>`;
  const sheet = `<main class="simple">
    <div class="soft-card center">
      <p class="big-serif">${d === 1 ? 'Abre mañana' : `Abre en ${d} días`}</p>
      <p class="muted">Mientras, puedes completar los recuerdos que tengas pendientes de otros años.</p>
      <a class="btn-grad" href="/">Volver al cofre</a>
    </div>
  </main>`;
  return layout({ title: 'F & F · Cofre cerrado', user, night, sheet });
}

function settingsPage({ user, error }) {
  const night = `<div class="simple-head"><h1>Ajustes</h1><p>Tu nombre y tu foto en el cofre.</p></div>`;
  const sheet = `<main class="simple">
  <form class="soft-card stack" method="post" action="/ajustes" enctype="multipart/form-data">
    ${error ? `<p class="note-error">${I.alert}<span>${esc(error)}</span></p>` : ''}
    <div class="avatar-edit tone-${tone(user.username)}">
      <img src="${avatarUrl(user)}" alt="Tu avatar" id="avatar-preview">
      <label class="btn-soft file-btn">Cambiar foto
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" id="avatar-input" hidden>
      </label>
    </div>
    <p class="muted small">Se recorta en círculo automáticamente. También se usa en el correo de aniversario.</p>
    <label class="field">Nombre
      <input type="text" name="display_name" maxlength="30" required value="${esc(user.display_name)}">
    </label>
    <div class="row">
      <button class="btn-grad" type="submit">Guardar</button>
      <a class="btn-text" href="/">Cancelar</a>
    </div>
  </form>
</main>`;
  return layout({ title: 'F & F · Ajustes', user, night, sheet });
}

module.exports = {
  layout, loginPage, recoverPage, newPasswordPage, homePage, memoryForm, closedPage, settingsPage,
  avatarUrl, esc, polaroidRot
};
