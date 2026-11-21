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
