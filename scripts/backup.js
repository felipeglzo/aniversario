#!/usr/bin/env node
// Respaldo: copia íntegra de la base (y lista de fotos) a data/backups/,
// rota a 12 copias, y opcionalmente manda la base por correo a Felipe
// (la base es texto: recuerdos, canciones, usuarios — pesa poco).
const fs = require('fs');
const path = require('path');
const config = require('../lib/config');
const db = require('../lib/db');

async function runBackup({ email = false } = {}) {
  fs.mkdirSync(config.BACKUPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(config.BACKUPS_DIR, `aniversario-${stamp}.db`);
  await db.backup(dest); // copia consistente aunque la app esté en uso

  // Rotar: conservar las 12 más recientes.
  const files = fs.readdirSync(config.BACKUPS_DIR)
    .filter(f => f.endsWith('.db')).sort().reverse();
  for (const f of files.slice(12)) fs.unlinkSync(path.join(config.BACKUPS_DIR, f));

  if (email && config.RESEND_API_KEY) {
    const { sendEmail } = require('../lib/mailer');
    const content = fs.readFileSync(dest).toString('base64');
    const photos = fs.existsSync(config.PHOTOS_DIR) ? fs.readdirSync(config.PHOTOS_DIR).length : 0;
    await sendEmail({
      to: [config.MAIL_TO_FELIPE],
      subject: `🗄️ Respaldo del cofre de recuerdos — ${stamp}`,
      html: `<p style="font-family:Arial">Respaldo automático de la base de datos del aniversario.
             Guarda este correo: con este archivo se puede reconstruir todo menos las fotos
             (hay ${photos} fotos en el servidor; respáldalas aparte de vez en cuando).</p>`,
      attachments: [{ filename: `aniversario-${stamp}.db`, content }]
    });
    console.log('Respaldo enviado por correo.');
  }
  console.log('Respaldo listo:', dest);
  return dest;
}

if (require.main === module) {
  runBackup({ email: process.argv.includes('--email') })
    .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runBackup };
