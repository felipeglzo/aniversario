// Lógica de recuerdos: selección aleatoria sin repetir para el correo.
const db = require('./db');

// Años con recuerdos reales (no placeholder) anteriores al año dado.
function eligibleYears(beforeYear, { unusedOnly }) {
  const cond = unusedOnly ? 'AND used_in_email IS NULL' : '';
  return db.prepare(`
    SELECT year FROM memories
    WHERE is_placeholder = 0 AND year < ? ${cond}
    GROUP BY year
    HAVING SUM(CASE WHEN user_id = 1 THEN 1 ELSE 0 END) > 0
       AND SUM(CASE WHEN user_id = 2 THEN 1 ELSE 0 END) > 0
  `).all(beforeYear).map(r => r.year);
}

function pickFor(userId, year, unusedOnly) {
  const cond = unusedOnly ? 'AND used_in_email IS NULL' : '';
  return db.prepare(`
    SELECT * FROM memories
    WHERE is_placeholder = 0 AND user_id = ? AND year = ? ${cond}
    ORDER BY RANDOM() LIMIT 1
  `).get(userId, year);
}

// Elige el año y un recuerdo de cada quien para el correo del año emailYear.
// Preferencia: años donde ambos tienen recuerdos sin usar; si no hay,
// se permite repetir (el pool se agotó) eligiendo los menos recientes.
function pickMemoriesForEmail(emailYear, { commit }) {
  let years = eligibleYears(emailYear, { unusedOnly: true });
  let unusedOnly = true;
  if (!years.length) {
    years = eligibleYears(emailYear, { unusedOnly: false });
    unusedOnly = false;
  }
  if (!years.length) return null;

  const year = years[Math.floor(Math.random() * years.length)];
  const memF = pickFor(1, year, unusedOnly) || pickFor(1, year, false);
  const memR = pickFor(2, year, unusedOnly) || pickFor(2, year, false);
  if (!memF || !memR) return null;

  if (commit) {
    const mark = db.prepare('UPDATE memories SET used_in_email = ? WHERE id = ?');
    mark.run(emailYear, memF.id);
    mark.run(emailYear, memR.id);
  }
  return { year, felipe: memF, fernanda: memR };
}

function allMemoriesByYear() {
  const rows = db.prepare(`
    SELECT m.*, u.display_name, u.username FROM memories m
    JOIN users u ON u.id = m.user_id
    ORDER BY m.year DESC, m.user_id, m.slot
  `).all();
  const byYear = new Map();
  for (const r of rows) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year).push(r);
  }
  return byYear;
}

module.exports = { pickMemoriesForEmail, allMemoriesByYear };
