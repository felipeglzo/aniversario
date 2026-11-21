// Stickers: emojis que cada quien pega en la foto del otro (máximo 2 por foto).
// Solo en recuerdos ya revelados, con foto, y nunca en el propio.
const db = require('./db');
const reveal = require('./reveal');

const MAX = 2;
const SLOTS = [0, 1];

// Un solo emoji (un grafema), de verdad emoji. Acepta los compuestos (familias, banderas, tonos).
function cleanEmoji(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length > 32) return null;
  const seg = [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(s)];
  if (seg.length !== 1) return null;
  if (!/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s)) return null;
  if (/[\p{L}\p{N}<>&"']/u.test(s.replace(/[#*0-9]️?⃣/gu, ''))) return null; // nada de letras ni HTML
  return s;
}

function forMemories(ids) {
  const out = new Map();
  if (!ids.length) return out;
  const rows = db.prepare(`SELECT s.*, u.display_name AS by_name, u.username AS by_username FROM stickers s
    JOIN users u ON u.id = s.user_id WHERE s.memory_id IN (${ids.map(() => '?').join(',')}) ORDER BY s.slot`).all(...ids);
  for (const r of rows) { if (!out.has(r.memory_id)) out.set(r.memory_id, []); out.get(r.memory_id).push(r); }
  return out;
}

function canStick(mem, user) {
  return !!mem && !mem.is_placeholder && !!mem.photo && mem.user_id !== user.id && reveal.canSee(mem, user);
}

function add(user, memoryId, rawEmoji) {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);
  if (!canStick(mem, user)) return { error: 'No se puede pegar aquí.' };
  const emoji = cleanEmoji(rawEmoji);
  if (!emoji) return { error: 'Elige un solo emoji.' };
  const used = db.prepare('SELECT slot FROM stickers WHERE memory_id = ?').all(mem.id).map(r => r.slot);
  const slot = SLOTS.find(x => !used.includes(x));
  if (slot == null || used.length >= MAX) return { error: 'Esta foto ya tiene sus 2 stickers.' };
  const info = db.prepare('INSERT INTO stickers (memory_id, user_id, emoji, slot) VALUES (?, ?, ?, ?)').run(mem.id, user.id, emoji, slot);
  return { sticker: { id: Number(info.lastInsertRowid), slot, emoji } };
}

// Solo quien lo pegó puede despegarlo.
function remove(user, id) {
  return db.prepare('DELETE FROM stickers WHERE id = ? AND user_id = ?').run(id, user.id).changes > 0;
}

// Stickers en mis fotos que aún no he visto (para el aviso del inicio).
function unseenFor(userId) {
  return db.prepare(`SELECT s.id, s.emoji, s.memory_id, m.year, u.display_name AS by_name, u.username AS by_username
    FROM stickers s JOIN memories m ON m.id = s.memory_id JOIN users u ON u.id = s.user_id
    WHERE m.user_id = ? AND s.seen_at IS NULL ORDER BY m.year DESC, s.slot`).all(userId);
}

function markSeen(userId, ids) {
  const nums = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, 20);
  if (!nums.length) return 0;
  return db.prepare(`UPDATE stickers SET seen_at = datetime('now') WHERE seen_at IS NULL AND id IN (${nums.map(() => '?').join(',')})
    AND memory_id IN (SELECT id FROM memories WHERE user_id = ?)`).run(...nums, userId).changes;
}

module.exports = { MAX, cleanEmoji, forMemories, canStick, add, remove, unseenFor, markSeen };
