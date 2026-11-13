// Carga configuración desde data/config.env (clave=valor), sin dependencias.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = process.env.ANIV_DATA_DIR || path.join(ROOT, 'data');
const ENV_FILE = path.join(DATA_DIR, 'config.env');

const defaults = {
  PORT: '3000',
  SITE_URL: 'https://aniversario.felipeorigel.com',
  TZ_LOCAL: 'America/Vancouver',
  // Correo
  RESEND_API_KEY: '',
  MAIL_FROM: 'F + F <recuerdos@felipeorigel.com>',
  MAIL_TO_FELIPE: 'glzo.felipe@gmail.com',
  MAIL_TO_FERNANDA: '',
  // Seguridad
  SESSION_SECRET: '',
  // Día del correo de prueba (solo a Felipe): 10 de noviembre
  TEST_MAIL_MONTH: '11',
  TEST_MAIL_DAY: '10'
};

function load() {
  const cfg = { ...defaults };
  if (fs.existsSync(ENV_FILE)) {
    for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      cfg[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
  if (!cfg.SESSION_SECRET) {
    // Genera y persiste un secreto la primera vez.
    const crypto = require('crypto');
    cfg.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(ENV_FILE, `\nSESSION_SECRET=${cfg.SESSION_SECRET}\n`);
  }
  cfg.DATA_DIR = DATA_DIR;
  cfg.PHOTOS_DIR = path.join(DATA_DIR, 'photos');
  cfg.AVATARS_DIR = path.join(DATA_DIR, 'avatars');
  cfg.DB_FILE = path.join(DATA_DIR, 'aniversario.db');
  cfg.BACKUPS_DIR = path.join(DATA_DIR, 'backups');
  return cfg;
}

module.exports = load();
