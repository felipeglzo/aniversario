// Vistas HTML del sitio (sin motor de plantillas: funciones que regresan HTML).
const { stats, creationWindowOpen, RELATIONSHIP_START, WEDDING } = require('./dates');

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function layout({ title, body, user, noNav }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>❤️</text></svg>">
</head>
<body>
${noNav ? '' : `<nav>
  <a href="/" class="brand">F ❤️ F</a>
  <div class="nav-right">
    ${user ? `<span class="who">Hola, ${esc(user.display_name)}</span>
    <a href="/nuevo" class="btn btn-small">+ Recuerdo</a>
    ${user.username === 'felipe' ? `<form method="post" action="/prueba-correo" class="inline"><button class="btn btn-small btn-ghost" title="Manda el correo de aniversario solo a Felipe">📧 Prueba</button></form>` : ''}
    <form method="post" action="/logout" class="inline"><button class="btn btn-small btn-ghost">Salir</button></form>` : ''}
  </div>
</nav>`}
<main>
${body}
</main>
<footer>Desde el 24 de noviembre de 2018 · aniversario.felipeorigel.com</footer>
<script src="/app.js"></script>
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
  return layout({ title: 'Entrar · F❤️F', body, noNav: true });
}

function counterHero(s) {
  return `
<section class="hero card">
  <p class="hero-label">LLEVAMOS</p>
  <div class="hero-years">${s.s_añosNoviazgo}</div>
  <p class="hero-sub">AÑOS DE RELACIÓN</p>
  <div class="live-counter" id="live-counter"
       data-start="${Date.UTC(RELATIONSHIP_START.y, RELATIONSHIP_START.m - 1, RELATIONSHIP_START.d, 8, 0, 0)}"></div>
  <div class="hero-stats">
    <div><b>${s.s_diasRelacion}</b><span>días juntos</span></div>
    <div><b>${s.s_añosMatrimonio}</b><span>años de casados</span></div>
    <div><b>${s.s_lunasLlenas}</b><span>ciclos lunares</span></div>
    <div><b>${s.s_diasHito}</b><span>días para el ${s.s_hitoN}º</span></div>
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
  <img class="avatar" src="/avatars/${m.username}.png" alt="${esc(m.display_name)}">
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
      ${canEdit ? `<a class="edit-link" href="/editar/${m.id}">${pending ? '✍️ Escribir este recuerdo' : '✏️ Corregir (1 vez)'}</a>` : ''}
      ${!pending ? `<time>${esc((m.updated_at || '').slice(0, 10))}</time>` : ''}
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
${flash ? `<p class="flash">${esc(flash)}</p>` : ''}
${counterHero(s)}
${windowOpen
    ? `<section class="cta-strip card"><p>🎉 ¡La ventana está abierta! Escribe tu recuerdo del ${s.currentYear} antes del 31 de diciembre.</p><a class="btn" href="/nuevo">Escribir recuerdo del ${s.currentYear}</a></section>`
    : `<section class="cta-strip card muted-strip"><p>La ventana para nuevos recuerdos se abre cada 24 de noviembre. Mientras, puedes completar o corregir los tuyos.</p></section>`}
<h1 class="section-title">Cofre de Recuerdos</h1>
${years || '<p class="muted">Aún no hay recuerdos.</p>'}`;
  return layout({ title: 'Nuestro Aniversario · F❤️F', body, user });
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
  return layout({ title: `${title} · F❤️F`, body, user });
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
  return layout({ title: 'Ventana cerrada · F❤️F', body, user });
}

function alreadyWrittenPage(user, year) {
  const body = `
<section class="card form-card">
  <h1>Ya guardaste tu recuerdo del ${year} 💾</h1>
  <p>Gracias por escribirle a nuestro yo del futuro. Si necesitas corregirlo, puedes hacerlo una vez desde el cofre.</p>
  <a class="btn" href="/">Volver al cofre</a>
</section>`;
  return layout({ title: 'Recuerdo guardado · F❤️F', body, user });
}

module.exports = { layout, loginPage, homePage, memoryForm, closedPage, alreadyWrittenPage, esc };
