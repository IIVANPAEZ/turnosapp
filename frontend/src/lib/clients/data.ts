import "server-only";

import { cache } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { localParts } from "@/lib/time/zone";
import { FREQUENT_VISITS, LOST_AFTER_DAYS, NEW_FOR_DAYS, type ClientTag } from "./schemas";

export type ClientSummary = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  visits: number;
  noShows: number;
  /** "YYYY-MM-DD" local de la última visita finalizada. */
  lastVisit: string | null;
  /** Próximo turno: fecha "YYYY-MM-DD" y hora "HH:mm" locales. */
  next: { date: string; time: string } | null;
  totalPaid: number;
  tags: ClientTag[];
  /** Para ordenar por "recientes": última actividad (ms). */
  activity: number;
};

const DAY = 86_400_000;

/**
 * Clientes del negocio con su resumen. Dueño/admin: cuentan todos los turnos;
 * un profesional: solo los suyos.
 */
export const getClients = cache(async (): Promise<ClientSummary[]> => {
  const current = await getCurrentBusiness();
  if (!current) return [];
  const tz = current.business.timezone;
  const seesEveryone = current.member.role === "owner" || current.member.role === "admin";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("client_overview", {
    p_business_id: current.business.id,
    p_member_id: seesEveryone ? undefined : current.member.id,
  });
  if (error) throw new Error(`No se pudieron leer los clientes: ${error.message}`);

  const now = Date.now();
  return data.map((c) => {
    const last = c.last_visit ? new Date(c.last_visit) : null;
    const next = c.next_appointment ? localParts(new Date(c.next_appointment), tz) : null;
    const created = new Date(c.created_at).getTime();
    const lost = !!last && !next && now - last.getTime() > LOST_AFTER_DAYS * DAY;
    const tags: ClientTag[] = [];
    if (!lost && now - created < NEW_FOR_DAYS * DAY && c.visits <= 1) tags.push("new");
    if (c.visits >= FREQUENT_VISITS) tags.push("frequent");
    if (lost) tags.push("lost");
    return {
      id: c.id,
      name: c.full_name,
      phone: c.phone,
      notes: c.notes,
      visits: c.visits,
      noShows: c.no_shows,
      lastVisit: last ? localParts(last, tz).ymd : null,
      next: next ? { date: next.ymd, time: next.hhmm } : null,
      totalPaid: Number(c.total_paid),
      tags,
      activity: Math.max(last?.getTime() ?? 0, created, c.next_appointment ? new Date(c.next_appointment).getTime() : 0),
    };
  });
});
