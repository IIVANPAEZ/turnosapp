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

/** 350000 → "₲ 350 mil" · 1250000 → "₲ 1,3 M" (para ejes de gráficos). */
export function formatPYGCompact(value: number): string {
  if (value >= 1_000_000) {
    const m = Math.round(value / 100_000) / 10;
    return `₲ ${String(m).replace(".", ",")} M`;
  }
  if (value >= 1_000) return `₲ ${Math.round(value / 1_000)} mil`;
  return formatPYG(value);
}
