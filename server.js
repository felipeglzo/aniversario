const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const config = require('./lib/config');
const db = require('./lib/db');
const auth = require('./lib/auth');
const views = require('./lib/views');
const { allMemoriesByYear } = require('./lib/memories');
const { creationWindowOpen, todayParts } = require('./lib/dates');
const reveal = require('./lib/reveal');

const MAX_BODY = 1000; // caracteres por recuerdo

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // detrás de Caddy

app.use(express.urlencoded({ extended: false }));
app.use(auth.sessionMiddleware);

// Avatares: públicos (los usa el correo). Si el usuario subió uno, se sirve ese;
// si no, el original de public/avatars/.
app.get('/avatars/:file', (req, res, next) => {
  const m = /^(felipe|fernanda)\.png$/.exec(req.params.file);
  if (!m) return next();
  const u = db.prepare('SELECT avatar FROM users WHERE username = ?').get(m[1]);
  if (u && u.avatar) {
    const custom = path.join(config.AVATARS_DIR, u.avatar);
    res.set('Cache-Control', 'public, max-age=86400');
    return res.sendFile(custom, err => err && next());
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d' }));

// Imágenes generadas para los correos (número del año, polaroids): públicas, nombres imposibles de adivinar.
app.get('/correo/:file', (req, res, next) => {
  if (!/^(numero-\d{1,3}\.png|p-[a-f0-9]{24}\.jpg)$/.test(req.params.file)) return next();
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(path.join(require('./lib/emailImages').OUT_DIR, req.params.file), err => err && next());
});

// Fotos: solo con sesión iniciada, y la del otro solo cuando su año ya se reveló.
// Un archivo que ya no pertenece a ningún recuerdo (foto reemplazada) no se sirve.
app.use('/fotos', (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  const file = decodeURIComponent(req.path.replace(/^\//, ''));
  const mem = db.prepare('SELECT id, user_id, year, is_placeholder FROM memories WHERE photo = ?').get(file);
  if (!mem || !reveal.canSee(mem, req.user)) return res.status(404).end();
  res.set('Cache-Control', 'private, max-age=604800');
  next();
}, express.static(config.PHOTOS_DIR, { maxAge: 0, cacheControl: false }));

// Si con este recuerdo ya están los dos, el año se abre y les llega el correo.
function afterMemorySaved(year) {
  const opened = reveal.afterSave(year);
  if (opened) reveal.sendRevealEmail(opened).catch(err => console.error('Correo de revelación falló:', err.message));
}

const upload = multer({
  storage: multer.diskStorage({
    destination: config.PHOTOS_DIR,
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname) || '.jpg').toLowerCase().slice(0, 6);
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  }
});

// Sube la foto; si es demasiado grande, regresa al formulario con un aviso en vez de un error 500.
function photoUpload(req, res, next) {
  upload.single('photo')(req, res, err => {
    if (err) req.uploadError = err.code === 'LIMIT_FILE_SIZE'
      ? 'La foto pesa más de 10 MB. Prueba con una más ligera.'
      : 'No se pudo subir la foto. Prueba con otra.';
    next();
  });
}

const allUsers = () => db.prepare('SELECT id, username, display_name, avatar FROM users ORDER BY id').all();

// ---------- Borradores ----------
const getDraft = (userId, target) =>
  db.prepare('SELECT * FROM drafts WHERE user_id = ? AND target = ?').get(userId, target);
const deleteDraft = (userId, target) =>
  db.prepare('DELETE FROM drafts WHERE user_id = ? AND target = ?').run(userId, target);

// ¿Ese borrador corresponde a algo que este usuario puede escribir?
function draftTargetAllowed(user, target) {
  let m = /^nuevo-(\d{4})$/.exec(target);
  if (m) return Number(m[1]) === todayParts().y;
  m = /^mem-(\d+)$/.exec(target);
  if (m) {
    const mem = db.prepare('SELECT user_id, is_placeholder, edits_used FROM memories WHERE id = ?').get(Number(m[1]));
    return !!mem && mem.user_id === user.id && (mem.is_placeholder === 1 || mem.edits_used < 1);
  }
  return false;
}

const jsonBody = express.json({ limit: '20kb', type: ['application/json', 'text/plain'] });

app.post('/borrador', jsonBody, (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false });
  const b = req.body || {};
  const target = String(b.target || '');
  if (!draftTargetAllowed(req.user, target)) return res.status(400).json({ ok: false });
  const body = [...String(b.body || '')].slice(0, MAX_BODY).join('');
  const song = String(b.song || '').slice(0, 200);
  const songUrl = String(b.song_url || '').slice(0, 500);
  if (!body.trim() && !song.trim() && !songUrl.trim()) {
    deleteDraft(req.user.id, target);
  } else {
    db.prepare(`INSERT INTO drafts (user_id, target, body, song, song_url, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(user_id, target) DO UPDATE SET
                  body = excluded.body, song = excluded.song, song_url = excluded.song_url, updated_at = excluded.updated_at`)
      .run(req.user.id, target, body, song, songUrl);
  }
  res.json({ ok: true });
});

app.post('/borrador/descartar', jsonBody, (req, res) => {
  if (!req.user) return res.status(401).json({ ok: false });
  deleteDraft(req.user.id, String((req.body || {}).target || ''));
  res.json({ ok: true });
});

// Busca el fragmento de la canción recién guardada sin hacer esperar a nadie.
function warmPreview(userId, year) {
  const mem = db.prepare('SELECT id, song, song_url, preview FROM memories WHERE user_id = ? AND year = ?').get(userId, year);
  if (mem && (mem.song || mem.song_url)) require('./lib/preview').previewFor(mem).catch(() => {});
}

// Lee y valida lo que viene del formulario de recuerdo.
function readMemoryForm(req) {
  const values = {
    body: String(req.body.body || '').replace(/\r\n/g, '\n').trim(),
    song: String(req.body.song || '').trim().slice(0, 200),
    song_url: String(req.body.song_url || '').trim().slice(0, 500)
  };
  if (values.song_url && !/^https?:\/\//i.test(values.song_url)) values.song_url = '';
  let error = req.uploadError || null;
  if (!values.body) error = 'El recuerdo no puede ir vacío.';
  else if ([...values.body].length > MAX_BODY) error = `El recuerdo puede tener hasta ${MAX_BODY} caracteres.`;
  return { values, error };
}

// ---------- Entrar / salir ----------
app.get('/login', (req, res) => {
  if (req.user) return res.redirect(auth.safeNext(req.query.next));
  res.send(views.loginPage({ users: allUsers(), next: auth.safeNext(req.query.next) }));
});

app.post('/login', (req, res) => {
  const username = String(req.body.username || '').toLowerCase();
  const password = String(req.body.password || '');
  const users = allUsers();
  const next = auth.safeNext(req.body.next);
  if (auth.checkLock(username)) {
    return res.status(429).send(views.loginPage({ users, username, next, error: 'Demasiados intentos. Espera 15 minutos.' }));
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    auth.recordFail(username);
    return res.status(401).send(views.loginPage({ users, username, next, error: 'Esa contraseña no es. Intenta otra vez.' }));
  }
  auth.clearFails(username);
  setSession(res, user.id);
  res.redirect(next);
});

function setSession(res, userId) {
  res.setHeader('Set-Cookie', auth.sessionCookieHeader(userId));
}

app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'aniv_session=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});

// ---------- Recuperar contraseña ----------
// El correo de cada quien vive en config.env (MAIL_TO_FELIPE / MAIL_TO_FERNANDA).
function userForEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e) return null;
  const map = { felipe: config.MAIL_TO_FELIPE, fernanda: config.MAIL_TO_FERNANDA };
  const username = Object.keys(map).find(u => map[u] && map[u].trim().toLowerCase() === e);
  return username ? db.prepare('SELECT * FROM users WHERE username = ?').get(username) : null;
}
const hashToken = t => crypto.createHash('sha256').update(t).digest('hex');
const RESET_TTL = 60 * 60 * 1000;
const resetHits = []; // marcas de tiempo (límite global: 6 por hora)
const resetPerUser = new Map(); // username → última vez que se mandó (1 cada 2 min)

app.get('/recuperar', (req, res) => res.send(views.recoverPage({})));

app.post('/recuperar', async (req, res) => {
  const now = Date.now();
  while (resetHits.length && now - resetHits[0] > 3600000) resetHits.shift();
  if (resetHits.length >= 6) {
    return res.status(429).send(views.recoverPage({ error: 'Demasiadas solicitudes. Intenta en un rato.' }));
  }
  resetHits.push(now);
  const user = userForEmail(req.body.email);
  // Misma respuesta exista o no el correo.
  if (user && now - (resetPerUser.get(user.username) || 0) > 120000) {
    resetPerUser.set(user.username, now);
    const token = crypto.randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?').run(user.id, now);
    db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hashToken(token), user.id, now + RESET_TTL);
    try {
      const { buildResetEmail } = require('./lib/emailTemplate');
      const { sendEmail } = require('./lib/mailer');
      const { subject, html } = buildResetEmail({
        name: user.display_name, username: user.username, link: `${config.SITE_URL}/nueva-contrasena?t=${token}`
      });
      const to = user.username === 'felipe' ? config.MAIL_TO_FELIPE : config.MAIL_TO_FERNANDA;
      await sendEmail({ to: [to], subject, html });
    } catch (err) {
      console.error('Correo de recuperación falló:', err.message);
    }
  }
  res.send(views.recoverPage({ sent: true }));
});

function resetFromToken(token) {
  if (!token) return null;
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hashToken(String(token)));
  if (!row || row.used_at || row.expires_at < Date.now()) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
  return user ? { row, user } : null;
}

app.get('/nueva-contrasena', (req, res) => {
  res.set('Referrer-Policy', 'no-referrer');
  const r = resetFromToken(req.query.t);
  if (!r) return res.status(400).send(views.newPasswordPage({ invalid: true }));
  res.send(views.newPasswordPage({ user: r.user, token: String(req.query.t) }));
});

app.post('/nueva-contrasena', (req, res) => {
  const token = String(req.body.t || '');
  const r = resetFromToken(token);
  if (!r) return res.status(400).send(views.newPasswordPage({ invalid: true }));
  const p1 = String(req.body.password || ''), p2 = String(req.body.password2 || '');
  let error = null;
  if (p1.length < 8) error = 'La contraseña necesita al menos 8 caracteres.';
  else if (p1 !== p2) error = 'Las dos contraseñas no coinciden.';
  if (error) return res.status(400).send(views.newPasswordPage({ user: r.user, token, error }));
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(p1), r.user.id);
  db.prepare('UPDATE password_resets SET used_at = ? WHERE token_hash = ?').run(Date.now(), r.row.token_hash);
  auth.clearFails(r.user.username);
  setSession(res, r.user.id);
  res.redirect('/?clave=ok');
});

// ---------- Inicio ----------
app.get('/', auth.requireLogin, (req, res) => {
  const t = todayParts();
  const drafts = new Set(db.prepare('SELECT target FROM drafts WHERE user_id = ?').all(req.user.id).map(d => d.target));
  const flashes = {
    ok: { type: 'info', text: 'Guardado en el cofre. Tu yo del futuro te lo agradece.' },
    'prueba-ok': { type: 'info', text: 'Correo de prueba en camino a tu bandeja.' },
    'prueba-espera': { type: 'info', text: 'Espera un minuto antes de mandar otra prueba.' },
    'prueba-error': { type: 'error', text: 'No se pudo enviar la prueba. Revisa la configuración de Resend.' },
    'ajustes-ok': { type: 'info', text: 'Perfil actualizado. Te ves increíble, por cierto.' },
    'clave-ok': { type: 'info', text: 'Contraseña nueva guardada. Bienvenido de vuelta al cofre.' },
    ya: { type: 'info', text: `Ya escribiste tu recuerdo del ${t.y}. Puedes corregirlo una vez desde el cofre.` }
  };
  const q = req.query;
  const key = q.ok === '1' ? 'ok' : q.prueba ? `prueba-${q.prueba}` : q.ajustes ? 'ajustes-ok'
    : q.clave ? 'clave-ok' : q.ya ? 'ya' : '';
  res.send(views.homePage({
    user: req.user,
    users: allUsers(),
    byYear: allMemoriesByYear(),
    drafts,
    flash: flashes[key] || null
  }));
});

// ---------- Crear recuerdo del año en curso (solo 24 nov – 31 dic) ----------
const usedThisYear = (userId, year) =>
  db.prepare('SELECT COUNT(*) c FROM memories WHERE user_id = ? AND year = ?').get(userId, year).c;

app.get('/nuevo', auth.requireLogin, (req, res) => {
  if (!creationWindowOpen()) return res.send(views.closedPage(req.user));
  const year = todayParts().y;
  if (usedThisYear(req.user.id, year) >= 1) return res.redirect('/?ya=1');
  res.send(views.memoryForm({ user: req.user, year, draft: getDraft(req.user.id, `nuevo-${year}`) }));
});

app.post('/nuevo', auth.requireLogin, photoUpload, (req, res) => {
  if (!creationWindowOpen()) return res.send(views.closedPage(req.user));
  const year = todayParts().y;
  const used = usedThisYear(req.user.id, year);
  if (used >= 1) return res.redirect('/?ya=1');

  const { values, error } = readMemoryForm(req);
  if (error) return res.status(400).send(views.memoryForm({ user: req.user, year, values, error }));
  db.prepare(`INSERT INTO memories (user_id, year, slot, body, song, song_url, photo, is_placeholder)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(req.user.id, year, used + 1, values.body, values.song, values.song_url,
      req.file ? req.file.filename : '');
  deleteDraft(req.user.id, `nuevo-${year}`);
  warmPreview(req.user.id, year);
  afterMemorySaved(year);
  res.redirect('/?ok=1');
});

// ---------- Editar: llenar un pendiente (no cuenta) o la única corrección ----------
function editableMemory(req) {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(Number(req.params.id));
  if (!mem || mem.user_id !== req.user.id) return null;
  if (!mem.is_placeholder && mem.edits_used >= 1) return null;
  return mem;
}

app.get('/editar/:id', auth.requireLogin, (req, res) => {
  const mem = editableMemory(req);
  if (!mem) return res.redirect('/');
  res.send(views.memoryForm({ user: req.user, mem, draft: getDraft(req.user.id, `mem-${mem.id}`) }));
});

app.post('/editar/:id', auth.requireLogin, photoUpload, (req, res) => {
  const mem = editableMemory(req);
  if (!mem) return res.redirect('/');

  const { values, error } = readMemoryForm(req);
  if (error) return res.status(400).send(views.memoryForm({ user: req.user, mem, values, error }));
  const photo = req.file ? req.file.filename : req.body.remove_photo === '1' ? '' : mem.photo;
  const wasPlaceholder = mem.is_placeholder === 1;
  db.prepare(`UPDATE memories SET
      body = ?, song = ?, song_url = ?, photo = ?, preview = '',
      is_placeholder = 0,
      edits_used = edits_used + ?,
      updated_at = datetime('now')
    WHERE id = ?`)
    .run(values.body, values.song, values.song_url, photo,
      wasPlaceholder ? 0 : 1, // llenar el pendiente no gasta la corrección
      mem.id);
  deleteDraft(req.user.id, `mem-${mem.id}`);
  warmPreview(req.user.id, mem.year);
  afterMemorySaved(mem.year);
  res.redirect('/?ok=1');
});

// ---------- Fragmento de 30 s de la canción de un recuerdo ----------
app.get('/fragmento/:id', auth.requireLogin, async (req, res) => {
  const mem = db.prepare('SELECT id, user_id, year, song, song_url, preview, is_placeholder FROM memories WHERE id = ?').get(Number(req.params.id));
  if (!mem || mem.is_placeholder || !reveal.canSee(mem, req.user) || (!mem.song && !mem.song_url)) return res.status(404).json({ none: true });
  const p = await require('./lib/preview').previewFor(mem);
  if (!p || p.none) return res.status(404).json({ none: true });
  res.json({ url: p.url, track: p.track, artist: p.artist, link: p.link });
});

// ---------- Revelación: ya vio la animación de apertura de ese año ----------
app.post('/revelado', auth.requireLogin, jsonBody, (req, res) => {
  const year = Number(req.body && req.body.year);
  if (!Number.isInteger(year) || !reveal.revealInfo(year)) return res.status(400).json({ ok: false });
  reveal.markSeen(req.user.id, year);
  res.json({ ok: true });
});

// ---------- Ajustes: nombre y avatar (recortado a 256×256 con sharp) ----------
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

app.get('/ajustes', auth.requireLogin, (req, res) => {
  res.send(views.settingsPage({ user: req.user }));
});

app.post('/ajustes', auth.requireLogin, (req, res, next) => {
  avatarUpload.single('avatar')(req, res, err => {
    if (err) return res.status(400).send(views.settingsPage({ user: req.user, error: 'Esa imagen pesa demasiado (máximo 8 MB).' }));
    next();
  });
}, async (req, res) => {
  const name = String(req.body.display_name || '').trim().slice(0, 30);
  if (!name) return res.status(400).send(views.settingsPage({ user: req.user, error: 'El nombre no puede ir vacío.' }));

  let avatarFile = req.user.avatar;
  if (req.file) {
    try {
      const sharp = require('sharp');
      avatarFile = `${req.user.username}-${Date.now()}.png`;
      await sharp(req.file.buffer).rotate().resize(256, 256, { fit: 'cover' }).png()
        .toFile(path.join(config.AVATARS_DIR, avatarFile));
      // Borra el avatar anterior personalizado.
      if (req.user.avatar) require('fs').unlink(path.join(config.AVATARS_DIR, req.user.avatar), () => {});
    } catch (err) {
      console.error('Avatar falló:', err.message);
      return res.status(400).send(views.settingsPage({ user: req.user, error: 'No se pudo procesar esa imagen. Prueba con JPG o PNG.' }));
    }
  }
  db.prepare('UPDATE users SET display_name = ?, avatar = ? WHERE id = ?').run(name, avatarFile, req.user.id);
  res.redirect('/?ajustes=ok');
});

// ---------- Correo de prueba: solo Felipe, solo a su correo, no gasta recuerdos ----------
let lastTestMail = 0;
app.post('/prueba-correo', auth.requireLogin, async (req, res) => {
  if (req.user.username !== 'felipe') return res.status(403).redirect('/');
  if (Date.now() - lastTestMail < 60000) return res.redirect('/?prueba=espera');
  try {
    const { buildEmail, withBanner } = require('./lib/emailTemplate');
    const { sendEmail } = require('./lib/mailer');
    const { asunto, htmlBody } = await buildEmail({}); // commit: false → no marca recuerdos
    await sendEmail({
      to: [config.MAIL_TO_FELIPE],
      subject: `[PRUEBA] ${asunto}`,
      html: withBanner(htmlBody, 'Correo de prueba enviado desde el sitio. El recuerdo mostrado NO queda gastado.')
    });
    lastTestMail = Date.now();
    res.redirect('/?prueba=ok');
  } catch (err) {
    console.error('Prueba de correo falló:', err.message);
    res.redirect('/?prueba=error');
  }
});

// Salud (para monitoreo simple).
app.get('/salud', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Algo salió mal. Intenta de nuevo.');
});

app.listen(Number(config.PORT), '127.0.0.1', () => {
  console.log(`Aniversario escuchando en http://127.0.0.1:${config.PORT}`);
});
