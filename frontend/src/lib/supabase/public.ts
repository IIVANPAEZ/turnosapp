import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Cliente de Supabase SIN sesión, para la página pública de reservas.
 * Nunca usa las cookies del visitante (aunque sea el dueño con sesión iniciada):
 * solo puede llamar a las funciones públicas (public_business, public_services,
 * public_availability, book_appointment).
 */
export function createPublicClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
