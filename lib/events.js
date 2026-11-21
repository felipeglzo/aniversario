// Números del cofre: solo lo necesario para saber si la app se usa sola, sin espiar.
// Se anota, como máximo, UNA vez por día por persona y por cosa (nada de horas exactas,
// ni qué leyó, ni cuánto tiempo estuvo). Todo es visible para los dos en /numeros.
//   visita   (ref: movil | compu)                      entró ese día
//   correo   (ref: aniversario | recordatorio | revelacion)  llegó desde el botón de un correo
//   foto     (ref: id del recuerdo)                    abrió una foto en grande
//   cancion  (ref: id del recuerdo)                    escuchó un fragmento
const db = require('./db');
const { todayParts } = require('./dates');

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT '',
  day TEXT NOT NULL,                         -- fecha local (Vancouver), YYYY-MM-DD
  UNIQUE (user_id, kind, ref, day)
);`);

const KINDS = new Set(['visita', 'correo', 'foto', 'cancion']);
const EMAILS = new Set(['aniversario', 'recordatorio', 'revelacion']);

function today() {
  const t = todayParts();
  return `${t.y}-${String(t.m).padStart(2, '0')}-${String(t.d).padStart(2, '0')}`;
}

function record(userId, kind, ref = '') {
  if (!userId || !KINDS.has(kind)) return;
  ref = String(ref).slice(0, 24);
  if (kind === 'correo' && !EMAILS.has(ref)) return;
  if ((kind === 'foto' || kind === 'cancion') && !/^\d+$/.test(ref)) return;
  try { db.prepare('INSERT OR IGNORE INTO events (user_id, kind, ref, day) VALUES (?, ?, ?, ?)').run(userId, kind, ref, today()); } catch (_) { /* nunca rompe la página */ }
}

const isMobile = (ua) => /Mobi|Android|iPhone|iPad/i.test(String(ua || ''));

module.exports = { record, isMobile, today, EMAILS };
