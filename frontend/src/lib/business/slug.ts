/**
 * Reglas del "slug" (dirección pública del negocio: turnosapp.com/<slug>).
 * IMPORTANTE: deben coincidir con private.is_valid_slug() en la migración
 * supabase/migrations/20261120193638_init_core.sql. La base es la autoridad;
 * esto solo sirve para avisar al usuario sin esperar al servidor.
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "ayuda", "actualizar-clave", "assets",
  "configuracion", "cuenta", "dashboard", "login", "logout", "onboarding",
  "perfil", "precios", "privacidad", "public", "recuperar", "registro",
  "reservar", "soporte", "static", "terminos", "turnos", "www",
]);

/** "Salón Ána & Cía." → "salon-ana-cia" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/** Devuelve el problema del slug en español, o null si el formato es válido. */
export function slugProblem(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Usá al menos ${SLUG_MIN} caracteres`;
  if (slug.length > SLUG_MAX) return `Máximo ${SLUG_MAX} caracteres`;
  if (!SLUG_PATTERN.test(slug) || slug.includes("--")) {
    return "Solo minúsculas, números y guiones (sin guion al inicio o al final)";
  }
  if (RESERVED_SLUGS.has(slug)) return "Esa dirección está reservada, elegí otra";
  return null;
}
