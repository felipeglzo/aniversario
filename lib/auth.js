// Autenticación: contraseñas con scrypt y sesiones con cookie firmada (HMAC).
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

const SESSION_DAYS = 180;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function sign(value) {
  return crypto.createHmac('sha256', config.SESSION_SECRET).update(value).digest('base64url');
}

function makeSessionCookie(userId) {
  const payload = `${userId}.${Date.now() + SESSION_DAYS * 86400000}`;
  return `${payload}.${sign(payload)}`;
}

function parseSessionCookie(raw) {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  const got = parts[2];
  if (expected.length !== got.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))) return null;
  if (Number(parts[1]) < Date.now()) return null;
  return Number(parts[0]);
}

// Middleware
function sessionMiddleware(req, res, next) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || '').split(';').map(c => {
      const i = c.indexOf('=');
      return i === -1 ? [c.trim(), ''] : [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const userId = parseSessionCookie(cookies.aniv_session);
  if (userId) {
    req.user = db.prepare('SELECT id, username, display_name, avatar FROM users WHERE id = ?').get(userId) || null;
  } else {
    req.user = null;
  }
  next();
}

function requireLogin(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

// Límite de intentos: 8 fallos → 15 min bloqueado.
function checkLock(username) {
  const row = db.prepare('SELECT * FROM login_attempts WHERE username = ?').get(username);
  return !!(row && row.locked_until && row.locked_until > Date.now());
}

function recordFail(username) {
  const row = db.prepare('SELECT * FROM login_attempts WHERE username = ?').get(username);
  const fails = (row ? row.fails : 0) + 1;
  const locked = fails >= 8 ? Date.now() + 15 * 60000 : null;
  db.prepare(`INSERT INTO login_attempts (username, fails, locked_until) VALUES (?, ?, ?)
              ON CONFLICT(username) DO UPDATE SET fails = ?, locked_until = ?`)
    .run(username, locked ? 0 : fails, locked, locked ? 0 : fails, locked);
}

function clearFails(username) {
  db.prepare('DELETE FROM login_attempts WHERE username = ?').run(username);
}

module.exports = {
  hashPassword, verifyPassword, makeSessionCookie, sessionMiddleware,
  requireLogin, checkLock, recordFail, clearFails, SESSION_DAYS
};
