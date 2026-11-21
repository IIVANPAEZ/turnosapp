"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getAgenda } from "./data";
import { localParts, shortDayLabel, todayYMD } from "@/lib/time/zone";

export type ClientOption = { id: string; name: string; phone: string | null };

async function requireCurrent() {
  const current = await getCurrentBusiness();
  if (!current) redirect("/login?next=/dashboard/agenda");
  return current;
}

/** Busca clientes del negocio por nombre o celular (hasta 6). */
export async function searchClients(query: string): Promise<ClientOption[]> {
  const current = await requireCurrent();
  // Se quitan caracteres que tienen significado en el filtro de PostgREST.
  const text = query.replace(/[,()%*\\]/g, " ").trim();
  if (text.length < 2) return [];
  const digits = text.replace(/\D/g, "");

  const supabase = await createClient();
  let request = supabase
    .from("clients")
    .select("id, full_name, phone")
    .eq("business_id", current.business.id)
    .order("full_name")
    .limit(6);
  request =
    digits.length >= 3
      ? request.or(`full_name.ilike.%${text}%,phone_key.like.%${digits}%`)
      : request.ilike("full_name", `%${text}%`);

  const { data, error } = await request;
  if (error) {
    console.error("[agenda] searchClients:", error.code, error.message);
    return [];
  }
  return data.map((c) => ({ id: c.id, name: c.full_name, phone: c.phone }));
}

export type DayAvailability = {
  date: string;
  isPast: boolean;
  /** Minutos actuales si es hoy (para no sugerir horarios que ya pasaron). */
  nowMinutes: number | null;
  hours: { start: string; end: string }[];
  blocks: { startMin: number; endMin: number; label: string }[];
  /** Turnos del profesional actual que ocupan lugar ese día. */
  busy: { startMin: number; endMin: number; label: string }[];
};

/** Lo necesario para calcular los horarios libres de un día del profesional actual. */
export async function getDayAvailability(date: string): Promise<DayAvailability | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const current = await requireCurrent();
  const tz = current.business.timezone;
  const [day] = await getAgenda(date, 1);
  if (!day) return null;
  const today = todayYMD(tz);

  return {
    date,
    isPast: date < today,
    nowMinutes: date === today ? localParts(new Date(), tz).minutes : null,
    hours: day.hours,
    blocks: day.blocks.map((b) => ({ startMin: b.startMin, endMin: b.endMin, label: b.label })),
    busy: day.appointments
      .filter((a) => a.memberId === current.member.id)
      .map((a) => ({ startMin: a.startMin, endMin: a.endMin, label: `${a.clientName} (${a.start}–${a.end})` })),
  };
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const createSchema = z.object({
  client: z.union([
    z.object({ id: z.uuid() }),
    z.object({
      name: z.string().trim().min(2, { error: "Ingresá el nombre del cliente" }).max(80),
      phone: z
        .string()
        .trim()
        .max(30)
        .regex(/^[0-9+\s()-]*$/, { error: "Solo números, espacios y + ( ) -" }),
    }),
  ]),
  serviceId: z.uuid({ error: "Elegí un servicio" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time,
  durationMinutes: z.number().int().min(5).max(480).refine((v) => v % 5 === 0),
  notes: z.string().trim().max(300),
  status: z.enum(["confirmed", "pending"]),
});

export type CreateAppointmentInput = z.input<typeof createSchema>;

export type CreateAppointmentResult =
  | { ok: true; id: string; message: string }
  | {
      ok: false;
      error: string;
      field?: "client" | "phone" | "time" | "service";
      /** Si el celular ya existía: ese cliente, para ofrecer usarlo. */
      existingClient?: ClientOption;
      /** Si el cliente nuevo se creó pero el turno falló: para no volver a crearlo. */
      createdClient?: ClientOption;
    };

/** Crea un turno (y el cliente, si es nuevo) para el profesional actual. */
export async function createAppointment(input: CreateAppointmentInput): Promise<CreateAppointmentResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos del turno." };
  }
  const v = parsed.data;
  const current = await requireCurrent();
  const supabase = await createClient();

  // 1) Cliente: existente o nuevo.
  let clientId: string;
  let clientName: string;
  let createdClient: ClientOption | undefined;
  if ("id" in v.client) {
    const { data } = await supabase.from("clients").select("id, full_name").eq("id", v.client.id).maybeSingle();
    if (!data) return { ok: false, field: "client", error: "No encontramos ese cliente." };
    clientId = data.id;
    clientName = data.full_name;
  } else {
    const { data, error } = await supabase
      .from("clients")
      .insert({ business_id: current.business.id, full_name: v.client.name, phone: v.client.phone || null })
      .select("id, full_name, phone")
      .single();
    if (error) {
      if (error.code === "23505" && v.client.phone) {
        // El celular ya está cargado: buscamos ese cliente para ofrecerlo.
        const digits = v.client.phone.replace(/\D/g, "");
        const key = digits.startsWith("595") ? `0${digits.slice(3)}` : digits;
        const { data: existing } = await supabase
          .from("clients")
          .select("id, full_name, phone")
          .eq("business_id", current.business.id)
          .eq("phone_key", key)
          .maybeSingle();
        return {
          ok: false,
          field: "phone",
          error: existing ? `Ya tenés a ${existing.full_name} con ese celular.` : "Ya existe un cliente con ese celular.",
          existingClient: existing ? { id: existing.id, name: existing.full_name, phone: existing.phone } : undefined,
        };
      }
      console.error("[agenda] crear cliente:", error.code, error.message);
      return { ok: false, field: "client", error: "No pudimos guardar el cliente. Probá de nuevo." };
    }
    clientId = data.id;
    clientName = data.full_name;
    createdClient = { id: data.id, name: data.full_name, phone: data.phone };
  }

  // 2) Turno.
  const { data: id, error } = await supabase.rpc("create_appointment", {
    p_member_id: current.member.id,
    p_client_id: clientId,
    p_service_id: v.serviceId,
    p_date: v.date,
    p_time: v.time,
    p_duration_minutes: v.durationMinutes,
    p_notes: v.notes || undefined,
    p_status: v.status,
  });

  if (error) {
    if (error.code === "23P01") {
      // Con qué turno se pisa (para decirlo con nombre y horario).
      const availability = await getDayAvailability(v.date);
      const start = Number(v.time.slice(0, 2)) * 60 + Number(v.time.slice(3, 5));
      const end = start + v.durationMinutes;
      const clash = availability?.busy.find((b) => b.startMin < end && start < b.endMin);
      return {
        ok: false,
        field: "time",
        error: clash ? `Se pisa con ${clash.label}. Elegí otro horario.` : "Ese horario se pisa con otro turno.",
        createdClient,
      };
    }
    if (error.code === "P0002") return { ok: false, field: "service", error: "No encontramos ese servicio.", createdClient };
    console.error("[agenda] create_appointment:", error.code, error.message);
    return { ok: false, error: "No pudimos guardar el turno. Probá de nuevo.", createdClient };
  }

  revalidatePath("/dashboard", "layout");
  return {
    ok: true,
    id: id as string,
    message: `Turno cargado · ${shortDayLabel(v.date)}, ${v.time} · ${clientName}`,
  };
}
