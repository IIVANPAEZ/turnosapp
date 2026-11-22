import "server-only";

import { cache } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/clients/schemas";
import { addDays, localParts, zonedToUtc } from "@/lib/time/zone";

export type IncomePayment = {
  id: string;
  date: string;
  time: string;
  amount: number;
  method: PaymentMethod;
  clientName: string;
  serviceName: string;
  memberName: string;
};

export type UnpaidAppointment = {
  id: string;
  date: string;
  start: string;
  clientName: string;
  serviceName: string;
  price: number;
};

export type Breakdown = { name: string; total: number; count: number };

export type Income = {
  total: number;
  paymentsCount: number;
  byMethod: Record<PaymentMethod, { total: number; count: number }>;
  byService: Breakdown[];
  byMember: Breakdown[];
  /** Cobrado por día (todas las fechas del período, con 0 si no hubo). */
  byDay: { date: string; total: number }[];
  payments: IncomePayment[];
  attended: number;
  noShows: number;
  /** Turnos del período que tenían que pasar (sin cancelados ni reprogramados). */
  scheduled: number;
  online: number;
  unpaid: UnpaidAppointment[];
  unpaidTotal: number;
  newClients: number;
};

const sum = (rows: { amount: number }[]) => rows.reduce((s, r) => s + r.amount, 0);

/** Límites UTC [desde, hasta+1) de un período en fechas locales. */
function range(from: string, to: string, tz: string) {
  return { start: zonedToUtc(from, "00:00", tz).toISOString(), end: zonedToUtc(addDays(to, 1), "00:00", tz).toISOString() };
}

/** Total cobrado en un período (para comparar con el anterior). */
export const getIncomeTotal = cache(async (from: string, to: string): Promise<number> => {
  const current = await getCurrentBusiness();
  if (!current) return 0;
  const { start, end } = range(from, to, current.business.timezone);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("amount")
    .eq("business_id", current.business.id)
    .is("voided_at", null)
    .gte("paid_at", start)
    .lt("paid_at", end)
    .limit(10000);
  if (error) throw new Error(`No se pudieron leer los cobros: ${error.message}`);
  return sum(data);
});

/**
 * Ingresos de un período. Los cobros cuentan por la fecha en que se cobraron;
 * los turnos (atendidos, no vino, falta cobrar), por la fecha del turno.
 */
export const getIncome = cache(async (from: string, to: string): Promise<Income> => {
  const current = await getCurrentBusiness();
  if (!current) throw new Error("Sin negocio");
  const tz = current.business.timezone;
  const { start, end } = range(from, to, tz);
  const supabase = await createClient();

  const [payRes, apptRes, clientsRes] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, method, paid_at, appointment:appointments (service_name), client:clients (full_name), member:business_members (display_name)",
      )
      .eq("business_id", current.business.id)
      .is("voided_at", null)
      .gte("paid_at", start)
      .lt("paid_at", end)
      .order("paid_at", { ascending: false })
      .limit(5000),
    supabase
      .from("appointments")
      .select("id, starts_at, status, source, rescheduled_to, service_name, price, client:clients (full_name), payments (voided_at)")
      .eq("business_id", current.business.id)
      .gte("starts_at", start)
      .lt("starts_at", end)
      .order("starts_at", { ascending: true })
      .limit(5000),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("business_id", current.business.id)
      .gte("created_at", start)
      .lt("created_at", end),
  ]);
  if (payRes.error) throw new Error(`No se pudieron leer los cobros: ${payRes.error.message}`);
  if (apptRes.error) throw new Error(`No se pudieron leer los turnos: ${apptRes.error.message}`);

  const payments: IncomePayment[] = payRes.data.map((p) => {
    const l = localParts(new Date(p.paid_at), tz);
    return {
      id: p.id,
      date: l.ymd,
      time: l.hhmm,
      amount: p.amount,
      method: p.method,
      clientName: p.client?.full_name ?? "Cliente",
      serviceName: p.appointment?.service_name ?? "",
      memberName: p.member?.display_name ?? "",
    };
  });

  const group = (key: (p: IncomePayment) => string): Breakdown[] => {
    const map = new Map<string, Breakdown>();
    for (const p of payments) {
      const k = key(p) || "—";
      const b = map.get(k) ?? { name: k, total: 0, count: 0 };
      b.total += p.amount;
      b.count += 1;
      map.set(k, b);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  };

  const byMethod: Income["byMethod"] = { cash: { total: 0, count: 0 }, transfer: { total: 0, count: 0 } };
  const perDay = new Map<string, number>();
  for (const p of payments) {
    byMethod[p.method].total += p.amount;
    byMethod[p.method].count += 1;
    perDay.set(p.date, (perDay.get(p.date) ?? 0) + p.amount);
  }
  const byDay: Income["byDay"] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) byDay.push({ date: d, total: perDay.get(d) ?? 0 });

  const live = apptRes.data.filter((a) => !a.rescheduled_to && a.status !== "cancelled");
  const unpaid: UnpaidAppointment[] = live
    .filter((a) => a.status === "completed" && !a.payments.some((p) => !p.voided_at))
    .map((a) => {
      const l = localParts(new Date(a.starts_at), tz);
      return {
        id: a.id,
        date: l.ymd,
        start: l.hhmm,
        clientName: a.client?.full_name ?? "Cliente",
        serviceName: a.service_name,
        price: a.price,
      };
    });

  return {
    total: sum(payments),
    paymentsCount: payments.length,
    byMethod,
    byService: group((p) => p.serviceName),
    byMember: group((p) => p.memberName),
    byDay,
    payments,
    attended: live.filter((a) => a.status === "completed").length,
    noShows: live.filter((a) => a.status === "no_show").length,
    scheduled: live.length,
    online: live.filter((a) => a.source === "online").length,
    unpaid,
    unpaidTotal: unpaid.reduce((s, a) => s + a.price, 0),
    newClients: clientsRes.count ?? 0,
  };
});
