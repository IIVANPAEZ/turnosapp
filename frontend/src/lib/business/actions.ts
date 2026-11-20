"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness, getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { updateMemberSchema, type UpdateMemberInput } from "./members";
import {
  businessSettingsSchema,
  onboardingSchema,
  type BusinessSettingsInput,
  type OnboardingInput,
} from "./schemas";
import { slugProblem } from "./slug";

export type SlugAvailability =
  | { status: "available" }
  | { status: "taken" }
  | { status: "invalid"; message: string };

/** ¿Está libre esta dirección pública? Lo usa el formulario mientras escribís. */
export async function checkSlugAvailability(slug: string): Promise<SlugAvailability> {
  const problem = slugProblem(slug);
  if (problem) return { status: "invalid", message: problem };

  if (!(await getCurrentUser())) return { status: "invalid", message: "Tu sesión venció." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_slug_available", { p_slug: slug });
  if (error) {
    console.error("[onboarding] is_slug_available:", error.code, error.message);
    return { status: "invalid", message: "No pudimos verificar la dirección. Probá de nuevo." };
  }
  return data ? { status: "available" } : { status: "taken" };
}

export type CreateBusinessResult = {
  ok: false;
  error: string;
  /** Campo al que corresponde el error, para marcarlo en el formulario. */
  field?: keyof OnboardingInput;
};

/** Crea el negocio y deja al usuario actual como dueño. Si sale bien, redirige al panel. */
export async function createBusiness(input: OnboardingInput): Promise<CreateBusinessResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del formulario." };
  const { name, slug, category, whatsapp, city } = parsed.data;

  if (!(await getCurrentUser())) redirect("/login?next=/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_business", {
    p_name: name,
    p_slug: slug,
    p_category: category,
    // Por ahora el WhatsApp es también el teléfono de contacto del negocio.
    p_phone: whatsapp || undefined,
    p_whatsapp: whatsapp || undefined,
    p_city: city || undefined,
  });

  if (error) {
    // Códigos definidos en public.create_business (ver migración init_core).
    if (error.code === "23505") {
      return { ok: false, field: "slug", error: "Esa dirección ya está tomada, elegí otra." };
    }
    if (error.code === "P0001" && error.message.includes("already_has_business")) {
      redirect("/dashboard");
    }
    if (error.code === "23514") {
      return { ok: false, error: "Algún dato no es válido. Revisá el formulario." };
    }
    console.error("[onboarding] create_business:", error.code, error.message);
    return { ok: false, error: "No pudimos crear tu negocio. Probá de nuevo en unos minutos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export type UpdateMemberResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Edita nombre visible y color de agenda de un profesional.
 * RLS permite editarse a uno mismo, o a cualquiera del negocio si sos dueño/admin;
 * los permisos por columna impiden tocar rol, negocio o usuario.
 */
export async function updateMember(input: UpdateMemberInput): Promise<UpdateMemberResult> {
  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del formulario." };
  const { memberId, displayName, color } = parsed.data;

  if (!(await getCurrentUser())) redirect("/login?next=/dashboard/profesionales");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_members")
    .update({ display_name: displayName, color })
    .eq("id", memberId)
    .select("id");

  if (error) {
    console.error("[profesionales] update:", error.code, error.message);
    return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }
  // Si RLS no permite la edición, no hay error: simplemente se modifican 0 filas.
  if (!data?.length) return { ok: false, error: "No tenés permiso para editar a este profesional." };

  // Refresca el panel completo (el header muestra nombre y color).
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Cambios guardados." };
}

export type UpdateBusinessResult =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: keyof BusinessSettingsInput };

/** Guarda los datos del negocio actual (pantalla de Configuración). Solo dueño/admin. */
export async function updateBusiness(input: BusinessSettingsInput): Promise<UpdateBusinessResult> {
  const parsed = businessSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del formulario." };
  const { name, slug, category, description, whatsapp, address, city } = parsed.data;

  const current = await getCurrentBusiness();
  if (!current) redirect("/login?next=/dashboard/configuracion");
  if (current.member.role !== "owner" && current.member.role !== "admin") {
    return { ok: false, error: "Solo el dueño o un administrador pueden cambiar estos datos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .update({
      name,
      slug,
      category,
      description: description || null,
      // Por ahora el WhatsApp es también el teléfono de contacto del negocio.
      whatsapp: whatsapp || null,
      phone: whatsapp || null,
      address: address || null,
      city: city || null,
    })
    .eq("id", current.business.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { ok: false, field: "slug", error: "Esa dirección ya está tomada, elegí otra." };
    }
    if (error.code === "23514") return { ok: false, error: "Algún dato no es válido. Revisá el formulario." };
    console.error("[configuracion] update:", error.code, error.message);
    return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }
  if (!data?.length) return { ok: false, error: "No tenés permiso para editar este negocio." };

  // Refresca todo el panel (sidebar, inicio y esta pantalla).
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Cambios guardados." };
}
