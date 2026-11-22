"use client";

import { useState } from "react";
import { FinishPanel } from "@/components/appointments/finish-panel";
import { formatPYG } from "@/lib/format";
import type { UnpaidAppointment } from "@/lib/income/data";
import { recordPayment } from "@/lib/agenda/actions";
import { shortDayLabel } from "@/lib/time/zone";

/** Turnos finalizados sin cobro: cobrarlos acá mismo. */
export function UnpaidList({ items, today }: { items: UnpaidAppointment[]; today: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {notice && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success" aria-live="polite">{notice}</p>}
      <ul className="divide-y rounded-xl border">
        {items.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-20 shrink-0">
                <p className="text-sm">{a.date === today ? "Hoy" : shortDayLabel(a.date)}</p>
                <p className="font-mono text-xs text-muted-foreground tabular">{a.start}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.clientName}</p>
                <p className="truncate text-xs text-muted-foreground">{a.serviceName}</p>
              </div>
              <span className="hidden font-mono text-sm text-muted-foreground tabular sm:block">{formatPYG(a.price)}</span>
              {open !== a.id && (
                <button
                  type="button"
                  onClick={() => setOpen(a.id)}
                  className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Cobrar
                </button>
              )}
            </div>
            {open === a.id && (
              <FinishPanel
                price={a.price}
                title="Registrar cobro"
                onCancel={() => setOpen(null)}
                onSubmit={async (method, amount) => {
                  const r = await recordPayment(a.id, method!, amount!);
                  if (!r.ok) return r.error;
                  setOpen(null);
                  setNotice(r.message);
                  return null;
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
