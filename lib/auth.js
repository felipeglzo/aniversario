// Autenticación: contraseñas con scrypt y sesiones con cookie firmada (HMAC).
const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

// La sesión se cierra tras 2 horas sin usar el sitio (cada visita la renueva).
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_VERSION = 'v2'; // cambiarla cierra todas las sesiones abiertas

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
  const payload = `${SESSION_VERSION}.${userId}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

// Encabezado Set-Cookie con la sesión renovada por otras 2 horas.
function sessionCookieHeader(userId) {
  return `aniv_session=${makeSessionCookie(userId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}` +
    (config.SITE_URL.startsWith('https') ? '; Secure' : '');
}

function parseSessionCookie(raw) {
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return null; // cookies viejas: fuera
  const payload = parts.slice(0, 3).join('.');
  const expected = sign(payload);
  const got = parts[3];
  if (expected.length !== got.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))) return null;
  if (Number(parts[2]) < Date.now()) return null;
  return Number(parts[1]);
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
  // Cada visita (no los archivos estáticos) renueva la sesión: se cierra solo tras 2 h sin uso.
  if (req.user && !/\.(css|js|svg|png|jpe?g|webp|gif|ico|woff2?)$/i.test(req.path)) {
    res.setHeader('Set-Cookie', sessionCookieHeader(req.user.id));
  }
  next();
}

// Sin sesión: a entrar, y después de vuelta a donde iba.
function requireLogin(req, res, next) {
  if (!req.user) {
    const back = req.method === 'GET' ? req.originalUrl : (req.get('referer') ? new URL(req.get('referer'), 'http://x').pathname : '/');
    return res.redirect(back && back !== '/' ? `/login?next=${encodeURIComponent(back)}` : '/login');
  }
  next();
}

// Solo rutas internas (evita redirigir a otro sitio).
function safeNext(v) {
  const s = String(v || '');
  return /^\/(?!\/)[^\\]*$/.test(s) && !s.startsWith('/login') ? s : '/';
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
  hashPassword, verifyPassword, makeSessionCookie, sessionCookieHeader, sessionMiddleware,
  requireLogin, safeNext, checkLock, recordFail, clearFails, SESSION_TTL_MS
};
