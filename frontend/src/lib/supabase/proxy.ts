import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Rutas que exigen sesión iniciada. */
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding"];
/** Rutas solo para visitantes: con sesión iniciada no tiene sentido verlas. */
const GUEST_ONLY_PATHS = ["/login", "/registro"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Renueva la sesión de Supabase en cada request y hace redirecciones
 * "optimistas" (solo mira si hay sesión). La autorización real está en
 * src/lib/auth/dal.ts y en las políticas RLS de la base.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 1) Actualiza el request para que el resto del render vea la sesión nueva.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // 2) Recrea la respuesta con ese request y escribe las cookies para el navegador.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // 3) Headers anti-caché que manda Supabase (evita que una CDN guarde sesiones).
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // IMPORTANTE: no poner código entre createServerClient y getClaims().
  // getClaims() valida el JWT y, si venció, lo renueva (dispara setAll).
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;

  if (!isLoggedIn && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(url, response);
  }

  if (isLoggedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectKeepingCookies(url, response);
  }

  return response;
}

const CACHE_HEADERS = ["cache-control", "expires", "pragma"];

/** Redirige sin perder las cookies de sesión (ni los headers anti-caché) recién renovados. */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (CACHE_HEADERS.includes(key.toLowerCase())) redirect.headers.set(key, value);
  });
  return redirect;
}
