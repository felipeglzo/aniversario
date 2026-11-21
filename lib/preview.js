// Fragmentos de 30 s de las canciones de los recuerdos.
// Se buscan en el catálogo público de Apple (iTunes Search API: sin cuenta ni llave)
// con el "Artista – Canción" que escribieron; si solo hay enlace, con el título que
// dan Spotify o YouTube. El resultado se guarda en memories.preview (JSON) y se
// vuelve a buscar cada 7 días o si cambia la canción. Las condiciones de Apple piden
// mostrar el fragmento junto a un enlace a la canción en Apple Music: va en la tarjeta.
const db = require('./db');

const TTL = 7 * 24 * 3600 * 1000;
const COUNTRIES = ['US', 'MX'];

async function getJSON(url, ms = 4000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'aniversario/1.0' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(timer); }
}

// Artista y canción exactos a partir del enlace.
//  Spotify: la página pública trae <meta og:description "Artista · Canción · Song · 2017">.
//  YouTube: el título del video por oEmbed (suele ser "Artista - Canción (…)").
async function infoFromUrl(url) {
  if (!url) return null;
  try {
    if (/open\.spotify\.com\/(intl-[a-z]+\/)?track\//.test(url)) {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 5000);
      let html = '';
      try {
        const r = await fetch(url.split('?')[0], { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (aniversario)' } });
        html = r.ok ? await r.text() : '';
      } finally { clearTimeout(timer); }
      const meta = (name) => {
        const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`, 'i'));
        return m ? m[1].replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"') : '';
      };
      const parts = meta('og:description').split(' · ');
      const title = meta('og:title') || parts[1] || '';
      const artist = (meta('music:musician_description') || parts[0] || '').split(',')[0].trim();
      if (title && artist) return { artist, title };
      if (title) return { term: title };
    }
    if (/(youtube\.com|youtu\.be)\//.test(url)) {
      const t = String((await getJSON(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`)).title || '');
      return { term: t.replace(/\(.*?\)|\[.*?\]/g, ' ').trim() };
    }
  } catch (_) { /* sin datos del enlace: se usa lo que escribieron */ }
  return null;
}

// Palabras comparables: minúsculas, sin acentos ni signos.
const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter(Boolean);

// Elige, entre los primeros resultados, el que comparte más palabras con lo que escribieron
// (artista y canción, en cualquier orden): "Silent Running - Gorillaz" → Gorillaz, no otro "Silent Running".
const BAD = new Set(['remix', 'mix', 'live', 'version', 'edit', 'acoustic', 'acustica', 'instrumental', 'karaoke', 'cover', 'sped', 'slowed', 'demo', 'en', 'vivo', 'reverb']);
function best(results, term) {
  const want = [...new Set(words(term))];
  let top = null, topScore = -1;
  results.forEach((r, i) => {
    if (!r.previewUrl) return;
    const have = new Set(words(`${r.artistName} ${r.trackName}`));
    const hits = want.filter(w => have.has(w)).length;
    // Lo que sobra en el nombre resta: poco si es "feat. …" o "remastered", mucho si es otra versión.
    const name = String(r.trackName).replace(/[([]?\b(feat|ft|with|con)\b\.?[^)\]]*[)\]]?/ig, ' ');
    const extra = words(name).filter(w => !want.includes(w));
    const penalty = extra.reduce((a, w) => a + (BAD.has(w) ? 6 : /^remaster/.test(w) ? 0 : 1), 0);
    const score = hits * 10 - penalty - i * 0.1;
    if (score > topScore) { top = r; topScore = score; }
  });
  // Al menos la mitad de las palabras deben coincidir; si no, mejor no inventar.
  return top && topScore >= (want.length - 1) * 10 - 2 ? top : null;
}

async function searchText(term) {
  const q = words(term).join(' ');
  if (!q) return null;
  for (const country of COUNTRIES) {
    const data = await getJSON(`https://itunes.apple.com/search?media=music&entity=song&limit=10&country=${country}&term=${encodeURIComponent(q)}`);
    const t = best(data.results || [], term);
    if (t) return t;
  }
  return null;
}

// Nombre de la canción sin "feat." ni "(Remastered)", para comparar.
const cleanTitle = (t) => words(String(t).replace(/[([][^)\]]*[)\]]/g, ' ').replace(/\b(feat|ft)\b\.?.*$/i, ' '));
const sameWords = (a, b) => a.length && a.length === b.length && a.every(w => b.includes(w));

// Con artista y canción conocidos: solo vale si coinciden los dos (mejor nada que otra canción).
function exact(results, artist, title) {
  const aw = words(artist), tw = cleanTitle(title);
  const ok = (results || []).filter(r => r.previewUrl
    && aw.every(w => words(r.artistName).includes(w))
    && sameWords(cleanTitle(r.trackName), tw));
  // Prefiere la versión original (sin "live", "remix", etc. en el nombre).
  ok.sort((x, y) => words(x.trackName).filter(w => BAD.has(w)).length - words(y.trackName).filter(w => BAD.has(w)).length);
  return ok[0] || null;
}

async function searchExact(artist, title) {
  for (const country of COUNTRIES) {
    const data = await getJSON(`https://itunes.apple.com/search?media=music&entity=song&limit=25&country=${country}&term=${encodeURIComponent(words(artist + ' ' + title).join(' '))}`);
    const t = exact(data.results, artist, title);
    if (t) return t;
  }
  // La búsqueda general no siempre la trae: se buscan las canciones del artista.
  for (const country of COUNTRIES) {
    const arts = await getJSON(`https://itunes.apple.com/search?media=music&entity=musicArtist&limit=5&country=${country}&term=${encodeURIComponent(words(artist).join(' '))}`);
    const a = (arts.results || []).find(x => sameWords(words(x.artistName), words(artist)));
    if (!a) continue;
    const songs = await getJSON(`https://itunes.apple.com/lookup?id=${a.artistId}&entity=song&limit=200&country=${country}`);
    const t = exact((songs.results || []).filter(x => x.wrapperType === 'track'), artist, title);
    if (t) return t;
  }
  return null;
}

// Lo que escribieron puede ser "Artista – Canción" o "Canción – Artista": se prueban los dos órdenes.
function splitText(text) {
  const parts = String(text || '').split(/\s+[–—-]\s+/).map(x => x.trim()).filter(Boolean);
  return parts.length === 2 ? [{ artist: parts[0], title: parts[1] }, { artist: parts[1], title: parts[0] }] : [];
}

async function findTrack(mem) {
  const info = await infoFromUrl(mem.song_url);
  let t = null;
  if (info && info.artist) t = await searchExact(info.artist, info.title);
  else {
    for (const c of splitText(mem.song)) { t = await searchExact(c.artist, c.title); if (t) break; }
    if (!t) t = await searchText(mem.song || (info && info.term) || '');
  }
  return t ? { url: t.previewUrl, track: t.trackName, artist: t.artistName, link: t.trackViewUrl } : null;
}

const termOf = (mem) => (mem.song || '').trim();
function cached(mem) {
  try { return JSON.parse(mem.preview || 'null'); } catch (_) { return null; }
}
// Lo guardado, si sigue vigente para esta canción (sin ir a internet).
function fresh(mem) {
  const c = cached(mem);
  if (!c || c.v !== 3 || c.song !== termOf(mem) || c.songUrl !== (mem.song_url || '') || Date.now() - c.at > TTL) return null;
  return c;
}

async function previewFor(mem) {
  const hit = fresh(mem);
  if (hit) return hit;
  let found = null;
  try {
    found = await findTrack(mem);
  } catch (err) {
    console.error('Fragmento: no se pudo buscar:', err.message);
    const old = cached(mem);
    if (old && old.url) return old;          // sin internet: usa lo último que hubo
    return { none: true, temp: true };
  }
  const rec = { ...(found || { none: true }), v: 3, song: termOf(mem), songUrl: mem.song_url || '', at: Date.now() };
  db.prepare('UPDATE memories SET preview = ? WHERE id = ?').run(JSON.stringify(rec), mem.id);
  return rec;
}

module.exports = { previewFor, fresh };
