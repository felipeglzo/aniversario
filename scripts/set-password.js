#!/usr/bin/env node
// Uso: node scripts/set-password.js felipe "MiContraseña"
const db = require('../lib/db');
const { hashPassword } = require('../lib/auth');

const [,, username, password] = process.argv;
if (!username || !password) {
  console.error('Uso: node scripts/set-password.js <felipe|fernanda> <contraseña>');
  process.exit(1);
}
const r = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?')
  .run(hashPassword(password), username.toLowerCase());
if (!r.changes) { console.error('Usuario no encontrado:', username); process.exit(1); }
console.log(`Contraseña actualizada para ${username}.`);
