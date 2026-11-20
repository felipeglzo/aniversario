// Correo para crear una nueva contraseña (mismo estilo que el sitio, compatible con Gmail).
const { esc } = require('./views');

function buildResetEmail({ name, link }) {
  const subject = 'Tu enlace para entrar al cofre 🔑';
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBF7F4;">
<div style="display:none;max-height:0;overflow:hidden;">Crea tu nueva contraseña. El enlace vence en 1 hora.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#120F2A;border-radius:28px;">
  <tr><td style="padding:36px 32px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#FF9AA6;">Cofre de Recuerdos</p>
    <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:30px;line-height:1.2;">Hola, ${esc(name)}</h1>
    <p style="margin:0 0 26px;font-size:16px;line-height:1.55;color:#E6E2F2;">Alguien (seguro tú) pidió crear una nueva contraseña para entrar a nuestro cofre. Toca el botón y elige una nueva.</p>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:#E0457A;background-image:linear-gradient(135deg,#FF6B7A,#C2389B);">
      <a href="${esc(link)}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">Crear nueva contraseña</a>
    </td></tr></table>
    <p style="margin:26px 0 0;font-size:13px;line-height:1.55;color:#B9B3CF;">El enlace funciona una sola vez y vence en 1 hora. Si no lo pediste, ignora este correo: tu contraseña sigue igual.</p>
  </td></tr>
  </table>
  <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#5E5A73;">F + F · desde el 24 de noviembre de 2018</p>
</td></tr>
</table>
</body></html>`;
  return { subject, html };
}

module.exports = { buildResetEmail };
