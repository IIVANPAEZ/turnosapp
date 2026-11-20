// Variables públicas de Supabase (definidas en .env.local; ver .env.example).
// Se referencian de forma literal para que Next las inyecte en el bundle del navegador.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copiá frontend/.env.example a frontend/.env.local y completalas.",
  );
}

export const SUPABASE_URL = url;
export const SUPABASE_PUBLISHABLE_KEY = publishableKey;
