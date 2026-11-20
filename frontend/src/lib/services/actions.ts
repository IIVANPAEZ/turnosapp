"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema, type ServiceInput } from "./schemas";
import { SERVICE_TEMPLATES } from "./templates";

export type ServiceActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: keyof ServiceInput };

const SERVICES_PATH = "/dashboard/servicios";

/** Negocio actual, exigiendo rol dueño/admin. Devuelve el id o un error. */
async function requireManager(): Promise<{ businessId: string } | { error: string }> {
  const current = await getCurrentBusiness();
  if (!current) redirect(`/login?next=${SERVICES_PATH}`);
  if (current.member.role !== "owner" && current.member.role !== "admin") {
    return { error: "Solo el dueño o un administrador pueden cambiar los servicios." };
  }
  return { businessId: current.business.id };
}

/** Traduce errores de Postgres a mensajes para el usuario. */
function dbError(error: { code: string; message: string }, context: string): ServiceActionResult {
  if (error.code === "23505") {
    return { ok: false, field: "name", error: "Ya tenés un servicio con ese nombre." };
  }
  if (error.code === "23514") return { ok: false, error: "Algún dato no es válido. Revisá el formulario." };
  console.error(`[servicios] ${context}:`, error.code, error.message);
  return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
}

function toRow(values: ReturnType<typeof serviceSchema.parse>) {
  return {
    name: values.name,
    description: values.description || null,
    duration_minutes: values.durationMinutes,
    price: values.price,
    price_type: values.priceType,
    is_active: values.isActive,
  };
}

export async function createService(input: ServiceInput): Promise<ServiceActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del formulario." };
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .insert({ business_id: manager.businessId, ...toRow(parsed.data) });
  if (error) return dbError(error, "create");

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: "Servicio creado." };
}

export async function updateService(id: string, input: ServiceInput): Promise<ServiceActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisá los datos del formulario." };
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("business_id", manager.businessId)
    .select("id");
  if (error) return dbError(error, "update");
  if (!data?.length) return { ok: false, error: "No encontramos ese servicio." };

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: "Cambios guardados." };
}

export async function setServiceActive(id: string, isActive: boolean): Promise<ServiceActionResult> {
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("business_id", manager.businessId)
    .select("id");
  if (error) return dbError(error, "toggle");
  if (!data?.length) return { ok: false, error: "No encontramos ese servicio." };

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: isActive ? "Servicio activado." : "Servicio pausado." };
}

/** Copia un servicio como "<nombre> (copia)", "(copia 2)", … y lo deja pausado. */
export async function duplicateService(id: string): Promise<ServiceActionResult> {
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const supabase = await createClient();
  const { data: rows, error: readError } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, price_type")
    .eq("business_id", manager.businessId);
  if (readError) return dbError(readError, "duplicate/read");

  const original = rows.find((r) => r.id === id);
  if (!original) return { ok: false, error: "No encontramos ese servicio." };

  const taken = new Set(rows.map((r) => r.name.trim().toLowerCase()));
  const base = original.name.slice(0, 68);
  let name = `${base} (copia)`;
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (copia ${n})`;

  const { error } = await supabase.from("services").insert({
    business_id: manager.businessId,
    name,
    description: original.description,
    duration_minutes: original.duration_minutes,
    price: original.price,
    price_type: original.price_type,
    // Pausado: así no aparece en la página pública hasta que lo revises.
    is_active: false,
  });
  if (error) return dbError(error, "duplicate");

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: `Creamos "${name}" (pausado).` };
}

export async function deleteService(id: string): Promise<ServiceActionResult> {
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("business_id", manager.businessId)
    .select("id");
  if (error) {
    // 23503: tiene turnos asociados (a partir del Sprint 3).
    if (error.code === "23503") {
      return { ok: false, error: "Este servicio tiene turnos. Pausalo en lugar de eliminarlo." };
    }
    return dbError(error, "delete");
  }
  if (!data?.length) return { ok: false, error: "No encontramos ese servicio." };

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: "Servicio eliminado." };
}

/** Agrega servicios desde las plantillas del rubro, salteando nombres que ya existen. */
export async function addServiceTemplates(keys: string[]): Promise<ServiceActionResult> {
  const current = await getCurrentBusiness();
  if (!current) redirect(`/login?next=${SERVICES_PATH}`);
  const manager = await requireManager();
  if ("error" in manager) return { ok: false, error: manager.error };

  const templates = SERVICE_TEMPLATES[current.business.category].filter((t) => keys.includes(t.key));
  if (templates.length === 0) return { ok: false, error: "Elegí al menos un servicio." };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("services")
    .select("name")
    .eq("business_id", manager.businessId);
  if (readError) return dbError(readError, "templates/read");

  const taken = new Set(existing.map((r) => r.name.trim().toLowerCase()));
  const rows = templates
    .filter((t) => !taken.has(t.name.toLowerCase()))
    .map((t, i) => ({
      business_id: manager.businessId,
      name: t.name,
      duration_minutes: t.durationMinutes,
      price: t.price,
      price_type: t.priceType,
      sort_order: i,
    }));
  if (rows.length === 0) return { ok: true, message: "Esos servicios ya estaban cargados." };

  const { error } = await supabase.from("services").insert(rows);
  if (error) return dbError(error, "templates");

  revalidatePath(SERVICES_PATH);
  return { ok: true, message: `Agregamos ${rows.length} servicio${rows.length === 1 ? "" : "s"}. Revisá los precios.` };
}
