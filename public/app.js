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
