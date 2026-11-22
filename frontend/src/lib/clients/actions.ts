"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/appointments/status";
import { localParts, minutesToHHMM } from "@/lib/time/zone";
import { clientSchema, type ClientInput, type PaymentMethod } from "./schemas";

async function requireCurrent() {
  const current = await getCurrentBusiness();
  if (!current) redirect("/login?next=/dashboard/clientes");
  return current;
}

export type ClientAppointment = {
  id: string;
  date: string;
  start: string;
  end: string;
  serviceName: string;
  price: number;
  priceType: "fixed" | "from";
  status: AppointmentStatus;
  rescheduled: boolean;
  memberName: string;
  online: boolean;
  payment: { amount: number; method: PaymentMethod } | null;
};

export type ClientDetail = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  since: string;
  appointments: ClientAppointment[];
};

/** Ficha del cliente: datos y turnos (dueño/admin: todos; profesional: los suyos). */
export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const current = await requireCurrent();
  const tz = current.business.timezone;
  const seesEveryone = current.member.role === "owner" || current.member.role === "admin";

  const supabase = await createClient();
  let apptQuery = supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, service_name, price, price_type, rescheduled_to, source, member:business_members (display_name), payments (amount, method, voided_at)",
    )
    .eq("business_id", current.business.id)
    .eq("client_id", id)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (!seesEveryone) apptQuery = apptQuery.eq("member_id", current.member.id);

  const [clientRes, apptRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, phone, notes, created_at")
      .eq("business_id", current.business.id)
      .eq("id", id)
      .maybeSingle(),
    apptQuery,
  ]);
  if (clientRes.error) throw new Error(`No se pudo leer el cliente: ${clientRes.error.message}`);
  if (apptRes.error) throw new Error(`No se pudieron leer los turnos: ${apptRes.error.message}`);
  const c = clientRes.data;
  if (!c) return null;

  return {
    id: c.id,
    name: c.full_name,
    phone: c.phone,
    notes: c.notes,
    since: localParts(new Date(c.created_at), tz).ymd,
    appointments: apptRes.data.map((a) => {
      const s = localParts(new Date(a.starts_at), tz);
      const e = localParts(new Date(a.ends_at), tz);
      const paid = a.payments.find((p) => !p.voided_at);
      return {
        id: a.id,
        date: s.ymd,
        start: s.hhmm,
        end: e.ymd === s.ymd ? e.hhmm : minutesToHHMM(24 * 60 - 1),
        serviceName: a.service_name,
        price: a.price,
        priceType: a.price_type,
        status: a.status,
        rescheduled: !!a.rescheduled_to,
        memberName: a.member?.display_name ?? "",
        online: a.source === "online",
        payment: paid ? { amount: paid.amount, method: paid.method } : null,
      };
    }),
  };
}

export type UpdateClientResult =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: "name" | "phone" | "notes" };

/** Guarda nombre, celular y nota del cliente. */
export async function updateClient(input: ClientInput): Promise<UpdateClientResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      ok: false,
      error: issue?.message ?? "Revisá los datos.",
      field: field === "name" || field === "phone" || field === "notes" ? field : undefined,
    };
  }
  const { id, name, phone, notes } = parsed.data;
  const current = await requireCurrent();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ full_name: name, phone: phone || null, notes: notes || null })
    .eq("business_id", current.business.id)
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "23505") return { ok: false, field: "phone", error: "Ese celular ya es de otro cliente." };
    if (error.code === "23514") return { ok: false, error: "Algún dato no es válido." };
    console.error("[clientes] update:", error.code, error.message);
    return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }
  if (!data?.length) return { ok: false, error: "No encontramos este cliente." };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Cliente actualizado." };
}
