import "server-only";

import { cache } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { emptyWeek, type TimeRange, type WeekHours, type Weekday } from "./constants";
import { sortRanges } from "./week";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Partes de una fecha en la zona horaria del negocio. */
function localParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  return {
    ymd,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hhmm: `${parts.hour}:${parts.minute}`,
    weekday: new Date(`${ymd}T12:00:00Z`).getUTCDay(), // 0 = domingo
  };
}

/** "YYYY-MM-DD" de hoy en la zona del negocio. */
export function todayInZone(timeZone: string): string {
  return localParts(new Date(), timeZone).ymd;
}

/** Día de la semana ISO (1 = lunes … 7 = domingo) de hoy en la zona del negocio. */
export function todayWeekday(timeZone: string): Weekday {
  const d = localParts(new Date(), timeZone).weekday;
  return (d === 0 ? 7 : d) as Weekday;
}

/** "lun 8 dic" */
function dayLabel(p: ReturnType<typeof localParts>, withYear: boolean) {
  return `${WEEKDAY_SHORT[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}${withYear ? ` ${p.year}` : ""}`;
}

/** Horario semanal de un profesional. */
export const getWeekHours = cache(async (memberId: string): Promise<WeekHours> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("working_hours")
    .select("weekday, start_time, end_time")
    .eq("member_id", memberId);
  if (error) throw new Error(`No se pudo leer el horario: ${error.message}`);

  const week = emptyWeek();
  for (const row of data) {
    // La base devuelve "HH:mm:ss"
    week[row.weekday as Weekday].push({ start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) });
  }
  for (const d of Object.keys(week)) week[Number(d) as Weekday] = sortRanges(week[Number(d) as Weekday]);
  return week;
});

export type TimeOffItem = {
  id: string;
  allDay: boolean;
  reason: string | null;
  /** "lun 8 dic" o "lun 22 dic – mié 31 dic" */
  dates: string;
  /** "Todo el día" · "3 días" · "15:00 – 17:00" */
  detail: string;
  /** Fechas locales cubiertas (para no sugerir feriados ya bloqueados). */
  coveredDays: string[];
  /** Está ocurriendo ahora. */
  current: boolean;
};

/** Bloqueos del negocio que todavía no terminaron, del más cercano al más lejano. */
export const getUpcomingTimeOff = cache(async (): Promise<TimeOffItem[]> => {
  const current = await getCurrentBusiness();
  if (!current) return [];
  const tz = current.business.timezone;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("id, starts_at, ends_at, all_day, reason")
    .eq("business_id", current.business.id)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);
  if (error) throw new Error(`No se pudieron leer los bloqueos: ${error.message}`);

  const now = Date.now();
  const thisYear = localParts(new Date(), tz).year;

  return data.map((t) => {
    const start = localParts(new Date(t.starts_at), tz);
    // Para días completos, el fin guardado es las 00:00 del día siguiente.
    const endDate = new Date(new Date(t.ends_at).getTime() - (t.all_day ? 1 : 0));
    const end = localParts(endDate, tz);
    const withYear = start.year !== thisYear || end.year !== thisYear;

    const coveredDays: string[] = [];
    for (let d = new Date(`${start.ymd}T12:00:00Z`); d.toISOString().slice(0, 10) <= end.ymd; d.setUTCDate(d.getUTCDate() + 1)) {
      coveredDays.push(d.toISOString().slice(0, 10));
    }

    const sameDay = start.ymd === end.ymd;
    return {
      id: t.id,
      allDay: t.all_day,
      reason: t.reason,
      dates: sameDay ? dayLabel(start, withYear) : `${dayLabel(start, withYear)} – ${dayLabel(end, withYear)}`,
      detail: t.all_day
        ? sameDay
          ? "Todo el día"
          : `${coveredDays.length} días`
        : `${start.hhmm} – ${localParts(new Date(t.ends_at), tz).hhmm}`,
      coveredDays: t.all_day ? coveredDays : [],
      current: new Date(t.starts_at).getTime() <= now && now < new Date(t.ends_at).getTime(),
    };
  });
});

export type TodaySchedule = {
  /** Horario normal de hoy según la semana. */
  regular: TimeRange[];
  /** Horario real de hoy: el normal menos los bloqueos. */
  open: TimeRange[];
  /** Bloqueos que afectan hoy (ej. "Vacaciones" o "15:00 – 17:00 · Trámite"). */
  blocks: { label: string; allDay: boolean }[];
};

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Horario de hoy de un profesional, descontando los bloqueos del negocio o suyos. */
export const getTodaySchedule = cache(async (memberId: string): Promise<TodaySchedule> => {
  const current = await getCurrentBusiness();
  if (!current) return { regular: [], open: [], blocks: [] };
  const tz = current.business.timezone;

  const week = await getWeekHours(memberId);
  const regular = week[todayWeekday(tz)];
  const today = todayInZone(tz);

  // Ventana amplia y después filtro por fecha local (evita cálculos de zona en la consulta).
  const now = Date.now();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_off")
    .select("starts_at, ends_at, all_day, reason, member_id")
    .eq("business_id", current.business.id)
    .lt("starts_at", new Date(now + 36 * 3600_000).toISOString())
    .gt("ends_at", new Date(now - 36 * 3600_000).toISOString());
  if (error) throw new Error(`No se pudieron leer los bloqueos de hoy: ${error.message}`);

  const blocks: TodaySchedule["blocks"] = [];
  const cuts: [number, number][] = [];
  for (const t of data) {
    if (t.member_id && t.member_id !== memberId) continue;
    const s = localParts(new Date(t.starts_at), tz);
    const e = localParts(new Date(t.ends_at), tz);
    if (s.ymd > today || e.ymd < today || (e.ymd === today && e.hhmm === "00:00")) continue;
    const from = s.ymd < today ? 0 : minutesOf(s.hhmm);
    const to = e.ymd > today ? 24 * 60 : minutesOf(e.hhmm);
    cuts.push([from, to]);
    const wholeDay = from === 0 && to === 24 * 60;
    blocks.push({
      allDay: wholeDay,
      label: wholeDay ? (t.reason ?? "Bloqueado") : `${toHHMM(from)} – ${toHHMM(to)}${t.reason ? ` · ${t.reason}` : ""}`,
    });
  }

  // Horario normal menos los bloqueos.
  let open = regular.map((r) => [minutesOf(r.start), minutesOf(r.end)] as [number, number]);
  for (const [cs, ce] of cuts) {
    open = open.flatMap(([os, oe]) => {
      if (ce <= os || cs >= oe) return [[os, oe] as [number, number]];
      const pieces: [number, number][] = [];
      if (cs > os) pieces.push([os, cs]);
      if (ce < oe) pieces.push([ce, oe]);
      return pieces;
    });
  }

  return {
    regular,
    open: open.filter(([s, e]) => e - s >= 5).map(([s, e]) => ({ start: toHHMM(s), end: toHHMM(e) })),
    blocks,
  };
});

/** "vie 20 nov" de hoy, en la zona del negocio. */
export function todayLabel(timeZone: string): string {
  return dayLabel(localParts(new Date(), timeZone), false);
}
