import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BrowserContext } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";

/** Variables de .env.local (las mismas que usa la app). */
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "../../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
) as Record<string, string>;

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const E2E_EMAIL_LIKE = "e2e+pw-%@turnosapp-test.dev";
export const PASSWORD = "Prueba12345";

const uid = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
export const e2eEmail = (who: string) => `e2e+pw-${who}-${uid()}@turnosapp-test.dev`;

/** SQL con la CLI de Supabase (solo para lo que la app no permite: crear personal, limpiar). */
export function sql(query: string): string {
  return execFileSync("supabase", ["db", "query", "--remote", "--yes", "--workdir", path.join(__dirname, "../../.."), query], {
    encoding: "utf8",
    timeout: 60_000,
  });
}

/** Visitante sin sesión (como un cliente en la página pública). */
export const anonClient = () => createClient<Database>(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

export type Session = { client: SupabaseClient<Database>; cookies: Map<string, string>; userId: string; email: string };

/** Crea un usuario con sesión (cookies listas para el navegador). */
export async function signUp(who: string, fullName = "Ivan Paez"): Promise<Session> {
  const cookies = new Map<string, string>();
  const client = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach(({ name, value }) => (value ? cookies.set(name, value) : cookies.delete(name))),
    },
  });
  const email = e2eEmail(who);
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD, options: { data: { full_name: fullName } } });
  if (error || !data.user) throw new Error(`signUp: ${error?.message}`);
  return { client, cookies, userId: data.user.id, email };
}

/** Pasa la sesión al navegador de la prueba. */
export async function useSession(context: BrowserContext, s: Session, baseURL: string) {
  await context.clearCookies();
  await context.addCookies([...s.cookies].map(([name, value]) => ({ name, value, url: baseURL })));
}

/** Falla la prueba si Supabase devolvió error (las funciones "void" devuelven data = null). */
export function must<T>(r: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as NonNullable<T>;
}

/** Fechas en Asunción. */
export const todayPY = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
export const nowMinutesPY = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Asuncion", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  return Number(p.find((x) => x.type === "hour")!.value) * 60 + Number(p.find((x) => x.type === "minute")!.value);
};

export type Business = {
  owner: Session;
  businessId: string;
  memberId: string;
  slug: string;
  services: { corte: string; barba: string };
};

/**
 * Negocio listo para usar: "Barbería Don Ivan", 2 servicios activos y
 * horario de lunes a sábado (08–12 y 14–19; sábado 09–13).
 */
export async function createBusiness(who = "duenio"): Promise<Business> {
  const owner = await signUp(who);
  const slug = `pw-${uid()}`;
  must(
    await owner.client.rpc("create_business", {
      p_name: "Barbería Don Ivan",
      p_slug: slug,
      p_category: "beauty",
      p_whatsapp: "0981 999 000",
      p_city: "Asunción",
    }),
    "create_business",
  );
  const m = must(await owner.client.from("business_members").select("id, business_id").single(), "member");
  await owner.client.from("businesses").update({ address: "Av. España 1234" }).eq("id", m.business_id);
  const svcs = must(
    await owner.client
      .from("services")
      .insert([
        { business_id: m.business_id, name: "Corte de cabello", duration_minutes: 45, price: 60000, price_type: "from", is_active: true },
        { business_id: m.business_id, name: "Barba", duration_minutes: 30, price: 40000, price_type: "fixed", is_active: true },
      ])
      .select("id, name"),
    "servicios",
  );
  const hours: { weekday: number; start: string; end: string }[] = [];
  for (const d of [1, 2, 3, 4, 5]) hours.push({ weekday: d, start: "08:00", end: "12:00" }, { weekday: d, start: "14:00", end: "19:00" });
  hours.push({ weekday: 6, start: "09:00", end: "13:00" });
  must(await owner.client.rpc("set_working_hours", { p_member_id: m.id, p_hours: hours }), "horario");
  return {
    owner,
    businessId: m.business_id,
    memberId: m.id,
    slug,
    services: { corte: svcs.find((s) => s.name.startsWith("Corte"))!.id, barba: svcs.find((s) => s.name === "Barba")!.id },
  };
}

/** Próximo día hábil (lunes a viernes) desde mañana. */
export function nextWeekday(): string {
  let d = addDays(todayPY(), 1);
  while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, 1);
  return d;
}

/** Último día hábil antes de hoy. */
export function previousWeekday(): string {
  let d = addDays(todayPY(), -1);
  while ([0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())) d = addDays(d, -1);
  return d;
}
