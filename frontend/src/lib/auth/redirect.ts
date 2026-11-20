/**
 * Valida el destino de "?next=" para evitar redirecciones a otros sitios
 * (open redirect). Solo acepta rutas internas como "/dashboard/agenda".
 */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
