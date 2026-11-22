import { addDays, isYMD, startOfWeek } from "@/lib/time/zone";

export type PeriodKey = "hoy" | "semana" | "mes" | "mes-anterior" | "rango";

export const PERIOD_LABELS: Record<Exclude<PeriodKey, "rango">, string> = {
  hoy: "Hoy",
  semana: "Esta semana",
  mes: "Este mes",
  "mes-anterior": "Mes anterior",
};

/** Máximo de días para un rango elegido a mano. */
export const MAX_RANGE_DAYS = 92;

export type Period = {
  key: PeriodKey;
  /** Fechas locales "YYYY-MM-DD", ambas incluidas. */
  from: string;
  to: string;
  /** Período anterior del mismo largo (para comparar). */
  prevFrom: string;
  prevTo: string;
  /** "vs ayer", "vs la semana pasada"… */
  prevLabel: string;
};

const firstOfMonth = (ymd: string) => `${ymd.slice(0, 7)}-01`;
const lastOfMonth = (ymd: string) => addDays(firstOfMonth(addDays(firstOfMonth(ymd), 32)), -1);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Resuelve el período a partir de la dirección (?periodo=…&desde=…&hasta=…). */
export function resolvePeriod(params: Record<string, string | string[] | undefined>, today: string): Period {
  const key = typeof params.periodo === "string" ? params.periodo : "mes";
  if (key === "hoy") return { key, from: today, to: today, prevFrom: addDays(today, -1), prevTo: addDays(today, -1), prevLabel: "vs ayer" };
  if (key === "semana") {
    const from = startOfWeek(today);
    const to = addDays(from, 6);
    return { key, from, to, prevFrom: addDays(from, -7), prevTo: addDays(from, -1), prevLabel: "vs la semana pasada" };
  }
  if (key === "mes-anterior") {
    const from = firstOfMonth(addDays(firstOfMonth(today), -1));
    const prevFrom = firstOfMonth(addDays(from, -1));
    return { key, from, to: lastOfMonth(from), prevFrom, prevTo: lastOfMonth(prevFrom), prevLabel: "vs el mes previo" };
  }
  if (key === "rango" && isYMD(params.desde) && isYMD(params.hasta)) {
    let from = params.desde <= params.hasta ? params.desde : params.hasta;
    const to = params.desde <= params.hasta ? params.hasta : params.desde;
    if (daysBetween(from, to) >= MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
    const len = daysBetween(from, to) + 1;
    return { key, from, to, prevFrom: addDays(from, -len), prevTo: addDays(from, -1), prevLabel: "vs el período anterior" };
  }
  const from = firstOfMonth(today);
  const prevFrom = firstOfMonth(addDays(from, -1));
  return { key: "mes", from, to: lastOfMonth(from), prevFrom, prevTo: lastOfMonth(prevFrom), prevLabel: "vs el mes pasado" };
}
