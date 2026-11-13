#!/usr/bin/env node
// Genera el HTML del correo (sin enviarlo) para revisarlo en el navegador.
// Uso: node scripts/preview-email.js [salida.html] [--fecha 2026-11-24]
const fs = require('fs');
const { buildEmail } = require('../lib/emailTemplate');

const args = process.argv.slice(2);
const out = args.find(a => !a.startsWith('--')) || 'preview-email.html';
const fi = args.indexOf('--fecha');
const now = fi !== -1 ? new Date(args[fi + 1] + 'T12:00:00-08:00') : new Date();

const { asunto, htmlBody, picked } = buildEmail({ now });
fs.writeFileSync(out, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${asunto}</title></head>
<body style="margin:0"><div style="font-family:Arial;background:#273043;color:#fff;padding:10px 20px">
<b>Asunto:</b> ${asunto}</div>${htmlBody}</body></html>`);
console.log('Asunto:', asunto);
console.log('Recuerdos citados:', picked ? `año ${picked.year} (F#${picked.felipe.id}, R#${picked.fernanda.id})` : 'ninguno (pool vacío)');
console.log('Vista previa:', out);
