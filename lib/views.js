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
  pencil: (s = 14) => svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>', s),
  music: (s = 18) => svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', s),
  photo: (s = 18) => svg('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>', s),
  upload: (s = 20) => svg('<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>', s),
  calendar: (s = 16) => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>', s),
  check: (s = 14) => svg('<path d="M20 6 9 17l-5-5"/>', s, ' stroke-width="2.4"'),
  back: (s = 16) => svg('<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>', s),
  arrow: (s = 18) => svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', s),
  send: (s = 18) => svg('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/>', s),
  mail: (s = 32) => svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', s, ' stroke-width="1.6"'),
  mailSend: (s = 20) => svg('<path d="M21 12.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"/><path d="m3 7 9 6 9-6"/><path d="M16 19h6"/><path d="m19 16 3 3-3 3"/>', s, ' stroke-width="1.8"'),
  play: (s = 12) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`,
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
function layout({ title, user, flash, night, sheet, heroSticky = false, bodyClass = '' }) {
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
function heroBlock(s) {
  const start = Date.UTC(RELATIONSHIP_START.y, RELATIONSHIP_START.m - 1, RELATIONSHIP_START.d, 8, 0, 0);
  return `
<div class="hero-card">
  <div class="hero-main">
    <p class="hero-seven" aria-label="${s.s_añosNoviazgo} años de relación">${s.s_añosNoviazgo}</p>
    <p class="hero-years">años de relación</p>
    <p class="hero-since">Desde el 24 de noviembre de 2018</p>
    <p class="hero-counter" id="live-counter" data-start="${start}">${s.s_añosNoviazgo} años juntos</p>
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

function songChip(m) {
  if (!m.song && !m.song_url) return '';
  const label = esc(m.song || 'Escúchala aquí');
  return m.song_url
    ? `<a class="song-chip tone-${tone(m.username)}" href="${esc(m.song_url)}" target="_blank" rel="noopener"><span class="play">${I.play()}</span>${label}</a>`
    : `<p class="song-chip tone-${tone(m.username)}"><span class="play">${I.music(12)}</span>${label}</p>`;
}

function writtenCard(m, user, side) {
  const own = user.id === m.user_id;
  const canEdit = own && m.edits_used === 0;
  const badge = isRecent(m.updated_at) ? '<span class="badge-new">Nuevo</span>' : '';
  return `<article class="mem mem-written${badge ? ' mem-fresh' : ''} tone-${tone(m.username)}">
    ${personHead({ ...m, badge }, own)}
    ${m.photo ? `<figure class="polaroid pol-${side}" style="--rot: ${polaroidRot(m.id)}deg"><img src="/fotos/${esc(m.photo)}" alt="Foto del recuerdo de ${esc(m.display_name)}" loading="lazy" data-zoom data-caption="${m.year} · ${esc(m.display_name)}" tabindex="0" role="button"><figcaption>${m.year}</figcaption></figure>` : ''}
    <p class="mem-quote"><span aria-hidden="true">“</span>${esc(m.body)}<span aria-hidden="true">”</span></p>
    ${songChip(m)}
    <div class="mem-foot">
      <span>Guardado el ${fmtDate(m.updated_at)}${m.edits_used ? ' · corregido' : ''}</span>
      ${canEdit ? `<a class="btn-soft" href="/editar/${m.id}">${I.pencil()}Corregir</a>` : ''}
    </div>
  </article>`;
}

function promptCard(m, year, href, hasDraft) {
  return `<article class="mem mem-prompt tone-${tone(m.username)}">
    ${personHead(m, true)}
    <p class="mem-question">¿Cuál fue tu momento favorito de ${year}?</p>
    <p class="mem-hint">${hasDraft ? 'Tienes un borrador guardado. Retómalo cuando quieras.' : 'Una escena, un viaje, una tontería que todavía los hace reír. Tu yo del futuro lo va a agradecer.'}</p>
    <a class="btn-grad" href="${href}">${hasDraft ? I.pencil(16) + 'Seguir escribiendo' : I.plus() + 'Añadir recuerdo'}</a>
  </article>`;
}

function waitingCard(m, deadline) {
  return `<article class="mem mem-waiting tone-${tone(m.username)}">
    ${personHead(m, false)}
    <div class="waiting">
      <div class="dots" aria-hidden="true"><span></span><span></span><span></span></div>
      <p>Esperando su recuerdo…</p>
      ${deadline ? '<p class="waiting-note">Tiene hasta el 31 de diciembre</p>' : ''}
    </div>
  </article>`;
}

function homePage({ user, byYear, users, drafts = new Set(), flash }) {
  const s = stats();
  const t = todayParts();
  const windowOpen = creationWindowOpen();

  // Años a mostrar: los que tienen recuerdos y, con la ventana abierta, el actual.
  const years = new Map(byYear);
  if (windowOpen && !years.has(t.y)) years.set(t.y, []);
  const ordered = [...years.keys()].sort((a, b) => b - a);

  const byName = Object.fromEntries(users.map(u => [u.username, u]));
  const left = byName.felipe, right = byName.fernanda;

  const sections = ordered.map(year => {
    const mems = years.get(year) || [];
    const cols = [left, right].map((person, i) => {
      const side = i === 0 ? 'left' : 'right';
      const m = mems.find(x => x.user_id === person.id);
      const base = { username: person.username, display_name: person.display_name, avatar: person.avatar, user_id: person.id };
      if (m && !m.is_placeholder) return writtenCard(m, user, side);
      const isCurrentOpen = windowOpen && year === t.y;
      if (person.id === user.id) {
        if (m) return promptCard(base, year, `/editar/${m.id}`, drafts.has(`mem-${m.id}`));
        if (isCurrentOpen) return promptCard(base, year, '/nuevo', drafts.has(`nuevo-${year}`));
      }
      return waitingCard(base, isCurrentOpen);
    });
    const done = mems.filter(m => !m.is_placeholder).length;
    return `
  <section class="year">
    <div class="year-head">
      <h2>${year}</h2>
      <span class="pill pill-lila">Nuestro ${year - RELATIONSHIP_START.y}º año</span>
      ${done < 2 ? `<span class="pill pill-durazno">Por completar · ${done} de 2</span>` : ''}
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

  return layout({ title: 'F & F · Aniversario', user, flash, night: heroBlock(s), sheet, heroSticky: true, bodyClass: 'home' });
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
