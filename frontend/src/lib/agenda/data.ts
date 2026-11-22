import "server-only";

import { cache } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/appointments/status";
import type { PriceType } from "@/lib/services/schemas";
import { getWeekHours } from "@/lib/schedule/data";
import type { TimeRange } from "@/lib/schedule/constants";
import {
  addDays,
  isoWeekday,
  localParts,
  minutesToHHMM,
  shortDayLabel,
  todayYMD,
  zonedToUtc,
} from "@/lib/time/zone";

export type AgendaAppointment = {
  id: string;
  memberId: string;
  /** Fecha local "YYYY-MM-DD" */
  date: string;
  /** "HH:mm" locales */
  start: string;
  end: string;
  /** Minutos desde la medianoche local (para ubicarlo en la línea de tiempo). */
  startMin: number;
  endMin: number;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  price: number;
  priceType: PriceType;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
  memberColor: string;
  memberName: string;
  /** Si se reprogramó: a dónde ("Jue 26, 14:00") y la fecha del turno nuevo. */
  rescheduledTo: string | null;
  rescheduledToDate: string | null;
  /** Lo reservó el cliente desde la página pública. */
  online: boolean;
};

export type AgendaBlock = { startMin: number; endMin: number; label: string; allDay: boolean };

export type AgendaDay = {
  date: string;
  /** "Lun 23" */
  label: string;
  isToday: boolean;
  /** Horario de atención de ese día (según la semana). */
  hours: TimeRange[];
  blocks: AgendaBlock[];
  /** Turnos que ocupan lugar: pendientes, confirmados, finalizados. */
  appointments: AgendaAppointment[];
  /** Cancelados, "no vino" y reprogramados: van en una lista aparte. */
  inactive: AgendaAppointment[];
};

/**
 * Agenda de `days` días desde `from` ("YYYY-MM-DD").
 * Turnos: dueño/admin ven los de todo el equipo; un profesional, solo los suyos.
 * Horario y bloqueos: los del profesional actual (y los del negocio).
 * Todo viene convertido a la hora local del negocio.
 */
export const getAgenda = cache(async (from: string, days: number): Promise<AgendaDay[]> => {
  const current = await getCurrentBusiness();
  if (!current) return [];
  const tz = current.business.timezone;
  const memberId = current.member.id;

  const rangeStart = zonedToUtc(from, "00:00", tz);
  const rangeEnd = zonedToUtc(addDays(from, days), "00:00", tz);

  // Quién ve qué: dueño/admin ven los turnos de todo el equipo; un profesional, solo los suyos.
  const seesEveryone = current.member.role === "owner" || current.member.role === "admin";

  const supabase = await createClient();
  let apptQuery = supabase
    .from("appointments")
    .select(
      "id, member_id, starts_at, ends_at, status, service_name, price, price_type, notes, cancel_reason, rescheduled_to, source, client:clients (id, full_name, phone), member:business_members (color, display_name)",
    )
    .eq("business_id", current.business.id)
    .gte("starts_at", rangeStart.toISOString())
    .lt("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });
  if (!seesEveryone) apptQuery = apptQuery.eq("member_id", memberId);

  const [week, apptRes, offRes] = await Promise.all([
    getWeekHours(memberId),
    apptQuery,
    supabase
      .from("time_off")
      .select("starts_at, ends_at, all_day, reason, member_id")
      .eq("business_id", current.business.id)
      .lt("starts_at", rangeEnd.toISOString())
      .gt("ends_at", rangeStart.toISOString()),
  ]);
  if (apptRes.error) throw new Error(`No se pudo leer la agenda: ${apptRes.error.message}`);
  if (offRes.error) throw new Error(`No se pudieron leer los bloqueos: ${offRes.error.message}`);

  // A dónde se movieron los reprogramados (para mostrar "→ Jue 26, 14:00").
  const movedIds = apptRes.data.map((a) => a.rescheduled_to).filter((x): x is string => !!x);
  const movedTo = new Map<string, { label: string; date: string }>();
  if (movedIds.length) {
    const { data } = await supabase.from("appointments").select("id, starts_at").in("id", movedIds);
    for (const m of data ?? []) {
      const p = localParts(new Date(m.starts_at), tz);
      movedTo.set(m.id, { label: `${shortDayLabel(p.ymd)}, ${p.hhmm}`, date: p.ymd });
    }
  }

  const today = todayYMD(tz);
  const result: AgendaDay[] = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return {
      date,
      label: shortDayLabel(date),
      isToday: date === today,
      hours: week[isoWeekday(date)],
      blocks: [],
      appointments: [],
      inactive: [],
    };
  });
  const byDate = new Map(result.map((d) => [d.date, d]));

  for (const a of apptRes.data) {
    const s = localParts(new Date(a.starts_at), tz);
    const e = localParts(new Date(a.ends_at), tz);
    const day = byDate.get(s.ymd);
    if (!day) continue;
    const endMin = e.ymd === s.ymd ? e.minutes : 24 * 60;
    const appt: AgendaAppointment = {
      id: a.id,
      memberId: a.member_id,
      date: s.ymd,
      start: s.hhmm,
      end: minutesToHHMM(Math.min(endMin, 24 * 60 - 1)),
      startMin: s.minutes,
      endMin,
      clientId: a.client?.id ?? null,
      clientName: a.client?.full_name ?? "Cliente",
      clientPhone: a.client?.phone ?? null,
      serviceName: a.service_name,
      price: a.price,
      priceType: a.price_type,
      status: a.status,
      notes: a.notes,
      cancelReason: a.cancel_reason,
      memberColor: a.member?.color ?? "#6366f1",
      memberName: a.member?.display_name ?? "",
      rescheduledTo: a.rescheduled_to ? (movedTo.get(a.rescheduled_to)?.label ?? "otra fecha") : null,
      rescheduledToDate: a.rescheduled_to ? (movedTo.get(a.rescheduled_to)?.date ?? null) : null,
      online: a.source === "online",
    };
    const occupies = !a.rescheduled_to && (a.status === "pending" || a.status === "confirmed" || a.status === "completed");
    (occupies ? day.appointments : day.inactive).push(appt);
  }

  // Bloqueos (del negocio o del profesional), recortados a cada día.
  for (const t of offRes.data) {
    if (t.member_id && t.member_id !== memberId) continue;
    const s = localParts(new Date(t.starts_at), tz);
    const e = localParts(new Date(t.ends_at), tz);
    for (const day of result) {
      if (s.ymd > day.date || e.ymd < day.date || (e.ymd === day.date && e.minutes === 0)) continue;
      const startMin = s.ymd < day.date ? 0 : s.minutes;
      const endMin = e.ymd > day.date ? 24 * 60 : e.minutes;
      const allDay = startMin === 0 && endMin === 24 * 60;
      day.blocks.push({ startMin, endMin, allDay, label: t.reason ?? "Bloqueado" });
    }
  }

  return result;
});

/** ¿El negocio ya tiene algún turno cargado? (para "Primeros pasos") */
export const hasAnyAppointment = cache(async (): Promise<boolean> => {
  const current = await getCurrentBusiness();
  if (!current) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("business_id", current.business.id);
  return (count ?? 0) > 0;
});

export type PendingOnline = {
  id: string;
  date: string;
  start: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  memberName: string;
};

/**
 * Reservas online por confirmar (de hoy en adelante), para el aviso del Inicio.
 * Dueño/admin ven las de todo el equipo; un profesional, solo las suyas.
 */
export const getPendingOnline = cache(async (): Promise<{ items: PendingOnline[]; total: number }> => {
  const current = await getCurrentBusiness();
  if (!current) return { items: [], total: 0 };
  const tz = current.business.timezone;
  const seesEveryone = current.member.role === "owner" || current.member.role === "admin";

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("id, starts_at, service_name, client:clients (full_name, phone), member:business_members (display_name)", {
      count: "exact",
    })
    .eq("business_id", current.business.id)
    .eq("source", "online")
    .eq("status", "pending")
    .is("rescheduled_to", null)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5);
  if (!seesEveryone) query = query.eq("member_id", current.member.id);

  const { data, count, error } = await query;
  if (error) throw new Error(`No se pudieron leer las reservas online: ${error.message}`);

  return {
    total: count ?? data.length,
    items: data.map((a) => {
      const p = localParts(new Date(a.starts_at), tz);
      return {
        id: a.id,
        date: p.ymd,
        start: p.hhmm,
        clientName: a.client?.full_name ?? "Cliente",
        clientPhone: a.client?.phone ?? null,
        serviceName: a.service_name,
        memberName: a.member?.display_name ?? "",
      };
    }),
  };
});
