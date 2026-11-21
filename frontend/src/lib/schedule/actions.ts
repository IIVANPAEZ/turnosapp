"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { TIME_OPTIONS, WEEKDAYS, type WeekHours } from "./constants";
import { weekHasProblems, weekToRows } from "./week";

export type ScheduleActionResult = { ok: true; message: string } | { ok: false; error: string };

const PATH = "/dashboard/horarios";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type Editor =
  | { error: string }
  | { current: NonNullable<Awaited<ReturnType<typeof getCurrentBusiness>>>; isManager: boolean };

/** Negocio y profesional actual; exige que pueda editar (dueño/admin o uno mismo). */
async function requireEditor(memberId?: string): Promise<Editor> {
  const current = await getCurrentBusiness();
  if (!current) redirect(`/login?next=${PATH}`);
  const isManager = current.member.role === "owner" || current.member.role === "admin";
  if (memberId && !isManager && memberId !== current.member.id) {
    return { error: "No tenés permiso para cambiar este horario." };
  }
  return { current, isManager };
}

function dbError(error: { code: string; message: string }, context: string): ScheduleActionResult {
  if (error.code === "23P01") return { ok: false, error: "Hay horarios que se pisan en un mismo día." };
  if (error.code === "23514") return { ok: false, error: "Hay horarios que no son válidos. Revisalos." };
  if (error.code === "42501") return { ok: false, error: "No tenés permiso para hacer este cambio." };
  console.error(`[horarios] ${context}:`, error.code, error.message);
  return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
}

const weekSchema = z.object(
  Object.fromEntries(
    WEEKDAYS.map((d) => [d.value, z.array(z.object({ start: time, end: time })).max(6)]),
  ) as Record<`${1 | 2 | 3 | 4 | 5 | 6 | 7}`, z.ZodArray<z.ZodObject<{ start: typeof time; end: typeof time }>>>,
);

/** Reemplaza el horario semanal completo de un profesional. */
export async function saveWorkingHours(memberId: string, week: WeekHours): Promise<ScheduleActionResult> {
  const parsed = weekSchema.safeParse(week);
  if (!parsed.success || weekHasProblems(week)) return { ok: false, error: "Revisá los horarios marcados." };
  const editor = await requireEditor(memberId);
  if ("error" in editor) return { ok: false, error: editor.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_working_hours", {
    p_member_id: memberId,
    p_hours: weekToRows(week),
  });
  if (error) return dbError(error, "set_working_hours");

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Horario guardado." };
}

const timeOffSchema = z
  .discriminatedUnion("allDay", [
    z.object({ allDay: z.literal(true), startDate: date, endDate: date, reason: z.string().trim().max(120) }),
    z.object({
      allDay: z.literal(false),
      startDate: date,
      startTime: time,
      endTime: time,
      reason: z.string().trim().max(120),
    }),
  ])
  .superRefine((v, ctx) => {
    if (v.allDay && v.endDate < v.startDate) {
      ctx.addIssue({ code: "custom", message: "La fecha final tiene que ser igual o posterior a la inicial." });
    }
    if (!v.allDay && TIME_OPTIONS.indexOf(v.endTime) <= TIME_OPTIONS.indexOf(v.startTime)) {
      ctx.addIssue({ code: "custom", message: "La hora de fin tiene que ser después de la de inicio." });
    }
  });

export type TimeOffInput = z.input<typeof timeOffSchema>;

/** Bloquea días completos o unas horas (para todo el negocio). */
export async function addTimeOff(input: TimeOffInput): Promise<ScheduleActionResult> {
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos del bloqueo." };
  }
  const editor = await requireEditor();
  if ("error" in editor) return { ok: false, error: editor.error };
  if (!editor.isManager) return { ok: false, error: "Solo el dueño o un administrador pueden bloquear el negocio." };

  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_time_off", {
    p_start_date: v.startDate,
    p_end_date: v.allDay ? v.endDate : undefined,
    p_start_time: v.allDay ? undefined : v.startTime,
    p_end_time: v.allDay ? undefined : v.endTime,
    p_reason: v.reason || undefined,
  });
  if (error) return dbError(error, "add_time_off");

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Bloqueo agregado." };
}

export async function deleteTimeOff(id: string): Promise<ScheduleActionResult> {
  const editor = await requireEditor();
  if ("error" in editor) return { ok: false, error: editor.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_off")
    .delete()
    .eq("id", id)
    .eq("business_id", editor.current.business.id)
    .select("id");
  if (error) return dbError(error, "delete_time_off");
  if (!data?.length) return { ok: false, error: "No encontramos ese bloqueo." };

  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Bloqueo eliminado." };
}
