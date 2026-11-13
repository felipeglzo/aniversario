// Fechas clave y cálculos, siempre en la zona horaria local de la pareja.
const config = require('./config');

const TZ = config.TZ_LOCAL;

const RELATIONSHIP_START = { y: 2018, m: 11, d: 24 }; // 24 nov 2018
const WEDDING = { y: 2021, m: 8, d: 14 };             // 14 ago 2021
const BIRTH_FELIPE = { y: 1991, m: 10, d: 8 };
const BIRTH_FERNANDA = { y: 1995, m: 3, d: 24 };
const LUNAR_CYCLE_DAYS = 29.530588;

// Partes de fecha "hoy" en la zona local, como números.
function todayParts(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const [y, m, d] = fmt.format(now).split('-').map(Number);
  return { y, m, d };
}

// Días completos entre dos fechas calendario (sin horas, inmune a DST).
function daysBetween(a, b) {
  const utcA = Date.UTC(a.y, a.m - 1, a.d);
  const utcB = Date.UTC(b.y, b.m - 1, b.d);
  return Math.floor((utcB - utcA) / 86400000);
}

// Años completos entre una fecha y hoy (cumpleaños-style).
function fullYears(from, today) {
  let years = today.y - from.y;
  if (today.m < from.m || (today.m === from.m && today.d < from.d)) years--;
  return years;
}

function nextMilestone(today) {
  // Hitos: 10, 15, 20, 25... años de relación.
  const yearsNow = fullYears(RELATIONSHIP_START, today);
  const milestones = [10, 15, 20, 25, 30, 40, 50];
  const target = milestones.find(n => n > yearsNow) || (Math.floor(yearsNow / 10) * 10 + 10);
  const date = { y: RELATIONSHIP_START.y + target, m: RELATIONSHIP_START.m, d: RELATIONSHIP_START.d };
  return { n: target, days: daysBetween(today, date) };
}

function fmtInt(n) {
  return Math.round(n).toLocaleString('es-MX');
}

// Todas las variables que usa la plantilla del correo y el sitio.
function stats(now = new Date()) {
  const today = todayParts(now);
  const diasRelacion = daysBetween(RELATIONSHIP_START, today);
  const añosNoviazgo = fullYears(RELATIONSHIP_START, today);
  const añosMatrimonio = fullYears(WEDDING, today);
  const diasVidaFelipe = daysBetween(BIRTH_FELIPE, today);
  const diasVidaFernanda = daysBetween(BIRTH_FERNANDA, today);
  const hito = nextMilestone(today);
  return {
    today,
    currentYear: today.y,
    añosNoviazgo,
    añosMatrimonio,
    diasRelacion,
    s_añosNoviazgo: String(añosNoviazgo),
    s_añosMatrimonio: String(añosMatrimonio),
    s_diasRelacion: fmtInt(diasRelacion),
    s_horasJuntos: fmtInt(diasRelacion * 24),
    s_lunasLlenas: fmtInt(Math.floor(diasRelacion / LUNAR_CYCLE_DAYS)),
    s_porcentajeVida_felipe: (diasRelacion / diasVidaFelipe * 100).toFixed(1),
    s_porcentajeVida_fer: (diasRelacion / diasVidaFernanda * 100).toFixed(1),
    s_hitoN: hito.n,
    s_diasHito: fmtInt(hito.days),
    s_currentYear: String(today.y)
  };
}

// ¿Está abierta la ventana para crear recuerdos? (24 nov – 31 dic, hora local)
function creationWindowOpen(now = new Date()) {
  const t = todayParts(now);
  return (t.m === 11 && t.d >= 24) || t.m === 12;
}

function isAnniversaryToday(now = new Date()) {
  const t = todayParts(now);
  return t.m === 11 && t.d === 24;
}

function isTestMailDay(now = new Date()) {
  const t = todayParts(now);
  return t.m === Number(config.TEST_MAIL_MONTH) && t.d === Number(config.TEST_MAIL_DAY);
}

module.exports = {
  TZ, RELATIONSHIP_START, WEDDING, stats, todayParts, daysBetween,
  creationWindowOpen, isAnniversaryToday, isTestMailDay, fmtInt
};
