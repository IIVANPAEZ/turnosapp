/**
 * Formatos para mostrar (guaraníes, duraciones). Se arman a mano en vez de
 * Intl para que servidor y navegador produzcan exactamente el mismo texto.
 */

/** 150000 → "150.000" */
export function formatThousands(value: number): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 150000 → "₲ 150.000" */
export function formatPYG(value: number): string {
  return `₲ ${formatThousands(value)}`;
}

/** 30 → "30 min" · 60 → "1 h" · 90 → "1 h 30 min" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
