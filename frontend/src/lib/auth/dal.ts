import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Data Access Layer: único lugar donde el servidor resuelve "quién es el
 * usuario" y "cuál es su negocio". Las páginas y Server Actions del panel
 * deben pasar por acá (no confiar solo en el proxy).
 *
 * Con cacheComponents activo, quien llame a estas funciones tiene que estar
 * dentro de un <Suspense> (leen cookies del request).
 */

export type CurrentUser = {
  id: string;
  email: string | null;
};

type BusinessCategory = Database["public"]["Enums"]["business_category"];
type MemberRole = Database["public"]["Enums"]["member_role"];

export type CurrentBusiness = {
  business: {
    id: string;
    name: string;
    slug: string;
    category: BusinessCategory;
    timezone: string;
    currency: string;
  };
  member: {
    id: string;
    role: MemberRole;
    displayName: string;
    color: string;
  };
};

/** Usuario con sesión válida, o null. Se resuelve una sola vez por request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  // getClaims() verifica la firma del JWT (no confía ciegamente en la cookie).
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

/** Igual que getCurrentUser, pero redirige a /login si no hay sesión. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type CurrentProfile = {
  fullName: string | null;
  phone: string | null;
};

/** Perfil (nombre y celular) del usuario actual, o null. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el perfil: ${error.message}`);
  return data ? { fullName: data.full_name, phone: data.phone } : null;
});

/** Negocio del usuario actual (MVP: uno solo) y su rol en él, o null. */
export const getCurrentBusiness = cache(async (): Promise<CurrentBusiness | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_members")
    .select(
      "id, role, display_name, color, business:businesses (id, name, slug, category, timezone, currency)",
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`No se pudo leer el negocio: ${error.message}`);
  if (!data?.business) return null;

  return {
    business: data.business,
    member: {
      id: data.id,
      role: data.role,
      displayName: data.display_name,
      color: data.color,
    },
  };
});

export type BusinessSettings = {
  id: string;
  name: string;
  slug: string;
  category: BusinessCategory;
  description: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  bookingEnabled: boolean;
  bookingMinNotice: number;
  bookingMaxDays: number;
  bookingAutoConfirm: boolean;
  /** Primera vez que alguien del negocio copió o compartió el link (Primeros pasos). */
  bookingLinkSharedAt: string | null;
};

/** Datos editables del negocio actual (pantalla de Configuración). */
export const getBusinessSettings = cache(async (): Promise<BusinessSettings | null> => {
  const current = await getCurrentBusiness();
  if (!current) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, category, description, whatsapp, address, city, booking_enabled, booking_min_notice_minutes, booking_max_days, booking_auto_confirm, booking_link_shared_at",
    )
    .eq("id", current.business.id)
    .single();

  if (error) throw new Error(`No se pudo leer el negocio: ${error.message}`);
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    category: data.category,
    description: data.description,
    whatsapp: data.whatsapp,
    address: data.address,
    city: data.city,
    bookingEnabled: data.booking_enabled,
    bookingMinNotice: data.booking_min_notice_minutes,
    bookingMaxDays: data.booking_max_days,
    bookingAutoConfirm: data.booking_auto_confirm,
    bookingLinkSharedAt: data.booking_link_shared_at,
  };
});

export type BusinessMember = {
  id: string;
  userId: string | null;
  role: MemberRole;
  displayName: string;
  color: string;
  isBookable: boolean;
};

/** Profesionales activos del negocio del usuario actual (dueño primero). */
export const getBusinessMembers = cache(async (): Promise<BusinessMember[]> => {
  const current = await getCurrentBusiness();
  if (!current) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_members")
    .select("id, user_id, role, display_name, color, is_bookable, created_at")
    .eq("business_id", current.business.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`No se pudo leer el equipo: ${error.message}`);

  const roleOrder: Record<MemberRole, number> = { owner: 0, admin: 1, staff: 2 };
  return data
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      role: m.role,
      displayName: m.display_name,
      color: m.color,
      isBookable: m.is_bookable,
    }))
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
});

/**
 * Para páginas del panel: exige sesión y negocio.
 * Sin sesión → /login · sin negocio → /onboarding.
 */
export async function requireBusiness(): Promise<CurrentBusiness & { user: CurrentUser }> {
  const user = await requireUser();
  const current = await getCurrentBusiness();
  if (!current) redirect("/onboarding");
  return { ...current, user };
}
