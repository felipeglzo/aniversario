// Envío por la API de Resend (fetch nativo, sin SDK).
const config = require('./config');

async function sendEmail({ to, subject, html, attachments }) {
  if (!config.RESEND_API_KEY) throw new Error('Falta RESEND_API_KEY en data/config.env');
  const body = { from: config.MAIL_FROM, to, subject, html };
  if (attachments) body.attachments = attachments; // [{filename, content(base64)}]
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

module.exports = { sendEmail };
