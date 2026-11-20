"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { safeNext } from "./redirect";
import {
  forgotPasswordSchema,
  loginSchema,
  signUpSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type SignUpInput,
  type UpdatePasswordInput,
} from "./schemas";

/** Resultado de una acción cuando no termina en redirect. */
export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const INVALID_DATA: ActionResult = { ok: false, error: "Revisá los datos del formulario." };

/** URL base del sitio (http://localhost:3000 en desarrollo), para los links de los emails. */
async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: authErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect(safeNext(next));
}

export async function signUp(input: SignUpInput): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;
  const { email, password, fullName, phone } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger private.handle_new_user copia estos datos a public.profiles.
      data: { full_name: fullName, phone: phone || null },
      emailRedirectTo: `${await getOrigin()}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) return { ok: false, error: authErrorMessage(error) };

  // Con la confirmación de email apagada, Supabase ya devuelve la sesión.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  return {
    ok: true,
    message: `Te enviamos un email a ${email}. Abrí el link para confirmar tu cuenta.`,
  };
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getOrigin()}/auth/confirm?next=/actualizar-clave`,
  });

  // Solo mostramos errores de límite de envíos; el resto se oculta para no
  // revelar si el email tiene cuenta.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { ok: false, error: authErrorMessage(error) };
  }
  if (error) console.error("[auth] resetPasswordForEmail:", error.code, error.message);

  return {
    ok: true,
    message: "Si ese email tiene una cuenta, te va a llegar un link para crear una contraseña nueva.",
  };
}

export async function updatePassword(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return INVALID_DATA;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { ok: false, error: "El link venció. Pedí uno nuevo desde “Olvidé mi contraseña”." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
