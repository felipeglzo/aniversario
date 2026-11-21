// Números del cofre: junta lo anotado en events + lo que la app ya sabía
// (cuándo se escribió cada recuerdo, stickers, cuándo se abrió cada revelación).
const db = require('./db');
const { todayParts } = require('./dates');
const { today } = require('./events');

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const toDate = (sqliteUtc) => new Date(String(sqliteUtc).replace(' ', 'T') + 'Z');
const localDay = (d) => { const t = todayParts(d); return Date.UTC(t.y, t.m - 1, t.d); };

function collect() {
  const users = db.prepare('SELECT id, username, display_name FROM users ORDER BY id').all();
  const since = (db.prepare('SELECT MIN(day) d FROM events').get() || {}).d || today();
  const count = (sql, ...a) => db.prepare(sql).get(...a).c;

  const people = users.map(u => ({
    ...u,
    dias: count("SELECT COUNT(DISTINCT day) c FROM events WHERE user_id = ? AND kind = 'visita'", u.id),
    movil: count("SELECT COUNT(DISTINCT day) c FROM events WHERE user_id = ? AND kind = 'visita' AND ref = 'movil'", u.id),
    correo: count("SELECT COUNT(*) c FROM events WHERE user_id = ? AND kind = 'correo'", u.id),
    fotos: count("SELECT COUNT(*) c FROM events WHERE user_id = ? AND kind = 'foto'", u.id),
    canciones: count("SELECT COUNT(*) c FROM events WHERE user_id = ? AND kind = 'cancion'", u.id),
    stickers: count('SELECT COUNT(*) c FROM stickers WHERE user_id = ?', u.id)
  }));

  // Mes a mes: días con visita, últimos 6 meses.
  const t = todayParts();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(t.y, t.m - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    months.push({
      label: MES[d.getUTCMonth()], key,
      per: users.map(u => count("SELECT COUNT(DISTINCT day) c FROM events WHERE user_id = ? AND kind = 'visita' AND substr(day, 1, 7) = ?", u.id, key))
    });
  }

  // Cada año: cuándo escribió cada quien (días después del 24 nov) y cuánto tardó en abrir la revelación.
  const years = db.prepare('SELECT DISTINCT year FROM memories WHERE is_placeholder = 0 ORDER BY year DESC').all().map(r => r.year);
  const perYear = years.map(y => {
    const open = Date.UTC(y, 10, 24);
    const rev = db.prepare("SELECT * FROM reveals WHERE year = ? AND reason != 'inicial'").get(y);
    return {
      year: y,
      per: users.map(u => {
        const m = db.prepare('SELECT created_at FROM memories WHERE user_id = ? AND year = ? AND is_placeholder = 0').get(u.id, y);
        const wrote = m && y >= 2026 ? Math.round((localDay(toDate(m.created_at)) - open) / 86400000) : null;
        const seen = rev && db.prepare('SELECT seen_at FROM reveal_seen WHERE user_id = ? AND year = ?').get(u.id, y);
        const hours = rev && seen ? Math.max(0, (toDate(seen.seen_at) - toDate(rev.revealed_at)) / 3600000) : null;
        return { wrote: !!m, day: wrote, revealHours: hours, waiting: !!rev && !seen };
      })
    };
  });

  return { since, people, months, perYear };
}

module.exports = { collect };
