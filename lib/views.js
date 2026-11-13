// Vistas HTML del sitio (sin motor de plantillas: funciones que regresan HTML).
const { stats, creationWindowOpen, RELATIONSHIP_START, WEDDING } = require('./dates');

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Versión de los estilos/JS: cambia en cada despliegue para saltarse la caché del navegador.
const ASSET_V = (() => {
  const fs = require('fs'), path = require('path'), crypto = require('crypto');
  const h = crypto.createHash('md5');
  for (const f of ['style.css', 'app.js']) h.update(fs.readFileSync(path.join(__dirname, '..', 'public', f)));
  return h.digest('hex').slice(0, 8);
})();

const PENCIL_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

const ICON_INFO = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm6.5-.25A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>`;
const ICON_ALERT = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>`;

// Aviso de sistema pegado debajo de la barra (estilo "flash" de GitHub).
function flashBanner({ type, text }) {
  return `<div class="flash flash-${type === 'error' ? 'error' : 'info'}" role="${type === 'error' ? 'alert' : 'status'}" id="flash">
  <div class="flash-inner">
    <span class="flash-icon">${type === 'error' ? ICON_ALERT : ICON_INFO}</span>
    <span class="flash-text">${esc(text)}</span>
    <button class="flash-close" aria-label="Cerrar aviso" type="button">&times;</button>
  </div>
</div>`;
}

// Logo F+F: Fs geométricas de trazo grueso, + de trazo ligero.
const LOGO_SVG = `<svg class="logo" viewBox="0 0 80 28" width="80" height="28" fill="currentColor" aria-hidden="true">
  <rect x="0" y="0" width="7" height="28"/><rect x="0" y="0" width="19" height="7"/><rect x="0" y="11.5" width="15" height="6"/>
  <rect x="31" y="13" width="18" height="2" rx="1"/><rect x="39" y="5" width="2" height="18" rx="1"/>
  <rect x="61" y="0" width="7" height="28"/><rect x="61" y="0" width="19" height="7"/><rect x="61" y="11.5" width="15" height="6"/>
</svg>`;

function avatarUrl(user) {
  return `/avatars/${user.username}.png${user.avatar ? `?v=${encodeURIComponent(user.avatar)}` : ''}`;
}

function layout({ title, body, user, noNav, flash, hero }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/style.css?v=${ASSET_V}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❤️</text></svg>">
</head>
<body>
${noNav ? '' : `<nav>
  <a href="/" class="brand" aria-label="Inicio">${LOGO_SVG}</a>
  <div class="nav-right">
    ${user ? `
    <a href="/nuevo" class="btn btn-small">+ Recuerdo</a>
    ${user.username === 'felipe' ? `<form method="post" action="/prueba-correo" class="inline" onsubmit="return confirm('Se enviará un correo de prueba solo a Felipe. ¿Enviar?');"><button class="icon-btn" title="Enviar correo de prueba" aria-label="Enviar correo de prueba">📩</button></form>` : ''}
    <div class="user-menu">
      <button class="avatar-btn" id="avatar-btn" aria-haspopup="true" aria-expanded="false" title="${esc(user.display_name)}">
        <img src="${avatarUrl(user)}" alt="${esc(user.display_name)}">
        <span class="status-dot" title="En línea"></span>
      </button>
      <div class="dropdown" id="user-dropdown" hidden>
        <div class="dropdown-head">
          <b>${esc(user.display_name)}</b>
        </div>
        <a href="/ajustes">Ajustes</a>
        <form method="post" action="/logout"><button>Cerrar sesión</button></form>
      </div>
    </div>` : ''}
  </div>
</nav>`}
${flash ? flashBanner(flash) : ''}
${hero || ''}
<main>
${body}
</main>
<footer>Desde el 24 de noviembre de 2018 · aniversario.felipeorigel.com</footer>
<script src="/app.js?v=${ASSET_V}"></script>
</body>
</html>`;
}

function loginPage({ error } = {}) {
  const body = `
<section class="card login-card">
  <h1>Nuestro Cofre de Recuerdos</h1>
  <p class="muted">Solo para Felipe y Fernanda. 🤫</p>
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form method="post" action="/login" class="stack">
    <label>¿Quién eres?
      <select name="username" required>
        <option value="felipe">Felipe</option>
        <option value="fernanda">Fernanda</option>
      </select>
    </label>
    <label>Contraseña
      <input type="password" name="password" required autocomplete="current-password">
    </label>
    <button class="btn">Entrar</button>
  </form>
</section>`;
  return layout({ title: 'Entrar · F + F', body, noNav: true });
}

function counterHero(s) {
  return `
<section class="hero">
  <div class="hero-inner">
    <div class="hero-main">
      <p class="hero-label">LLEVAMOS</p>
      <div class="hero-years">${s.s_añosNoviazgo}</div>
      <p class="hero-sub">AÑOS DE RELACIÓN</p>
      <div class="live-counter" id="live-counter"
           data-start="${Date.UTC(RELATIONSHIP_START.y, RELATIONSHIP_START.m - 1, RELATIONSHIP_START.d, 8, 0, 0)}"></div>
    </div>
    <div class="hero-stats">
      <div><b>${s.s_diasRelacion}</b><span>días juntos</span></div>
      <div><b>${s.s_añosMatrimonio}</b><span>años de casados</span></div>
      <div><b>${s.s_lunasLlenas}</b><span>ciclos lunares</span></div>
      <div><b>${s.s_diasHito}</b><span>días para el ${s.s_hitoN}º</span></div>
    </div>
  </div>
</section>`;
}

function memoryCard(m, user) {
  const own = user && m.user_id === user.id;
  const canEdit = own && (m.is_placeholder === 1 || m.edits_used === 0);
  const pending = m.is_placeholder === 1;
  const side = m.user_id === 1 ? 'left' : 'right';
  return `
<article class="memory ${side} ${pending ? 'pending' : ''}">
  <img class="avatar" src="${avatarUrl({ username: m.username, avatar: m.avatar })}" alt="${esc(m.display_name)}">
  <div class="bubble">
    <header>
      <b>${esc(m.display_name)}</b>
      ${m.used_in_email ? `<span class="tag">📧 citado en ${m.used_in_email}</span>` : ''}
      ${pending ? '<span class="tag tag-pending">pendiente</span>' : ''}
    </header>
    <p class="body">${pending && !own ? '🔒 Aún no lo escribe…' : esc(m.body)}</p>
    ${m.song || m.song_url ? `<p class="song">🎵 ${m.song_url ? `<a href="${esc(m.song_url)}" target="_blank" rel="noopener">${esc(m.song || 'Escúchala aquí')}</a>` : esc(m.song)}</p>` : ''}
    ${m.photo ? `<a href="/fotos/${esc(m.photo)}" target="_blank"><img class="photo" src="/fotos/${esc(m.photo)}" alt="Foto del recuerdo" loading="lazy"></a>` : ''}
    <footer>
      ${!pending ? `<time>${esc((m.updated_at || '').slice(0, 10))}</time>` : ''}
      ${canEdit ? `<a class="edit-btn" href="/editar/${m.id}" title="${pending ? 'Escribir este recuerdo' : 'Corregir (solo una vez)'}">${PENCIL_SVG}<span>Editar</span></a>` : ''}
    </footer>
  </div>
</article>`;
}

function homePage({ user, byYear, flash }) {
  const s = stats();
  const windowOpen = creationWindowOpen();
  let years = '';
  for (const [year, mems] of byYear) {
    years += `
<section class="year-block">
  <h2><span class="year-badge">${year}</span></h2>
  <div class="memories">
    ${mems.map(m => memoryCard(m, user)).join('')}
  </div>
</section>`;
  }
  const body = `
${windowOpen
    ? `<section class="cta-strip card"><p>🎉 ¡La ventana está abierta! Escribe tu recuerdo del ${s.currentYear} antes del 31 de diciembre.</p><a class="btn" href="/nuevo">Escribir recuerdo del ${s.currentYear}</a></section>`
    : `<section class="cta-strip card muted-strip"><p>La ventana para nuevos recuerdos se abre cada 24 de noviembre. Mientras, puedes completar o corregir los tuyos.</p></section>`}
<h1 class="section-title">Cofre de Recuerdos</h1>
${years || '<p class="muted">Aún no hay recuerdos.</p>'}`;
  return layout({ title: 'Aniversario F + F', body, user, flash, hero: counterHero(s) });
}

function memoryForm({ user, mem, error, year }) {
  const isEdit = !!mem;
  const title = isEdit
    ? (mem.is_placeholder ? `Escribir recuerdo de ${mem.year}` : `Corregir recuerdo de ${mem.year}`)
    : `Nuevo recuerdo de ${year}`;
  const body = `
<section class="card form-card">
  <h1>${esc(title)}</h1>
  ${isEdit && !mem.is_placeholder ? '<p class="warn">⚠️ Esta es tu única corrección para este recuerdo. Revísalo bien antes de guardar.</p>' : ''}
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form method="post" enctype="multipart/form-data" class="stack">
    <label>Tu recuerdo favorito ✍️
      <textarea name="body" rows="5" maxlength="2000" required
        placeholder="Mi recuerdo favorito de este año fue...">${isEdit && !mem.is_placeholder ? esc(mem.body) : ''}</textarea>
    </label>
    <label>Canción que lo acompaña 🎵 <span class="optional">(opcional)</span>
      <input type="text" name="song" maxlength="200" value="${isEdit ? esc(mem.song) : ''}" placeholder="Artista – Canción">
    </label>
    <label>Enlace de la canción 🔗 <span class="optional">(opcional)</span>
      <input type="url" name="song_url" maxlength="500" value="${isEdit ? esc(mem.song_url) : ''}" placeholder="https://open.spotify.com/...">
    </label>
    <label>Foto 📸 <span class="optional">(opcional, máx 10 MB)</span>
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/heic">
      ${isEdit && mem.photo ? `<span class="muted">Ya tiene foto; si subes otra, la reemplaza.</span>` : ''}
    </label>
    <div class="row">
      <button class="btn">Guardar recuerdo</button>
      <a class="btn btn-ghost" href="/">Cancelar</a>
    </div>
  </form>
</section>`;
  return layout({ title: `${title} · F + F`, body, user });
}

function closedPage(user) {
  const s = stats();
  const body = `
<section class="card form-card">
  <h1>La ventana está cerrada 🗓️</h1>
  <p>Los recuerdos nuevos del año se escriben entre el <b>24 de noviembre</b> y el <b>31 de diciembre</b>.</p>
  <p class="muted">Faltan ${s.s_diasHito} días para el ${s.s_hitoN}º aniversario… pero menos para el próximo 24 de noviembre. 😉</p>
  <a class="btn" href="/">Volver al cofre</a>
</section>`;
  return layout({ title: 'Ventana cerrada · F + F', body, user });
}

function alreadyWrittenPage(user, year) {
  const body = `
<section class="card form-card">
  <h1>Ya guardaste tu recuerdo del ${year} 💾</h1>
  <p>Gracias por escribirle a nuestro yo del futuro. Si necesitas corregirlo, puedes hacerlo una vez desde el cofre.</p>
  <a class="btn" href="/">Volver al cofre</a>
</section>`;
  return layout({ title: 'Recuerdo guardado · F + F', body, user });
}

function settingsPage({ user, error }) {
  const body = `
<section class="card form-card">
  <h1>Ajustes</h1>
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form method="post" action="/ajustes" enctype="multipart/form-data" class="stack">
    <div class="avatar-edit">
      <img src="${avatarUrl(user)}" alt="Tu avatar" id="avatar-preview">
      <label class="btn btn-small btn-ghost file-btn">Cambiar foto
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" id="avatar-input" hidden>
      </label>
    </div>
    <p class="muted small">Se recorta en círculo automáticamente. También se usa en el correo de aniversario.</p>
    <label>Nombre
      <input type="text" name="display_name" maxlength="30" required value="${esc(user.display_name)}">
    </label>
    <div class="row">
      <button class="btn">Guardar</button>
      <a class="btn btn-ghost" href="/">Cancelar</a>
    </div>
  </form>
</section>`;
  return layout({ title: 'Ajustes · F + F', body, user });
}

module.exports = { layout, loginPage, homePage, memoryForm, closedPage, alreadyWrittenPage, settingsPage, avatarUrl, esc };
