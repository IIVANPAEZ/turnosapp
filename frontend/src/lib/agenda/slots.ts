import type { DayAvailability } from "./actions";

const STEP = 15;

const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && s2 < e1;

/**
 * Horarios libres para un turno de `duration` minutos, cada 15 min:
 * entran completos en el horario de atención, no pisan turnos ni bloqueos
 * y, si es hoy, todavía no pasaron.
 */
export function freeSlots(day: DayAvailability, duration: number): string[] {
  if (day.isPast) return [];
  const result: string[] = [];
  for (const r of day.hours) {
    const open = toMin(r.start);
    const close = toMin(r.end);
    for (let t = Math.ceil(open / STEP) * STEP; t + duration <= close; t += STEP) {
      if (day.nowMinutes !== null && t <= day.nowMinutes) continue;
      if (day.busy.some((b) => overlaps(t, t + duration, b.startMin, b.endMin))) continue;
      if (day.blocks.some((b) => overlaps(t, t + duration, b.startMin, b.endMin))) continue;
      result.push(toHHMM(t));
    }
  }
  return result;
}

export type TimeCheck = {
  /** Turno con el que se pisa (impide guardar). */
  clash: string | null;
  /** Avisos que permiten "Cargar igual". */
  warnings: string[];
};

/** Revisa una hora elegida (sugerida o a mano). */
export function checkTime(day: DayAvailability, time: string, duration: number, dayLabel: string): TimeCheck {
  const start = toMin(time);
  const end = start + duration;
  const warnings: string[] = [];

  const clash = day.busy.find((b) => overlaps(start, end, b.startMin, b.endMin));

  if (day.isPast || (day.nowMinutes !== null && start < day.nowMinutes)) {
    warnings.push("Es un horario que ya pasó.");
  }
  const block = day.blocks.find((b) => overlaps(start, end, b.startMin, b.endMin));
  if (block) warnings.push(`Ese horario está bloqueado (${block.label}).`);

  const inside = day.hours.some((r) => toMin(r.start) <= start && end <= toMin(r.end));
  if (!inside) {
    warnings.push(
      day.hours.length
        ? `Queda fuera de tu horario del ${dayLabel} (${day.hours.map((r) => `${r.start}–${r.end}`).join(" · ")}).`
        : `El ${dayLabel} no atendés según tu horario.`,
    );
  }

  return { clash: clash ? clash.label : null, warnings };
}
