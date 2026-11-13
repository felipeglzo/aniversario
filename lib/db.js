const Database = require('better-sqlite3');
const fs = require('fs');
const config = require('./config');

fs.mkdirSync(config.DATA_DIR, { recursive: true });
fs.mkdirSync(config.PHOTOS_DIR, { recursive: true });
fs.mkdirSync(config.BACKUPS_DIR, { recursive: true });

const db = new Database(config.DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,        -- 'felipe' | 'fernanda'
  display_name TEXT NOT NULL,
  password_hash TEXT,                   -- scrypt: salt:hash (hex). NULL = sin contraseña aún
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  year INTEGER NOT NULL,                -- año al que pertenece el recuerdo
  slot INTEGER NOT NULL,                -- 1 o 2 (dos por persona por año)
  body TEXT NOT NULL DEFAULT '',
  song TEXT NOT NULL DEFAULT '',
  song_url TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',       -- nombre de archivo en data/photos
  is_placeholder INTEGER NOT NULL DEFAULT 0,  -- 1 = aún no lo llenan
  edits_used INTEGER NOT NULL DEFAULT 0,      -- corrección usada (máx 1)
  used_in_email INTEGER,                -- año del correo en que salió citado (NULL = nunca)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, year, slot)
);

CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,                   -- 'anniversary' | 'test' | 'backup'
  year INTEGER NOT NULL,                -- año del evento (evita envíos dobles)
  detail TEXT NOT NULL DEFAULT '',
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(kind, year)
);

CREATE TABLE IF NOT EXISTS login_attempts (
  username TEXT PRIMARY KEY,
  fails INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER                  -- epoch ms
);
`);

// --- Seed: usuarios y recuerdos precargados 2023–2025 (2 por persona por año) ---
const seedUsers = db.prepare('INSERT OR IGNORE INTO users (id, username, display_name) VALUES (?, ?, ?)');
seedUsers.run(1, 'felipe', 'Felipe');
seedUsers.run(2, 'fernanda', 'Fernanda');

const PLACEHOLDER_BODY = (year) => `Pendiente: aquí va un recuerdo favorito de ${year}. Entra a editarlo cuando quieras.`;
const seedMem = db.prepare(`INSERT OR IGNORE INTO memories (user_id, year, slot, body, is_placeholder)
                            VALUES (?, ?, ?, ?, 1)`);
for (const year of [2023, 2024, 2025]) {
  for (const userId of [1, 2]) {
    for (const slot of [1, 2]) {
      seedMem.run(userId, year, slot, PLACEHOLDER_BODY(year));
    }
  }
}

module.exports = db;
