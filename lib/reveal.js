// Revelación: el recuerdo de cada quien es secreto hasta que los dos guardaron
// el suyo de ese año. Desde 2026, si uno no escribió, el 1 de enero se abre lo que haya.
// Es un secreto real: lo sellado nunca sale del servidor hacia el navegador del otro
// (ni texto, ni foto, ni canción). Ver views.homePage, /fotos y /fragmento en server.js.
const db = require('./db');
const { todayParts } = require('./dates');

// Años anteriores a este (los precargados 2023–2025) solo se abren con los dos recuerdos.
const FALLBACK_FROM = 2026;

const userCount = () => db.prepare('SELECT COUNT(*) c FROM users').get().c;

function writersOf(year) {
  return db.prepare('SELECT DISTINCT user_id FROM memories WHERE year = ? AND is_placeholder = 0')
    .all(year).map(r => r.user_id);
}

// ¿Ya se abrieron los recuerdos de ese año? (para todos)
function isRevealed(year, { writers = writersOf(year), today = todayParts() } = {}) {
  if (writers.length >= userCount()) return true;
  return year >= FALLBACK_FROM && today.y > year;
}

// ¿Este usuario puede ver este recuerdo? El propio, siempre; el del otro, solo ya revelado.
function canSee(mem, user) {
  if (!mem) return false;
  if (mem.user_id === user.id) return true;
  if (mem.is_placeholder) return false;
  return isRevealed(mem.year);
}

// Anota el año como abierto. Regresa true solo la primera vez (para mandar el correo una vez).
function recordReveal(year, reason) {
  return db.prepare('INSERT OR IGNORE INTO reveals (year, reason) VALUES (?, ?)').run(year, reason).changes > 0;
}

const revealInfo = (year) => db.prepare('SELECT * FROM reveals WHERE year = ?').get(year);

// Años abiertos cuya animación este usuario aún no ve (sin contar los que ya estaban abiertos).
function unseenReveals(userId) {
  return db.prepare(`SELECT r.* FROM reveals r
    WHERE r.reason != 'inicial'
      AND NOT EXISTS (SELECT 1 FROM reveal_seen s WHERE s.user_id = ? AND s.year = r.year)
    ORDER BY r.year DESC`).all(userId);
}

function markSeen(userId, year) {
  db.prepare('INSERT OR IGNORE INTO reveal_seen (user_id, year) VALUES (?, ?)').run(userId, year);
}

// Tras guardar un recuerdo: si con él ya están los dos, el año se abre.
// Regresa el año si es la primera vez que se abre (para mandar el correo).
function afterSave(year) {
  if (writersOf(year).length >= userCount() && recordReveal(year, 'ambos')) return year;
  return null;
}

// Corre a diario: desde 2026, el 1 de enero se abre el año anterior aunque falte uno.
// Regresa los años recién abiertos.
function openOverdue(today = todayParts()) {
  const opened = [];
  for (let y = FALLBACK_FROM; y < today.y; y++) {
    if (revealInfo(y)) continue;
    if (!writersOf(y).length) continue; // nadie escribió: no hay nada que abrir
    if (recordReveal(y, '1-enero')) opened.push(y);
  }
  return opened;
}

module.exports = { FALLBACK_FROM, isRevealed, canSee, writersOf, recordReveal, revealInfo, unseenReveals, markSeen, afterSave, openOverdue };

// Correo «Sus recuerdos de AAAA ya se pueden ver» a los dos. Una sola vez por año (email_log).
async function sendRevealEmail(year) {
  const config = require('./config');
  const { buildRevealEmail } = require('./emailTemplate');
  const { sendEmail } = require('./mailer');
  if (db.prepare("SELECT 1 FROM email_log WHERE kind = 'reveal' AND year = ?").get(year)) return false;
  const writers = db.prepare(`SELECT DISTINCT u.username, u.display_name AS name FROM memories m
    JOIN users u ON u.id = m.user_id WHERE m.year = ? AND m.is_placeholder = 0 ORDER BY u.id`).all(year);
  if (!writers.length) return false;
  const { asunto, htmlBody } = buildRevealEmail({ year, writers });
  const to = [config.MAIL_TO_FELIPE, config.MAIL_TO_FERNANDA].filter(Boolean);
  await sendEmail({ to, subject: asunto, html: htmlBody });
  db.prepare("INSERT OR IGNORE INTO email_log (kind, year, detail) VALUES ('reveal', ?, ?)").run(year, writers.map(w => w.username).join('+'));
  return true;
}

module.exports.sendRevealEmail = sendRevealEmail;
