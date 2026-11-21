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

// Título de la canción a partir del enlace (Spotify/YouTube dan uno público con oEmbed).
async function titleFromUrl(url) {
  if (!url) return '';
  let endpoint = '';
  if (/open\.spotify\.com\//.test(url)) endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  else if (/(youtube\.com|youtu\.be)\//.test(url)) endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  if (!endpoint) return '';
  try { return String((await getJSON(endpoint)).title || '').replace(/\(official.*?\)|\[official.*?\]/ig, '').trim(); }
  catch (_) { return ''; }
}

async function searchApple(term) {
  // "Vance Joy – Riptide" → "Vance Joy Riptide"
  const q = term.replace(/[–—\-·|]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  for (const country of COUNTRIES) {
    const url = `https://itunes.apple.com/search?media=music&entity=song&limit=1&country=${country}&term=${encodeURIComponent(q)}`;
    const data = await getJSON(url);
    const t = (data.results || []).find(x => x.previewUrl);
    if (t) return { url: t.previewUrl, track: t.trackName, artist: t.artistName, link: t.trackViewUrl };
  }
  return null;
}

const termOf = (mem) => (mem.song || '').trim();
function cached(mem) {
  try { return JSON.parse(mem.preview || 'null'); } catch (_) { return null; }
}
// Lo guardado, si sigue vigente para esta canción (sin ir a internet).
function fresh(mem) {
  const c = cached(mem);
  if (!c || c.song !== termOf(mem) || c.songUrl !== (mem.song_url || '') || Date.now() - c.at > TTL) return null;
  return c;
}

async function previewFor(mem) {
  const hit = fresh(mem);
  if (hit) return hit;
  let found = null;
  try {
    const term = termOf(mem) || await titleFromUrl(mem.song_url);
    found = term ? await searchApple(term) : null;
  } catch (err) {
    console.error('Fragmento: no se pudo buscar:', err.message);
    const old = cached(mem);
    if (old && old.url) return old;          // sin internet: usa lo último que hubo
    return { none: true, temp: true };
  }
  const rec = { ...(found || { none: true }), song: termOf(mem), songUrl: mem.song_url || '', at: Date.now() };
  db.prepare('UPDATE memories SET preview = ? WHERE id = ?').run(JSON.stringify(rec), mem.id);
  return rec;
}

module.exports = { previewFor, fresh };
