// Contador en vivo del hero: "7 años, 361 días, 14:05:09 y contando".
(function () {
  const el = document.getElementById('live-counter');
  if (!el) return;
  const start = Number(el.dataset.start); // 24 nov 2018, 00:00 en Vancouver (epoch ms)
  const s0 = new Date(start);
  function tick() {
    const now = Date.now();
    // Años completos de calendario: último 24 de noviembre que ya pasó.
    let years = new Date(now).getUTCFullYear() - s0.getUTCFullYear();
    const anniv = y => Date.UTC(s0.getUTCFullYear() + y, s0.getUTCMonth(), s0.getUTCDate(), s0.getUTCHours());
    if (anniv(years) > now) years -= 1;
    let s = Math.floor((now - anniv(years)) / 1000);
    const days = Math.floor(s / 86400); s -= days * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const p = n => String(n).padStart(2, '0');
    el.textContent = `${years} años, ${days} ${days === 1 ? 'día' : 'días'}, ${p(h)}:${p(m)}:${p(s)} y contando`;
  }
  tick();
  setInterval(tick, 1000);
})();

// Cifras del hero: cada dígito gira como un rodillo hasta su número (una vez por visita).
(function () {
  const nums = [...document.querySelectorAll('.stats b')];
  if (!nums.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (sessionStorage.getItem('rodillos')) return; sessionStorage.setItem('rodillos', '1'); } catch (_) { /* sin almacenamiento: anima siempre */ }
  nums.forEach((el, ci) => {
    const value = el.textContent.trim();
    el.setAttribute('aria-label', value);
    el.textContent = '';
    let di = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) { const s = document.createElement('span'); s.textContent = ch; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); continue; }
      const col = document.createElement('span'); col.className = 'odo-col'; col.setAttribute('aria-hidden', 'true');
      const strip = document.createElement('span'); strip.className = 'odo-strip';
      const loops = 2 + di, target = Number(ch);
      for (let l = 0; l < loops; l++) for (let d = 0; d < 10; d++) strip.appendChild(Object.assign(document.createElement('span'), { textContent: d }));
      for (let d = 0; d <= target; d++) strip.appendChild(Object.assign(document.createElement('span'), { textContent: d }));
      col.appendChild(strip); el.appendChild(col);
      const steps = loops * 10 + target, delay = 250 + ci * 120 + di * 90, dur = 1.3 + di * 0.18;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        strip.style.transition = `transform ${dur}s cubic-bezier(.16,1,.3,1) ${delay}ms`;
        strip.style.transform = `translateY(-${steps * 1.15}em)`;
      }));
      di++;
    }
  });
})();

// Inicio: la barra empieza transparente y se funde a vidrio oscuro cuando el cofre se acerca.
(function () {
  if (!document.body.classList.contains('home')) return;
  const bar = document.querySelector('.topbar');
  const sheet = document.querySelector('.sheet');
  if (!bar || !sheet) return;
  let queued = false;
  function update() {
    queued = false;
    const fade = window.innerWidth < 760 ? 200 : 260;   // distancia en la que se funde
    const dist = sheet.getBoundingClientRect().top - bar.offsetHeight;
    const t = Math.max(0, Math.min(1, 1 - dist / fade));
    const e = t * t * (3 - 2 * t);                        // suave al entrar y al salir
    bar.style.setProperty('--p', e.toFixed(3));
  }
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  update();
})();

// Canción del recuerdo: el chip abre el reproductor y suena un fragmento de 30 s.
// Un solo <audio> para toda la página: al tocar otra canción se detiene la anterior.
(function () {
  const chips = document.querySelectorAll('[data-player]');
  if (!chips.length) return;
  const audio = new Audio();
  audio.preload = 'none';
  // Audio en silencio para "desbloquear" la reproducción en el iPhone dentro del toque.
  const SILENCE = 'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
  let current = null;                       // .player que está sonando
  const fmt = s => '0:' + String(Math.max(0, Math.floor(s))).padStart(2, '0');

  function paint(player, t) {
    const bars = player.querySelectorAll('.wave span');
    const frac = Math.min(1, t / 30);
    bars.forEach((b, i) => b.classList.toggle('on', (i + 0.5) / bars.length <= frac));
    player.querySelector('.player-time').textContent = fmt(t) + ' / 0:30';
  }
  function stop(player, reset) {
    if (!player) return;
    player.classList.remove('playing', 'loading');
    player.querySelector('.player-btn').setAttribute('aria-label', 'Reproducir el fragmento');
    if (reset) paint(player, 0);
  }
  async function source(player) {
    if (player.dataset.src) return player.dataset.src;
    const r = await fetch('/fragmento/' + player.dataset.id);
    if (!r.ok) return null;
    const p = await r.json();
    player.dataset.src = p.url;
    const credit = player.querySelector('.player-credit');
    if (p.link && !credit.firstChild) {
      const a = document.createElement('a');
      a.href = p.link; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = `${p.artist} – ${p.track} · Apple Music`;
      credit.appendChild(a);
    }
    return p.url;
  }
  async function play(player) {
    if (current && current !== player) { audio.pause(); stop(current, true); }
    current = player;
    // Dentro del toque: desbloquea el audio (iPhone) antes de esperar a la red.
    if (!player.dataset.src) { audio.src = SILENCE; audio.play().catch(() => {}); }
    player.classList.add('loading');
    let url = null;
    try { url = await source(player); } catch (_) { url = null; }
    if (current !== player) return;
    if (!url) { player.classList.remove('loading'); player.classList.add('none'); player.querySelector('.player-none').hidden = false; current = null; return; }
    if (audio.src !== url) audio.src = url;
    try { await audio.play(); } catch (_) { stop(player); return; }
    player.classList.remove('loading'); player.classList.add('playing');
    player.querySelector('.player-btn').setAttribute('aria-label', 'Pausar el fragmento');
  }

  audio.addEventListener('timeupdate', () => { if (current && current.dataset.src && audio.src === current.dataset.src) paint(current, audio.currentTime); });
  audio.addEventListener('ended', () => { stop(current, true); current = null; });

  chips.forEach(chip => {
    const player = document.getElementById('player-' + chip.dataset.player);
    chip.addEventListener('click', () => {
      const open = chip.getAttribute('aria-expanded') === 'true';
      chip.setAttribute('aria-expanded', String(!open));
      player.hidden = open;
      if (open) { if (current === player) { audio.pause(); stop(player, true); current = null; } }
      else play(player);                         // abrir = empezar a sonar
    });
    player.querySelector('.player-btn').addEventListener('click', () => {
      if (current === player && player.classList.contains('playing')) { audio.pause(); stop(player); }
      else if (current === player && audio.src === player.dataset.src && audio.currentTime > 0) {
        audio.play().then(() => { player.classList.add('playing'); player.querySelector('.player-btn').setAttribute('aria-label', 'Pausar el fragmento'); }).catch(() => {});
      } else play(player);
    });
  });
})();

// Menú de usuario (avatar → dropdown).
(function () {
  const btn = document.getElementById('avatar-btn');
  const dd = document.getElementById('user-dropdown');
  if (!btn || !dd) return;
  const close = () => { dd.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => {
    e.stopPropagation();
    dd.hidden = !dd.hidden;
    btn.setAttribute('aria-expanded', String(!dd.hidden));
  });
  document.addEventListener('click', e => { if (!dd.contains(e.target)) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

// Vista previa del avatar en Ajustes antes de guardar.
(function () {
  const input = document.getElementById('avatar-input');
  const img = document.getElementById('avatar-preview');
  if (!input || !img) return;
  input.addEventListener('change', () => {
    const f = input.files && input.files[0];
    if (f) img.src = URL.createObjectURL(f);
  });
})();

// Avisos: se cierran con la ✕ o solos (los de info a los 6 s); limpia la URL.
(function () {
  const f = document.getElementById('flash');
  if (!f) return;
  if (location.search) history.replaceState(null, '', location.pathname);
  const close = () => { f.classList.add('hide'); setTimeout(() => f.remove(), 300); };
  f.querySelector('.flash-close').addEventListener('click', close);
  if (f.classList.contains('flash-info')) setTimeout(close, 6000);
})();

// Fotos en grande (polaroids y fotos de perfil del cofre): se abren encima de la página.
// Celular: pellizcar para zoom, arrastrar para mover, deslizar hacia abajo para cerrar.
// Compu: rueda o doble clic para acercar, arrastrar para mover, Esc para cerrar.
(function () {
  const items = () => [...document.querySelectorAll('img[data-zoom]')];
  if (!items().length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Foto en grande');
  box.innerHTML = '<button type="button" class="lb-close" aria-label="Cerrar">&times;</button>' +
    '<div class="lb-stage"><img class="lb-img" alt=""></div>' +
    '<p class="lb-caption"></p>';
  document.body.appendChild(box);
  const stage = box.querySelector('.lb-stage');
  const img = box.querySelector('.lb-img');
  const caption = box.querySelector('.lb-caption');
  const closeBtn = box.querySelector('.lb-close');
  let s = 1, tx = 0, ty = 0, source = null, lastFocus = null;
  const MAX = 5;
  const pointers = new Map();
  let gesture = null, lastTap = 0;

  const center = () => { const r = stage.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  function clamp() {
    const c = center();
    const w = img.offsetWidth * s, h = img.offsetHeight * s;
    const lx = Math.max(0, (w - Math.min(img.offsetWidth, c.w)) / 2, (w - c.w) / 2);
    const ly = Math.max(0, (h - Math.min(img.offsetHeight, c.h)) / 2, (h - c.h) / 2);
    tx = Math.max(-lx, Math.min(lx, tx));
    ty = Math.max(-ly, Math.min(ly, ty));
  }
  function apply(animate) {
    img.style.transition = animate ? 'transform .25s ease' : 'none';
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    box.classList.toggle('zoomed', s > 1.01);
  }
  // Acerca/aleja manteniendo fijo el punto (px, py) de la pantalla.
  function zoomAt(ns, px, py, animate) {
    ns = Math.max(1, Math.min(MAX, ns));
    const c = center();
    const ux = (px - c.x - tx) / s, uy = (py - c.y - ty) / s;
    s = ns; tx = px - c.x - ux * s; ty = py - c.y - uy * s;
    if (s === 1) { tx = 0; ty = 0; }
    clamp(); apply(animate);
  }

  function open(el) {
    source = el; lastFocus = document.activeElement;
    s = 1; tx = 0; ty = 0; apply(false);
    img.src = el.currentSrc || el.src;
    img.alt = el.alt || '';
    caption.textContent = el.dataset.caption || '';
    box.classList.toggle('lb-avatar', !el.closest('.polaroid'));
    box.hidden = false;
    document.documentElement.classList.add('lb-open');
    const pol = el.closest('.polaroid'); if (pol) pol.classList.add('straight');
    requestAnimationFrame(() => box.classList.add('show'));
    closeBtn.focus({ preventScroll: true });
  }
  function close() {
    if (box.hidden) return;
    box.classList.remove('show');
    const pol = source && source.closest('.polaroid'); if (pol) pol.classList.remove('straight');
    document.documentElement.classList.remove('lb-open');
    setTimeout(() => { box.hidden = true; img.removeAttribute('src'); img.style.opacity = ''; box.style.background = ''; }, 200);
    pointers.clear(); gesture = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('img[data-zoom]');
    if (el) { e.preventDefault(); open(el); }
  });
  document.addEventListener('keydown', e => {
    if (!box.hidden && e.key === 'Escape') close();
    const el = e.target.closest && e.target.closest('img[data-zoom]');
    if (el && box.hidden && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(el); }
  });
  closeBtn.addEventListener('click', close);
  img.addEventListener('dragstart', e => e.preventDefault());

  // Rueda (compu)
  box.addEventListener('wheel', e => {
    e.preventDefault();
    zoomAt(s * Math.exp(-e.deltaY * 0.0022), e.clientX, e.clientY, false);
  }, { passive: false });
  // Doble clic (compu)
  img.addEventListener('dblclick', e => { zoomAt(s > 1.01 ? 1 : 2.5, e.clientX, e.clientY, true); });

  // Dedos y mouse: pellizcar, mover, doble toque, deslizar para cerrar.
  box.addEventListener('pointerdown', e => {
    if (e.target === closeBtn) return;
    box.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    if (pts.length === 2) {
      const [a, b] = pts;
      gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, s0: s, tx0: tx, ty0: ty };
    } else if (pts.length === 1) {
      gesture = { type: 'pan', x0: e.clientX, y0: e.clientY, tx0: tx, ty0: ty, moved: false, onImg: e.target === img, t: Date.now() };
    }
  });
  box.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    if (gesture.type === 'pinch' && pts.length === 2) {
      const [a, b] = pts;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const c = center();
      const ns = Math.max(1, Math.min(MAX, gesture.s0 * d / gesture.d0));
      const ux = (gesture.mid0.x - c.x - gesture.tx0) / gesture.s0, uy = (gesture.mid0.y - c.y - gesture.ty0) / gesture.s0;
      s = ns; tx = mid.x - c.x - ux * s; ty = mid.y - c.y - uy * s;
      clamp(); apply(false);
    } else if (gesture.type === 'pan') {
      const dx = e.clientX - gesture.x0, dy = e.clientY - gesture.y0;
      if (Math.abs(dx) + Math.abs(dy) > 6) gesture.moved = true;
      if (s > 1.01) { tx = gesture.tx0 + dx; ty = gesture.ty0 + dy; clamp(); apply(false); }
      else if (e.pointerType !== 'mouse' && dy > 0) {   // deslizar hacia abajo para cerrar
        ty = dy; apply(false);
        img.style.opacity = String(Math.max(0.3, 1 - dy / 400));
        box.style.background = `rgba(18,15,42,${Math.max(0.3, 0.94 - dy / 500)})`;
      }
    }
  });
  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (!gesture) return;
    if (gesture.type === 'pinch') {
      if (pointers.size === 1) {        // queda un dedo: sigue moviendo desde aquí
        const p = [...pointers.values()][0];
        gesture = { type: 'pan', x0: p.x, y0: p.y, tx0: tx, ty0: ty, moved: true };
      } else gesture = null;
      if (s < 1.05) { s = 1; tx = 0; ty = 0; apply(true); }
      return;
    }
    const g = gesture; gesture = null;
    if (s <= 1.01 && ty > 110 && e.pointerType !== 'mouse') { close(); return; }
    if (s <= 1.01 && ty !== 0) { ty = 0; img.style.opacity = ''; box.style.background = ''; apply(true); }
    if (!g.moved) {
      const now = Date.now();
      if (e.pointerType !== 'mouse' && g.onImg && now - lastTap < 300) {   // doble toque
        zoomAt(s > 1.01 ? 1 : 2.5, e.clientX, e.clientY, true); lastTap = 0; return;
      }
      lastTap = now;
      if (!g.onImg && s <= 1.01) close();   // toque fuera de la foto
    }
  }
  box.addEventListener('pointerup', endPointer);
  box.addEventListener('pointercancel', endPointer);
  window.addEventListener('resize', () => { if (!box.hidden) { clamp(); apply(false); } });
})();

// ---------- Pantalla de escribir ----------
(function () {
  const root = document.getElementById('write');
  if (!root) return;
  const form = document.getElementById('write-form');
  const target = root.dataset.target;
  const ta = document.getElementById('body');
  const count = document.getElementById('count');
  const song = document.getElementById('song');
  const songUrl = document.getElementById('song_url');
  const status = document.getElementById('draft-status');
  const statusText = status.querySelector('span');
  const later = document.getElementById('later');
  const cancel = document.getElementById('cancel');
  const MAX = 1000;

  // Vista previa
  const pvTitle = document.getElementById('pv-title');
  const pvText = document.getElementById('pv-text');
  const pvQuote = document.getElementById('pv-quote');
  const pvSong = document.getElementById('pv-song');
  const pvSongText = document.getElementById('pv-song-text');
  const pvPhoto = document.getElementById('pv-photo');
  const pvPhotoImg = document.getElementById('pv-photo-img');

  // Foto
  const photoInput = document.getElementById('photo-input');
  const removePhoto = document.getElementById('remove-photo');
  const drop = document.getElementById('photo-drop');
  const photoPreview = document.getElementById('photo-preview');
  const photoImg = document.getElementById('photo-img');
  const existingPhoto = photoImg.getAttribute('src') || '';
  let hasPhoto = !!existingPhoto;
  let newPhotoChosen = false;

  const len = s => [...s].length;
  const snapshot = () => JSON.stringify({ body: ta.value, song: song.value, song_url: songUrl.value });
  const initial = snapshot();
  const hadDraft = !status.hidden;

  // El textarea crece con el texto (field-sizing donde exista; si no, a mano).
  const autoGrow = () => {
    if (CSS.supports && CSS.supports('field-sizing', 'content')) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(200, ta.scrollHeight + 4) + 'px';
  };

  function render() {
    const text = ta.value.trim();
    const n = len(ta.value);
    count.textContent = n;
    count.parentElement.classList.toggle('near', n > MAX - 50);
    pvText.textContent = text || 'Tu historia aparecerá aquí. Empieza a contarla…';
    pvQuote.classList.toggle('empty-text', !text);
    const songLabel = song.value.trim() || (songUrl.value.trim() ? 'Escúchala aquí' : '');
    pvSong.hidden = !songLabel;
    pvSongText.textContent = songLabel;
    pvPhoto.hidden = !hasPhoto;
    pvTitle.textContent = (len(text) > 40 && (songLabel || hasPhoto))
      ? 'Una pequeña parte de nuestra historia'
      : text ? 'Tu recuerdo está tomando forma' : 'Así se verá tu recuerdo';
    const hasContent = !!(text || songLabel) && (hadDraft || snapshot() !== initial);
    later.hidden = !hasContent;
    cancel.hidden = hasContent;
  }

  // ---- Borrador automático (texto y canción; la foto no se guarda) ----
  let saved = snapshot();
  let timer = null;
  function setStatus(kind, text) {
    status.hidden = false;
    status.classList.toggle('saving', kind === 'saving');
    status.classList.toggle('failed', kind === 'failed');
    statusText.textContent = text;
  }
  async function saveDraft() {
    clearTimeout(timer); timer = null;
    const snap = snapshot();
    if (snap === saved) return;
    setStatus('saving', 'Guardando borrador…');
    try {
      const r = await fetch('/borrador', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, ...JSON.parse(snap) })
      });
      if (!r.ok) throw new Error(r.status);
      saved = snap;
      setStatus('ok', 'Borrador guardado automáticamente');
    } catch (_) {
      setStatus('failed', 'No se pudo guardar el borrador. Reintentando…');
      timer = setTimeout(saveDraft, 5000);
    }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(saveDraft, 1200); };

  [ta, song, songUrl].forEach(el => el.addEventListener('input', () => { render(); autoGrow(); schedule(); }));

  // ---- Filas opcionales (foto / canción) ----
  function setOpen(which, open) {
    const box = document.getElementById(`extra-${which}`);
    const btn = box.querySelector('.extra-toggle');
    box.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? (which === 'photo' ? 'Quitar la foto' : 'Quitar la canción') : (which === 'photo' ? 'Añadir una foto' : 'Añadir una canción'));
  }
  document.querySelectorAll('.extra-toggle').forEach(btn => btn.addEventListener('click', () => {
    const which = btn.dataset.toggle;
    const open = document.getElementById(`extra-${which}`).dataset.open === 'true';
    if (open) {
      if (which === 'photo') clearPhoto();
      else { song.value = ''; songUrl.value = ''; schedule(); }
      setOpen(which, false);
    } else {
      setOpen(which, true);
      if (which === 'song') song.focus();
      else if (!hasPhoto) photoInput.click();
    }
    render();
  }));

  function showPhoto(url) {
    photoImg.src = url; pvPhotoImg.src = url;
    photoPreview.hidden = false; drop.hidden = true;
    hasPhoto = true;
    render();
  }
  function clearPhoto() {
    photoInput.value = '';
    newPhotoChosen = false;
    if (existingPhoto) removePhoto.value = '1';
    photoImg.removeAttribute('src'); pvPhotoImg.removeAttribute('src');
    photoPreview.hidden = true; drop.hidden = false;
    hasPhoto = false;
    render();
  }
  function useFile(f) {
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) { alert('Ese archivo no parece una foto.'); return; }
    if (f.size > 10 * 1024 * 1024) { alert('La foto pesa más de 10 MB. Prueba con una más ligera.'); photoInput.value = ''; return; }
    newPhotoChosen = true;
    removePhoto.value = '0';
    setOpen('photo', true);
    showPhoto(URL.createObjectURL(f));
  }
  photoInput.addEventListener('change', () => useFile(photoInput.files && photoInput.files[0]));
  drop.addEventListener('click', () => photoInput.click());
  document.getElementById('photo-replace').addEventListener('click', () => photoInput.click());
  document.getElementById('photo-remove').addEventListener('click', clearPhoto);
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    const dt = new DataTransfer(); dt.items.add(f);
    photoInput.files = dt.files;
    useFile(f);
  });

  // ---- Salir ----
  const modal = document.getElementById('leave-modal');
  let submitting = false;
  const openModal = () => { saveDraft(); modal.hidden = false; document.getElementById('leave-stay').focus(); };
  const closeModal = () => { modal.hidden = true; };
  later.addEventListener('click', openModal);
  document.getElementById('leave-stay').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  document.getElementById('leave-go').addEventListener('click', () => { submitting = true; });
  document.getElementById('leave-discard').addEventListener('click', async () => {
    if (!confirm('¿Descartar el borrador? Lo que escribiste se borrará.')) return;
    clearTimeout(timer);
    submitting = true;
    try {
      await fetch('/borrador/descartar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target }) });
    } catch (_) { /* si falla, el borrador se queda; no pasa nada grave */ }
    location.href = '/';
  });

  form.addEventListener('submit', e => {
    if (!ta.value.trim()) { e.preventDefault(); ta.focus(); return; }
    submitting = true;
    clearTimeout(timer);
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Guardando…';
  });

  // Al cerrar la pestaña: guarda lo pendiente; avisa si hay una foto nueva sin guardar.
  window.addEventListener('pagehide', () => {
    if (submitting || snapshot() === saved) return;
    navigator.sendBeacon('/borrador', new Blob([JSON.stringify({ target, ...JSON.parse(snapshot()) })], { type: 'application/json' }));
  });
  window.addEventListener('beforeunload', e => {
    if (submitting) return;
    if (newPhotoChosen) { e.preventDefault(); e.returnValue = ''; }
  });

  render();
  autoGrow();
})();
