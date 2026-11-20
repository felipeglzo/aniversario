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

// Polaroids: con mouse se enderezan al pasar encima (CSS); con el dedo, al tocarlas.
(function () {
  const touch = window.matchMedia('(hover: none)').matches;
  if (!touch) return;
  document.addEventListener('click', e => {
    const p = e.target.closest('.polaroid');
    document.querySelectorAll('.polaroid.straight').forEach(x => { if (x !== p) x.classList.remove('straight'); });
    if (p) p.classList.toggle('straight');
  });
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
