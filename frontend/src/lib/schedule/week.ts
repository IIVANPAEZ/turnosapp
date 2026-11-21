import { WEEKDAYS, type TimeRange, type WeekHours, type Weekday } from "./constants";

/** "08:30" → 510 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Ordena las franjas de un día por hora de inicio. */
export function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/**
 * Problemas de un día, por índice de franja (en el orden en que se muestran).
 * Las mismas reglas que la base: fin > inicio y sin superposiciones.
 */
export function dayProblems(ranges: TimeRange[]): Record<number, string> {
  const problems: Record<number, string> = {};
  ranges.forEach((r, i) => {
    if (toMinutes(r.end) <= toMinutes(r.start)) problems[i] = "La hora de cierre tiene que ser después de la de apertura";
  });
  ranges.forEach((a, i) => {
    ranges.forEach((b, j) => {
      if (i >= j || problems[i] || problems[j]) return;
      const overlap = toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
      if (overlap) problems[j] = "Este horario se pisa con otro del mismo día";
    });
  });
  return problems;
}

export function weekHasProblems(week: WeekHours): boolean {
  return WEEKDAYS.some((d) => Object.keys(dayProblems(week[d.value])).length > 0);
}

/** Semana → filas para set_working_hours. */
export function weekToRows(week: WeekHours): { weekday: Weekday; start: string; end: string }[] {
  return WEEKDAYS.flatMap((d) => sortRanges(week[d.value]).map((r) => ({ weekday: d.value, ...r })));
}

/** Rango de horas a mostrar en las tiras (mínimo 8–20, se amplía si hace falta). */
export function visibleHours(week: WeekHours): { from: number; to: number } {
  const all = WEEKDAYS.flatMap((d) => week[d.value]);
  let from = 8;
  let to = 20;
  for (const r of all) {
    from = Math.min(from, Math.floor(toMinutes(r.start) / 60));
    to = Math.max(to, Math.ceil(toMinutes(r.end) / 60));
  }
  // Rango par para que las marcas de hora (cada 2 h) queden prolijas.
  if ((to - from) % 2) to = Math.min(24, to + 1);
  return { from, to };
}

/** Total de horas abiertas por semana: "45 h" o "42 h 30 min". */
export function weeklyTotal(week: WeekHours): string {
  const minutes = WEEKDAYS.reduce(
    (acc, d) => acc + week[d.value].reduce((sum, r) => sum + Math.max(0, toMinutes(r.end) - toMinutes(r.start)), 0),
    0,
  );
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Horas abiertas de un día: "9 h" o "4 h 30". */
export function dayTotal(ranges: TimeRange[]): string {
  const minutes = ranges.reduce((sum, r) => sum + Math.max(0, toMinutes(r.end) - toMinutes(r.start)), 0);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m}` : `${h} h`;
}

/**
 * Pausa sugerida para un día: dentro del horario más largo, a las 12:00 si
 * entra; si no, en el medio. Devuelve null si ningún horario dura 1 h o más.
 */
export function suggestPause(ranges: TimeRange[]): { start: string; minutes: number } | null {
  const longest = [...ranges].sort(
    (a, b) => toMinutes(b.end) - toMinutes(b.start) - (toMinutes(a.end) - toMinutes(a.start)),
  )[0];
  if (!longest) return null;
  const s = toMinutes(longest.start);
  const e = toMinutes(longest.end);
  if (e - s < 60) return null;
  const minutes = e - s >= 120 ? 60 : 30;
  let start = 12 * 60;
  if (!(s < start && start + minutes < e)) start = Math.round((s + (e - s) / 2 - minutes / 2) / 15) * 15;
  return { start: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`, minutes };
}

/**
 * Inserta una pausa [start, start + minutes) partiendo en dos el horario que la contiene.
 * Devuelve las franjas nuevas, o un error si la pausa no cae dentro de un horario.
 */
export function insertPause(
  ranges: TimeRange[],
  start: string,
  end: string,
): { ranges: TimeRange[] } | { error: string } {
  const ps = toMinutes(start);
  const pe = toMinutes(end);
  if (pe <= ps) return { error: "La pausa tiene que terminar después de empezar." };
  const sorted = sortRanges(ranges);
  const idx = sorted.findIndex((r) => toMinutes(r.start) < ps && pe < toMinutes(r.end));
  if (idx === -1) {
    const list = sorted.map((r) => `${r.start} a ${r.end}`).join(" o de ");
    return { error: `La pausa tiene que quedar dentro de tu horario (de ${list}).` };
  }
  const r = sorted[idx];
  return {
    ranges: [...sorted.slice(0, idx), { start: r.start, end: start }, { start: end, end: r.end }, ...sorted.slice(idx + 1)],
  };
}
