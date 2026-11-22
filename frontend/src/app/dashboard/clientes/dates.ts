import { MONTHS_LONG, MONTHS_SHORT } from "@/lib/time/zone";

/** "23 nov" (o "23 nov 2025" si es de otro año). */
export function dayMonth(ymd: string, today: string): string {
  const label = `${Number(ymd.slice(8, 10))} ${MONTHS_SHORT[Number(ymd.slice(5, 7)) - 1]}`;
  return ymd.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${ymd.slice(0, 4)}`;
}

/** "noviembre de 2026" */
export function monthYear(ymd: string): string {
  return `${MONTHS_LONG[Number(ymd.slice(5, 7)) - 1]} de ${ymd.slice(0, 4)}`;
}
