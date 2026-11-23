/** Nombre del producto (marca). Se usa en títulos, la app instalada y los textos. */
export const APP_NAME = "TurnoPy";

export const DEFAULT_TIMEZONE = "America/Asuncion";
export const DEFAULT_CURRENCY = "PYG";
export const DEFAULT_LOCALE = "es-PY";

/**
 * Dirección pública de la app (NEXT_PUBLIC_SITE_URL en Vercel / .env.local),
 * ej. "https://turnopy.vercel.app". Cuando haya dominio propio, se cambia
 * solo la variable.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://turnopy.vercel.app").replace(/\/+$/, "");

/** Lo que se muestra antes del link de cada negocio (ej. "turnopy.vercel.app/salon-ana"). */
export const PUBLIC_SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");
