import type { AuthError } from "@supabase/supabase-js";

// Traducción de los códigos de error de Supabase Auth a mensajes para el usuario.
// Lista completa: node_modules/@supabase/auth-js/dist/module/lib/error-codes.d.ts
const MESSAGES: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed: "Todavía no confirmaste tu email. Revisá tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese email. Probá ingresar.",
  email_exists: "Ya existe una cuenta con ese email. Probá ingresar.",
  weak_password: "La contraseña es muy débil. Probá con una más larga.",
  same_password: "La nueva contraseña tiene que ser distinta a la anterior.",
  email_address_invalid: "Ese email no es válido.",
  over_email_send_rate_limit: "Se enviaron demasiados emails. Esperá unos minutos y probá de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
  signup_disabled: "El registro está deshabilitado por el momento.",
  user_banned: "Esta cuenta está suspendida.",
  session_not_found: "Tu sesión venció. Volvé a ingresar.",
  session_expired: "Tu sesión venció. Volvé a ingresar.",
  otp_expired: "El link venció o ya fue usado. Pedí uno nuevo.",
  flow_state_expired: "El link venció. Pedí uno nuevo.",
  flow_state_not_found: "El link no es válido. Pedí uno nuevo.",
  bad_code_verifier: "Abrí el link en el mismo navegador donde lo pediste.",
};

export const GENERIC_ERROR = "Algo salió mal. Probá de nuevo en unos minutos.";

export function authErrorMessage(error: Pick<AuthError, "code" | "message"> | null | undefined) {
  if (!error) return GENERIC_ERROR;
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];
  // Log para diagnosticar códigos que todavía no traducimos.
  console.error("[auth] error sin traducir:", error.code, error.message);
  return GENERIC_ERROR;
}
