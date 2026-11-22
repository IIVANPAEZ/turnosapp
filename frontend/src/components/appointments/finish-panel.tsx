"use client";

import { useState, useTransition } from "react";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatThousands } from "@/lib/format";
import type { PaymentMethod } from "@/lib/clients/schemas";

type FinishPanelProps = {
  /** Monto precargado (precio del turno). */
  price: number;
  /** Título: "¿Cómo te pagó?" al finalizar, "Registrar cobro" después. */
  title?: string;
  /** Guarda; devuelve un error para mostrar, o null si salió bien. */
  onSubmit: (method: PaymentMethod | null, amount: number | null) => Promise<string | null>;
  onCancel: () => void;
  /** Muestra "Finalizar sin cobrar". */
  allowSkip?: boolean;
  className?: string;
};

/**
 * Finalizar cita = cobrar: monto (editable) + Efectivo / Transferencia o tarjeta,
 * todo en un toque. Se usa en el detalle del turno y en la tarjeta "Hoy".
 */
export function FinishPanel({ price, title = "¿Cómo te pagó?", onSubmit, onCancel, allowSkip, className }: FinishPanelProps) {
  const [digits, setDigits] = useState(price > 0 ? String(price) : "");
  const [busy, setBusy] = useState<PaymentMethod | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const amount = Number(digits || 0);

  const submit = (method: PaymentMethod | null) => {
    if (method && amount <= 0) return setError("Ingresá el monto que te pagó.");
    setError(null);
    setBusy(method ?? "skip");
    startTransition(async () => {
      const err = await onSubmit(method, method ? amount : null);
      if (err) setError(err);
      setBusy(null);
    });
  };

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-primary/30 bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium whitespace-nowrap">{title}</p>
        <label className="flex h-10 w-[8.5rem] items-center gap-1.5 rounded-lg border bg-inset px-3 focus-within:border-ring">
          <span className="font-mono text-sm text-muted-foreground">₲</span>
          <input
            inputMode="numeric"
            aria-label="Monto cobrado"
            value={digits ? formatThousands(Number(digits)) : ""}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 9))}
            placeholder="0"
            className="w-full min-w-0 bg-transparent text-right font-mono text-[15px] tabular outline-none"
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MethodButton icon={Banknote} label="Efectivo" busy={busy === "cash"} disabled={pending} onClick={() => submit("cash")} />
        <MethodButton
          icon={CreditCard}
          label="Transferencia o tarjeta"
          busy={busy === "transfer"}
          disabled={pending}
          onClick={() => submit("transfer")}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={onCancel} disabled={pending} className="text-muted-foreground hover:text-foreground">
          Volver
        </button>
        {allowSkip && (
          <button
            type="button"
            onClick={() => submit(null)}
            disabled={pending}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {busy === "skip" && <Loader2 className="size-3.5 animate-spin" />}
            Finalizar sin cobrar
          </button>
        )}
      </div>
    </div>
  );
}

function MethodButton({
  icon: Icon,
  label,
  busy,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2.5 text-center text-sm leading-tight font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
      {label}
    </button>
  );
}
