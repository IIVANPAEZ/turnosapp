import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los links de los emails de Supabase (confirmar cuenta,
 * recuperar contraseña). Acepta los dos formatos:
 *  - ?token_hash=...&type=...  → verifyOtp (sirve aunque se abra en otro dispositivo)
 *  - ?code=...                 → exchangeCodeForSession (flujo PKCE, mismo navegador)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("[auth/confirm] verifyOtp:", error.code, error.message);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("[auth/confirm] exchangeCode:", error.code, error.message);
  }

  if (ok) {
    // next puede traer query (?x=1), por eso se resuelve contra el origen.
    return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }

  return NextResponse.redirect(new URL("/login?error=link", request.nextUrl.origin));
}
