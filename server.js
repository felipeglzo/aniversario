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

// Fotos: solo con sesión iniciada.
app.use('/fotos', (req, res, next) => {
  if (!req.user) return res.redirect('/login');
  next();
}, express.static(config.PHOTOS_DIR, { maxAge: '7d' }));

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

// ---------- Rutas ----------
app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.send(views.loginPage({}));
});

app.post('/login', (req, res) => {
  const username = String(req.body.username || '').toLowerCase();
  const password = String(req.body.password || '');
  if (auth.checkLock(username)) {
    return res.status(429).send(views.loginPage({ error: 'Demasiados intentos. Espera 15 minutos.' }));
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    auth.recordFail(username);
    return res.status(401).send(views.loginPage({ error: 'Usuario o contraseña incorrectos.' }));
  }
  auth.clearFails(username);
  const cookie = auth.makeSessionCookie(user.id);
  res.setHeader('Set-Cookie',
    `aniv_session=${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${auth.SESSION_DAYS * 86400}${config.SITE_URL.startsWith('https') ? '; Secure' : ''}`);
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'aniv_session=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/login');
});

app.get('/', auth.requireLogin, (req, res) => {
  res.send(views.homePage({
    user: req.user,
    byYear: allMemoriesByYear(),
    flash: ({
      ok: { type: 'info', text: 'Guardado en el cofre. Tu yo del futuro te lo agradece.' },
      'prueba-ok': { type: 'info', text: 'Correo de prueba en camino a tu bandeja.' },
      'prueba-espera': { type: 'info', text: 'Espera un minuto antes de mandar otra prueba.' },
      'prueba-error': { type: 'error', text: 'No se pudo enviar la prueba. Revisa la configuración de Resend.' },
      'ajustes-ok': { type: 'info', text: 'Perfil actualizado. Te ves increíble, por cierto.' },
      ya: { type: 'info', text: `Ya escribiste tu recuerdo del ${todayParts().y}. Puedes corregirlo una vez desde el cofre.` }
    })[req.query.ok === '1' ? 'ok' : req.query.prueba ? `prueba-${req.query.prueba}` : req.query.ajustes ? 'ajustes-ok' : req.query.ya ? 'ya' : ''] || null
  }));
});

// Crear recuerdo del año en curso (solo 24 nov – 31 dic).
app.get('/nuevo', auth.requireLogin, (req, res) => {
  if (!creationWindowOpen()) return res.send(views.closedPage(req.user));
  const year = todayParts().y;
  const used = db.prepare('SELECT COUNT(*) c FROM memories WHERE user_id = ? AND year = ?')
    .get(req.user.id, year).c;
  if (used >= 1) return res.redirect('/?ya=1');
  res.send(views.memoryForm({ user: req.user, year }));
});

app.post('/nuevo', auth.requireLogin, upload.single('photo'), (req, res) => {
  if (!creationWindowOpen()) return res.send(views.closedPage(req.user));
  const year = todayParts().y;
  const used = db.prepare('SELECT COUNT(*) c FROM memories WHERE user_id = ? AND year = ?')
    .get(req.user.id, year).c;
  if (used >= 1) return res.redirect('/?ya=1');

  const body = String(req.body.body || '').trim();
  if (!body) {
    return res.status(400).send(views.memoryForm({
      user: req.user, year, error: 'El recuerdo no puede ir vacío.'
    }));
  }
  db.prepare(`INSERT INTO memories (user_id, year, slot, body, song, song_url, photo, is_placeholder)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0)`)
    .run(req.user.id, year, used + 1, body,
      String(req.body.song || '').trim().slice(0, 200),
      String(req.body.song_url || '').trim().slice(0, 500),
      req.file ? req.file.filename : '');
  res.redirect('/?ok=1');
});

// Editar: llenar un placeholder (no cuenta) o una única corrección.
app.get('/editar/:id', auth.requireLogin, (req, res) => {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(Number(req.params.id));
  if (!mem || mem.user_id !== req.user.id) return res.redirect('/');
  if (!mem.is_placeholder && mem.edits_used >= 1) return res.redirect('/');
  res.send(views.memoryForm({ user: req.user, mem }));
});

app.post('/editar/:id', auth.requireLogin, upload.single('photo'), (req, res) => {
  const mem = db.prepare('SELECT * FROM memories WHERE id = ?').get(Number(req.params.id));
  if (!mem || mem.user_id !== req.user.id) return res.redirect('/');
  if (!mem.is_placeholder && mem.edits_used >= 1) return res.redirect('/');

  const body = String(req.body.body || '').trim();
  if (!body) {
    return res.status(400).send(views.memoryForm({ user: req.user, mem, error: 'El recuerdo no puede ir vacío.' }));
  }
  const wasPlaceholder = mem.is_placeholder === 1;
  db.prepare(`UPDATE memories SET
      body = ?, song = ?, song_url = ?,
      photo = COALESCE(NULLIF(?, ''), photo),
      is_placeholder = 0,
      edits_used = edits_used + ?,
      updated_at = datetime('now')
    WHERE id = ?`)
    .run(body,
      String(req.body.song || '').trim().slice(0, 200),
      String(req.body.song_url || '').trim().slice(0, 500),
      req.file ? req.file.filename : '',
      wasPlaceholder ? 0 : 1, // llenar el placeholder no gasta la corrección
      mem.id);
  res.redirect('/?ok=1');
});

// Ajustes: nombre y avatar (recortado a círculo 256×256 con sharp).
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

app.get('/ajustes', auth.requireLogin, (req, res) => {
  res.send(views.settingsPage({ user: req.user }));
});

app.post('/ajustes', auth.requireLogin, avatarUpload.single('avatar'), async (req, res) => {
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

// Correo de prueba bajo demanda: solo Felipe, solo a su correo, no gasta recuerdos.
let lastTestMail = 0;
app.post('/prueba-correo', auth.requireLogin, async (req, res, next) => {
  if (req.user.username !== 'felipe') return res.status(403).redirect('/');
  if (Date.now() - lastTestMail < 60000) return res.redirect('/?prueba=espera');
  try {
    const { buildEmail } = require('./lib/emailTemplate');
    const { sendEmail } = require('./lib/mailer');
    const { asunto, htmlBody } = buildEmail({}); // commit: false → no marca recuerdos
    await sendEmail({
      to: [config.MAIL_TO_FELIPE],
      subject: `[PRUEBA] ${asunto}`,
      html: `<p style="font-family:Arial;background:#fff3cd;padding:10px;border-radius:8px;">
        🧪 Correo de prueba enviado desde el sitio. El recuerdo mostrado NO queda gastado.</p>` + htmlBody
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
