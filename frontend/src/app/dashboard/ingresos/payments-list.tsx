"use client";

import { useState } from "react";
import { formatPYG } from "@/lib/format";
import type { IncomePayment } from "@/lib/income/data";
import { PAYMENT_METHOD_LABELS } from "@/lib/clients/schemas";
import { shortDayLabel } from "@/lib/time/zone";

const PAGE = 30;

/** Lista de cobros del período (más nuevos primero). */
export function PaymentsList({ items, today, showMember }: { items: IncomePayment[]; today: string; showMember: boolean }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <div className="overflow-hidden rounded-xl border">
      <ul className="divide-y">
        {items.slice(0, shown).map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-20 shrink-0">
              <p className="text-sm">{p.date === today ? "Hoy" : shortDayLabel(p.date)}</p>
              <p className="font-mono text-xs text-muted-foreground tabular">{p.time}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.clientName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.serviceName}
                {showMember && p.memberName && ` · ${p.memberName}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-mono text-sm tabular">{formatPYG(p.amount)}</p>
              <p className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[p.method]}</p>
            </div>
          </li>
        ))}
      </ul>
      {items.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className="w-full border-t px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
        >
          Ver más ({items.length - shown})
        </button>
      )}
    </div>
  );
}
