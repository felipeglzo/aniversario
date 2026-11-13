#!/usr/bin/env node
// Corre una vez al día (systemd timer, 8:00 America/Vancouver).
// - 10 nov: correo de PRUEBA solo a Felipe (verifica que todo vive).
// - 24 nov: correo de ANIVERSARIO a ambos (elige y marca recuerdos).
// - 1 dic:  RECORDATORIO solo a quien no ha escrito su recuerdo del año.
// - lunes:  respaldo local; por correo a Felipe cada trimestre y el 24 nov.
// Idempotente: email_log evita envíos dobles aunque corra dos veces.
const config = require('../lib/config');
const db = require('../lib/db');
const { buildEmail } = require('../lib/emailTemplate');
const { pickMemoriesForEmail } = require('../lib/memories');
const { isAnniversaryToday, isTestMailDay, todayParts, stats } = require('../lib/dates');
const { sendEmail } = require('../lib/mailer');
const { runBackup } = require('./backup');

const already = (kind, year) =>
  !!db.prepare('SELECT 1 FROM email_log WHERE kind = ? AND year = ?').get(kind, year);
const log = (kind, year, detail) =>
  db.prepare('INSERT INTO email_log (kind, year, detail) VALUES (?, ?, ?)').run(kind, year, detail);

async function main() {
  const year = todayParts().y;

  if (isTestMailDay() && !already('test', year)) {
    const { asunto, htmlBody } = buildEmail({}); // sin commit: no gasta recuerdos
    await sendEmail({
      to: [config.MAIL_TO_FELIPE],
      subject: `[PRUEBA ${year}] ${asunto}`,
      html: `<p style="font-family:Arial;background:#fff3cd;padding:10px;border-radius:8px;">
        🧪 Correo de prueba anual. Si lo estás leyendo, el sistema está vivo y así se verá el correo del 24.
        El recuerdo mostrado NO queda gastado.</p>` + htmlBody
    });
    log('test', year, 'ok');
    console.log('Correo de prueba enviado.');
  }

  if (isAnniversaryToday() && !already('anniversary', year)) {
    const picked = pickMemoriesForEmail(year, { commit: true });
    const { asunto, htmlBody } = buildEmail({ picked });
    const to = [config.MAIL_TO_FELIPE, config.MAIL_TO_FERNANDA].filter(Boolean);
    await sendEmail({ to, subject: asunto, html: htmlBody });
    log('anniversary', year, picked ? `año citado: ${picked.year}` : 'sin recuerdos aún');
    console.log('Correo de aniversario enviado a', to.join(', '));
  }

  // 1 de diciembre: recordatorio individual a quien no ha escrito su recuerdo del año.
  const t = todayParts();
  if (t.m === 12 && t.d === 1) {
    const { buildReminder } = require('../lib/emailTemplate');
    const people = [
      { id: 1, username: 'felipe', name: 'Felipe', to: config.MAIL_TO_FELIPE },
      { id: 2, username: 'fernanda', name: 'Fernanda', to: config.MAIL_TO_FERNANDA }
    ];
    for (const p of people) {
      const kind = `reminder-${p.username}`;
      const wrote = db.prepare('SELECT 1 FROM memories WHERE user_id = ? AND year = ?').get(p.id, year);
      if (wrote || !p.to || already(kind, year)) continue;
      const { asunto, htmlBody } = buildReminder({ name: p.name, year });
      await sendEmail({ to: [p.to], subject: asunto, html: htmlBody });
      log(kind, year, 'ok');
      console.log('Recordatorio enviado a', p.name);
    }
  }

  // Respaldo semanal (lunes) + siempre el día del aniversario.
  const dow = new Date().toLocaleDateString('en-US', { timeZone: config.TZ_LOCAL, weekday: 'short' });
  if (dow === 'Mon' || isAnniversaryToday()) {
    // Correo: primer lunes de enero, abril, julio y octubre, más el 24 de noviembre.
    const firstMondayOfQuarter = dow === 'Mon' && [1, 4, 7, 10].includes(t.m) && t.d <= 7;
    await runBackup({ email: isAnniversaryToday() || firstMondayOfQuarter });
  }
}

main().catch(err => { console.error('daily.js falló:', err); process.exit(1); });
