/**
 * Fechas y horas en la zona horaria del negocio, sin dependencias.
 * Funciona igual en servidor y navegador. Las fechas locales se manejan como
 * texto "YYYY-MM-DD" y las horas como "HH:mm" para no mezclar zonas.
 */

export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
export const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const WEEKDAYS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const pad = (n: number) => String(n).padStart(2, "0");

export type LocalParts = { ymd: string; hhmm: string; minutes: number; year: number; month: number; day: number };

/** Partes de un instante en la zona dada. */
export function localParts(date: Date, timeZone: string): LocalParts {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  const hour = Number(p.hour);
  const minute = Number(p.minute);
  return {
    ymd: `${p.year}-${p.month}-${p.day}`,
    hhmm: `${pad(hour)}:${pad(minute)}`,
    minutes: hour * 60 + minute,
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
  };
}

/** Diferencia (en minutos) entre la hora local de la zona y UTC, en ese instante. */
function offsetMinutes(utcMs: number, timeZone: string) {
  const p = localParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, Math.floor(p.minutes / 60), p.minutes % 60);
  return Math.round((asUtc - Math.floor(utcMs / 60000) * 60000) / 60000);
}

/** "2026-11-23" + "14:30" en la zona del negocio → instante (Date). */
export function zonedToUtc(ymd: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let utc = guess - offsetMinutes(guess, timeZone) * 60000;
  // Segunda pasada por si el desfase cambia justo en ese día (horario de verano).
  const second = offsetMinutes(utc, timeZone);
  utc = guess - second * 60000;
  return new Date(utc);
}

/** Hoy "YYYY-MM-DD" en la zona dada. */
export function todayYMD(timeZone: string): string {
  return localParts(new Date(), timeZone).ymd;
}

/** ¿Es "YYYY-MM-DD" válido? */
export function isYMD(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Día de la semana: 0 = domingo … 6 = sábado. */
export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Día ISO: 1 = lunes … 7 = domingo. */
export function isoWeekday(ymd: string): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const d = weekdayOf(ymd);
  return (d === 0 ? 7 : d) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** Lunes de la semana de esa fecha. */
export function startOfWeek(ymd: string): string {
  return addDays(ymd, 1 - isoWeekday(ymd));
}

/** "Sábado 21 de noviembre" (+ año si no es el actual). */
export function longDayLabel(ymd: string, currentYear?: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const year = currentYear && currentYear !== y ? ` de ${y}` : "";
  return `${WEEKDAYS_LONG[weekdayOf(ymd)]} ${d} de ${MONTHS_LONG[m - 1]}${year}`;
}

/** "Lun 23" */
export function shortDayLabel(ymd: string): string {
  return `${WEEKDAYS_SHORT[weekdayOf(ymd)]} ${Number(ymd.slice(8, 10))}`;
}

/** "16 – 22 de noviembre" · "30 de noviembre – 6 de diciembre" */
export function weekRangeLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const [, m1, d1] = monday.split("-").map(Number);
  const [, m2, d2] = sunday.split("-").map(Number);
  return m1 === m2
    ? `${d1} – ${d2} de ${MONTHS_LONG[m2 - 1]}`
    : `${d1} de ${MONTHS_LONG[m1 - 1]} – ${d2} de ${MONTHS_LONG[m2 - 1]}`;
}

/** "08:30" → 510 */
export function hhmmToMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** 510 → "08:30" */
export function minutesToHHMM(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}
