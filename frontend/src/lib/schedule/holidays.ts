/**
 * Feriados nacionales de Paraguay, como sugerencias para bloquear.
 *
 * - Fechas fijas según la legislación vigente.
 * - Jueves y Viernes Santo se calculan a partir de la Pascua.
 * - `movable`: feriados que la ley permite trasladar (suelen pasar a lunes);
 *   la app muestra la fecha original y avisa que conviene confirmarla.
 */

export type Holiday = {
  /** "YYYY-MM-DD" (fecha local) */
  date: string;
  name: string;
  movable: boolean;
};

const FIXED: { month: number; day: number; name: string; movable?: boolean }[] = [
  { month: 1, day: 1, name: "Año Nuevo" },
  { month: 3, day: 1, name: "Día de los Héroes", movable: true },
  { month: 5, day: 1, name: "Día del Trabajador" },
  { month: 5, day: 14, name: "Independencia Nacional" },
  { month: 5, day: 15, name: "Independencia Nacional · Día de la Madre" },
  { month: 6, day: 12, name: "Paz del Chaco", movable: true },
  { month: 8, day: 15, name: "Fundación de Asunción" },
  { month: 9, day: 29, name: "Victoria de Boquerón", movable: true },
  { month: 12, day: 8, name: "Virgen de Caacupé" },
  { month: 12, day: 25, name: "Navidad" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Domingo de Pascua (algoritmo anónimo gregoriano / Meeus). Devuelve [mes, día]. */
function easterSunday(year: number): [number, number] {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** Resta días a una fecha (mes/día) del mismo año, en UTC para no depender de la zona. */
function minusDays(year: number, month: number, day: number, days: number): string {
  const t = new Date(Date.UTC(year, month - 1, day - days));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function holidaysForYear(year: number): Holiday[] {
  const [em, ed] = easterSunday(year);
  const list: Holiday[] = [
    ...FIXED.map((h) => ({ date: iso(year, h.month, h.day), name: h.name, movable: !!h.movable })),
    { date: minusDays(year, em, ed, 3), name: "Jueves Santo", movable: false },
    { date: minusDays(year, em, ed, 2), name: "Viernes Santo", movable: false },
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Feriados desde `today` (inclusive) hasta dentro de `months` meses. Fechas "YYYY-MM-DD". */
export function upcomingHolidays(today: string, months = 12): Holiday[] {
  const year = Number(today.slice(0, 4));
  const [y, m, d] = today.split("-").map(Number);
  const limit = new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10);
  return [...holidaysForYear(year), ...holidaysForYear(year + 1)].filter((h) => h.date >= today && h.date <= limit);
}
