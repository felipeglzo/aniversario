// Contador en vivo del hero: años, días, horas, minutos, segundos desde el inicio.
(function () {
  const el = document.getElementById('live-counter');
  if (!el) return;
  const start = Number(el.dataset.start); // epoch ms (24 nov 2018 ~00:00 Vancouver)
  function tick() {
    let s = Math.floor((Date.now() - start) / 1000);
    const years = Math.floor(s / 31557600); s -= years * 31557600; // año juliano promedio
    const days = Math.floor(s / 86400); s -= days * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    el.textContent = `${years} años, ${days} días, ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} juntos ❤️`;
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
