// Plantilla del correo de aniversario — diseño original de Felipe, restaurado.
// Cambios respecto al original de Apps Script:
//  1) El CTA lleva al sitio (crear recuerdo del año) en vez del Google Form.
//  2) La línea del hito ("Faltan X días para el 10º") es dinámica: 10º, 15º, 20º...
//  3) Los recuerdos, canciones y timestamps vienen de la base de datos.
const config = require('./config');
const { stats } = require('./dates');
const { pickMemoriesForEmail } = require('./memories');

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtTimestamp(sqliteUtc) {
  if (!sqliteUtc) return '';
  const d = new Date(sqliteUtc.replace(' ', 'T') + 'Z');
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: config.TZ_LOCAL, day: 'numeric', month: 'long', year: 'numeric'
  }).format(d);
}

function songLine(mem) {
  if (!mem.song && !mem.song_url) return '';
  const label = esc(mem.song || 'Escúchala aquí');
  const inner = mem.song_url
    ? `<a href="${esc(mem.song_url)}" target="_blank" style="color: #273043; text-decoration: underline;">${label}</a>`
    : label;
  return `<p style="margin: 8px 0 0 0; font-size: 12px; font-weight: bold;">Canción: ${inner}</p>`;
}

// Preview text: rota cada año empezando en 2026 (8º aniversario = frase 1),
// y vuelve a empezar después de la décima.
const PREVIEW_FIRST_ANNIVERSARY = 8;
const PREVIEW_TEXTS = [
  'Revivamos estos momentos épicos (y los no tanto).',
  'Tantas cosas han pasado… y ni una sola discusión. 😇',
  'Otro año más escribiendo nuestra historia.',
  'Mira todo lo que hemos vivido juntos.',
  'Un año más de risas, viajes y "¿qué cenamos?".',
  'Nuestro cofre de recuerdos se abre otra vez.',
  'Lo mejor de nosotros, sin bloopers incluidos.',
  'Felipe y Fernanda del pasado tienen algo que decirles.',
  'Seguimos sumando días, recuerdos y fotos borrosas.',
  'Lo que empezó en un coche sigue sin estacionarse.'
];

function previewText(aniversarioN) {
  const i = aniversarioN - PREVIEW_FIRST_ANNIVERSARY;
  return PREVIEW_TEXTS[((i % 10) + 10) % 10];
}

// Construye asunto + HTML. picked puede venir de pickMemoriesForEmail(..., {commit}).
function buildEmail({ now = new Date(), picked } = {}) {
  const s = stats(now);
  if (picked === undefined) {
    picked = pickMemoriesForEmail(s.currentYear, { commit: false });
  }

  const asunto = `¡Feliz ${s.s_añosNoviazgo}º Aniversario! 🥂`;
  const preheader = previewText(s.añosNoviazgo);
  const ctaUrl = `${config.SITE_URL}/nuevo`;

  const memF = picked ? picked.felipe : null;
  const memR = picked ? picked.fernanda : null;
  const randomYear = picked ? picked.year : s.currentYear;

  const cofre = picked ? `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-top: 10px; margin-bottom: 25px; border: 2px solid #FFFFFF; border-radius: 8px;">
            <tr>
                <td width="120" style="padding: 10px; text-align: center; border-right: 2px solid #FFFFFF; background-color: #F35560; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">
                    <span style="font-size: 40px; font-weight: 900; color: #FFFFFF; line-height: 1;">${randomYear}</span>
                </td>
                <td width="*" style="padding: 20px; text-align: left; background-color: #F02D3A; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">
                    <p style="margin: 0; font-size: 14px;">Felipe y Fernanda del pasado les han dejado estos buenos recuerdos.</p>
                </td>
            </tr>
        </table>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center" style="margin-top: 50px; margin-bottom: 50px;">
            <!-- Mensaje Felipe -->
            <tr><td style="padding: 10px 0;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                        <td style="vertical-align: bottom;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" align="left" style="background-color: #E2EADD; border-radius: 25px 25px 0 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                                <tr>
                                    <td style="padding: 15px 18px; color: #273043; text-align: left;">
                                        <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 14px; color: #F02D3A;">Felipe:</p>
                                        <i style="display: block; font-size: 14px; line-height: 1.4;">Mi recuerdo favorito de ese año fue: ${esc(memF.body)}</i>
                                        ${songLine(memF)}
                                        <p style="margin: 8px 0 0 0; font-size: 10px; text-align: right; color: #444;">Enviado el ${fmtTimestamp(memF.updated_at)}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                        <td width="70" style="padding-left: 10px; vertical-align: bottom;">
                            <img src="${config.SITE_URL}/avatars/felipe.png" alt="Avatar" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFFFFF; display: block;">
                        </td>
                    </tr>
                </table>
            </td></tr>

            <!-- Mensaje Fernanda -->
            <tr><td style="padding: 10px 0;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" align="center">
                    <tr>
                        <td width="70" style="padding-right: 5px; vertical-align: bottom;">
                            <img src="${config.SITE_URL}/avatars/fernanda.png" alt="Avatar" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #FFFFFF; display: block;">
                        </td>
                        <td style="vertical-align: bottom; text-align: right;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" align="right" style="background-color: #EFF6EE; border-radius: 25px 25px 25px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                                <tr>
                                    <td style="padding: 15px 18px; color: #273043; text-align: left;">
                                        <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 14px; color: #F02D3A;">Fernanda:</p>
                                        <i style="display: block; font-size: 14px; line-height: 1.4;">Mi recuerdo favorito de ese año fue: ${esc(memR.body)}</i>
                                        ${songLine(memR)}
                                        <p style="margin: 8px 0 0 0; font-size: 10px; text-align: left; color: #444;">Enviado el ${fmtTimestamp(memR.updated_at)}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td></tr>
        </table>` : `
        <p style="font-size: 14px; color: #FFFFFF; margin: 20px 0;">El cofre está esperando sus primeros recuerdos. ❤️</p>`;

  const htmlBody = `
<!-- Preview text (texto gris junto al asunto en la bandeja) -->
<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}${'&#847; &zwnj; &nbsp; '.repeat(30)}</div>
<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">

    <!-- 1. HEADER -->
    <table width="600" border="0" cellspacing="0" cellpadding="0"
           style="background-color: #F02D3A; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); margin: 0 auto 20px auto;">
      <tr>
        <td style="padding: 30px 20px; color: #FFFFFF; text-align: center;">
          <h1 style="margin: 0; font-size: 32px;">🥂 !Feliz Aniversario!</h1>
        </td>
      </tr>
    </table>

    <!-- 2. AÑOS Y AVATARES -->
    <table width="600" border="0" cellspacing="0" cellpadding="0"
           style="background-color: #EFF6EE; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); margin: 0 auto 20px auto;">
      <tr>
        <td style="padding: 40px 60px 56px 60px; text-align: center;">
          <p style="font-size: 100px; font-weight: 1000; margin: 0; line-height: 1; color: #F02D3A; margin-bottom: 12px;">${s.s_añosNoviazgo}</p>
          <p style="font-size: 24px; font-weight: bold; margin: 5px 0 0 0; color: #F02D3A;">AÑOS DE RELACIÓN</p>

          <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin-top: 20px; margin-bottom: 20px;">
              <tr>
                  <td style="padding-right: 10px; text-align: center;">
                      <img src="${config.SITE_URL}/avatars/felipe.png" alt="Avatar de Felipe" style="width: 70px; height: 70px; border-radius: 50%; border: 4px solid #F02D3A; display: block; margin: 0 auto;">
                      <p style="margin: 8px 0 0 0; font-size: 12px; color: #273043; font-weight: bold;">Felipe G.</p>
                  </td>
                  <td style="padding: 0 10px; vertical-align: middle;">
                      <span style="font-size: 30px; font-weight: 900; color: #a0bd9d; line-height: 1;">+</span>
                  </td>
                  <td style="padding-left: 10px; text-align: center;">
                      <img src="${config.SITE_URL}/avatars/fernanda.png" alt="Avatar de Fernanda" style="width: 70px; height: 70px; border-radius: 50%; border: 4px solid #F02D3A; display: block; margin: 0 auto;">
                      <p style="margin: 8px 0 0 0; font-size: 12px; color: #273043; font-weight: bold;">Fernanda G.</p>
                  </td>
              </tr>
          </table>

          <div style="background-color: #E2EADD; border-radius: 12px; padding: 15px 20px; margin: 20px auto 0 auto; max-width: 80%;">
            <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #273043; text-align: center;">Después de aquel día en el coche de Felipe afuera de la casa de Fernanda. ❤️</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- 3. ESTADÍSTICAS -->
    <table width="600" border="0" cellspacing="0" cellpadding="0"
           style="background-color: #273043; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); margin: 0 auto 20px auto;">
      <tr><td style="padding: 40px 40px 40px 40px; text-align: left;">
        <p style="font-size: 18px; margin-bottom: 20px; color: #F02D3A; font-weight: bold; text-align: left;">Nuestras Fechas Importantes</p>

        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; margin-bottom: 30px; border: 2px solid #9197AE; border-radius: 8px;">
            <tr>
                <td width="50%" style="padding: 20px 10px; text-align: center; border-right: 2px solid #9197AE; color: #FFFFFF; background-color: #3D4556; border-top-left-radius: 6px; border-bottom-left-radius: 6px;">
                    <span style="font-size: 14px; font-weight: bold;">Inicio de la Aventura</span><br>
                    <span style="font-size: 14px; font-weight: bold;">(24 de Nov, 2018)</span><br>
                    <span style="font-size: 14px; color: #F02D3A;">${s.s_añosNoviazgo} años</span>
                </td>
                <td width="50%" style="padding: 20px 10px; text-align: center; color: #FFFFFF; border-top-right-radius: 6px; border-bottom-right-radius: 6px;">
                    <span style="font-size: 14px; font-weight: bold;">Matrimonio</span><br>
                    <span style="font-size: 14px; font-weight: bold;">(14 de Ago, 2021)</span><br>
                    <span style="font-size: 14px; color: #F02D3A;">${s.s_añosMatrimonio} años</span>
                </td>
            </tr>
        </table>

        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• Día #<b style="color: #F02D3A;">${s.s_diasRelacion}</b> de relación.</p>
        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• Más de <b style="color: #F02D3A;">${s.s_horasJuntos}</b> horas juntos.</p>
        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• <b style="color: #F02D3A;">${s.s_lunasLlenas}</b> ciclos lunares completos.</p>
        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• <b style="color: #F02D3A;">${s.s_porcentajeVida_fer}</b>% de mi vida a tu lado. (Fernanda)</p>
        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• <b style="color: #F02D3A;">${s.s_porcentajeVida_felipe}</b>% de mi vida a tu lado. (Felipe)</p>
        <p style="font-size: 14px; color: #FFFFFF; margin: 18px 0;">• Faltan <b style="color: #F02D3A;">${s.s_diasHito}</b> días para nuestro ${s.s_hitoN}º Aniversario.</p>
      </td></tr>
    </table>

    <!-- 4. COFRE DE RECUERDOS -->
    <table width="600" border="0" cellspacing="0" cellpadding="0"
           style="background-color: #F02D3A; border-radius: 12px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); margin: 0 auto;">
      <tr><td style="padding: 32px 40px 32px 40px; font-size: 14px; color: #FFFFFF; text-align: center;">

        <p style="font-size: 18px; font-weight: bold; margin-bottom: 25px; color: #FFFFFF; text-align: left;">Cofre de Recuerdos</p>
        ${cofre}
        <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin-top: 15px; margin-bottom: 35px;">
            <tr>
                <td align="center" style="border-radius: 999px; background-color: #273043; padding: 12px 25px;">
                    <a href="${ctaUrl}" target="_blank" style="font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none; display: inline-block;">
                        Escribe un recuerdo del ${s.s_currentYear} para nuestro yo del futuro
                    </a>
                </td>
            </tr>
        </table>

      </td></tr>
    </table>
</div>`;

  return { asunto, htmlBody, picked, stats: s };
}

// Recordatorio del 1 de diciembre (solo a quien no ha escrito su recuerdo del año).
function buildReminder({ name, year }) {
  const asunto = `📝 ${name}, falta tu recuerdo del ${year}`;
  const htmlBody = `
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tienes hasta el 31 de diciembre para guardarlo en el cofre.</div>
<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
  <table width="600" border="0" cellspacing="0" cellpadding="0"
         style="background-color: #F02D3A; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); margin: 0 auto;">
    <tr><td style="padding: 36px 40px; color: #FFFFFF; text-align: center;">
      <p style="font-size: 22px; font-weight: bold; margin: 0 0 14px 0;">Hola, ${esc(name)} 👋</p>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        El cofre de ${year} sigue esperando tu recuerdo favorito del año.<br>
        Tienes hasta el <b>31 de diciembre</b> para escribirlo.
      </p>
      <table border="0" cellspacing="0" cellpadding="0" align="center">
        <tr><td align="center" style="border-radius: 999px; background-color: #273043; padding: 12px 25px;">
          <a href="${config.SITE_URL}/nuevo" target="_blank" style="font-size: 16px; font-weight: bold; color: #FFFFFF; text-decoration: none; display: inline-block;">
            Escribir mi recuerdo del ${year}
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
  return { asunto, htmlBody };
}

module.exports = { buildEmail, buildReminder, previewText, PREVIEW_TEXTS };
