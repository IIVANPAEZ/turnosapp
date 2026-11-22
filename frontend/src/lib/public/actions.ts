"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

export type PublicSlot = { day: string; slot: string };

const input = z.object({
  slug: z.string().trim().min(3).max(40),
  serviceId: z.uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(31),
});

/** Horarios libres para un servicio (la base calcula todo: nunca devuelve datos de otros clientes). */
export async function fetchPublicAvailability(
  slug: string,
  serviceId: string,
  from: string,
  days: number,
): Promise<PublicSlot[]> {
  const parsed = input.safeParse({ slug, serviceId, from, days });
  if (!parsed.success) return [];

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("public_availability", {
    p_slug: parsed.data.slug,
    p_service_id: parsed.data.serviceId,
    p_from: parsed.data.from,
    p_days: parsed.data.days,
  });
  if (error) {
    console.error("[público] public_availability:", error.code, error.message);
    return [];
  }
  // La base devuelve "HH:mm:ss"
  return (data ?? []).map((s) => ({ day: s.day, slot: s.slot.slice(0, 5) }));
}

// ---------------------------------------------------------------------------
// Reservar
// ---------------------------------------------------------------------------

export type BookingResult =
  | {
      ok: true;
      appointmentId: string;
      status: "pending" | "confirmed";
      serviceName: string;
      durationMinutes: number;
    }
  | { ok: false; code: "slot" | "field" | "closed" | "limit" | "error"; message: string };

const bookingInput = z.object({
  slug: z.string().trim().min(3).max(40),
  serviceId: z.uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "Escribí tu nombre y apellido.").max(80, "El nombre es muy largo."),
  phone: z
    .string()
    .trim()
    .refine((p) => p.replace(/\D/g, "").length >= 8 && p.replace(/\D/g, "").length <= 15, "Revisá el número de celular."),
  notes: z.string().trim().max(300, "La nota es muy larga (máximo 300 caracteres).").optional(),
  // Campo trampa: los humanos no lo ven.
  website: z.string().optional(),
});

export type BookingInput = z.input<typeof bookingInput>;

/** Errores de la base → mensajes para el cliente. */
const BOOKING_ERRORS: Record<string, { code: Exclude<BookingResult, { ok: true }>["code"]; message: string }> = {
  invalid_name: { code: "field", message: "Escribí tu nombre y apellido." },
  invalid_phone: { code: "field", message: "Revisá el número de celular." },
  invalid_notes: { code: "field", message: "La nota es muy larga (máximo 300 caracteres)." },
  booking_disabled: { code: "closed", message: "Este negocio pausó las reservas online. Escribile por WhatsApp." },
  service_unavailable: { code: "closed", message: "Este servicio ya no está disponible para reservar." },
  slot_unavailable: { code: "slot", message: "Ese horario ya no está libre. Elegí otro, por favor." },
  slot_taken: { code: "slot", message: "Alguien acaba de reservar ese horario. Elegí otro, por favor." },
  too_many_bookings: {
    code: "limit",
    message: "Ya tenés 3 reservas por venir en este negocio. Si necesitás otra, escribile por WhatsApp.",
  },
};

export async function bookAppointment(values: BookingInput): Promise<BookingResult> {
  const parsed = bookingInput.safeParse(values);
  if (!parsed.success) {
    return { ok: false, code: "field", message: parsed.error.issues[0]?.message ?? "Revisá tus datos." };
  }
  const v = parsed.data;

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_slug: v.slug,
    p_service_id: v.serviceId,
    p_date: v.date,
    p_time: v.time,
    p_name: v.name,
    p_phone: v.phone,
    p_notes: v.notes || undefined,
    p_honeypot: v.website || undefined,
  });

  if (error || !data?.[0]) {
    const known = error ? BOOKING_ERRORS[error.message] : undefined;
    if (known) return { ok: false, ...known };
    if (error?.message !== "bot") console.error("[público] book_appointment:", error?.code, error?.message);
    return { ok: false, code: "error", message: "No pudimos hacer la reserva. Probá de nuevo en un momento." };
  }

  const row = data[0];
  return {
    ok: true,
    appointmentId: row.appointment_id,
    status: row.status === "confirmed" ? "confirmed" : "pending",
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
  };
}
