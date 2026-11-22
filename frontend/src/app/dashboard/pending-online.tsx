"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Globe, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PendingOnline as Item } from "@/lib/agenda/data";
import { setAppointmentStatus } from "@/lib/agenda/actions";
import { shortDayLabel } from "@/lib/time/zone";
import { messages, relativeDay, whatsAppLink } from "@/lib/whatsapp";
import { agendaHref } from "./agenda/agenda-toolbar";

type PendingOnlineProps = {
  items: Item[];
  total: number;
  businessName: string;
  today: string;
};

/**
 * Inicio → "Reservas online por confirmar": confirmar con un toque y avisarle
 * al cliente por WhatsApp, sin ir a la agenda.
 */
export function PendingOnline({ items, total, businessName, today }: PendingOnlineProps) {
  // Las confirmadas desaparecen de la lista del servidor; se quedan acá para poder avisarle al cliente.
  const [confirmed, setConfirmed] = useState<Item[]>([]);
  const confirmedIds = new Set(confirmed.map((c) => c.id));
  const rows = [
    ...items.filter((i) => !confirmedIds.has(i.id)).map((i) => ({ item: i, done: false })),
    ...confirmed.map((i) => ({ item: i, done: true })),
  ].sort((a, b) => `${a.item.date}${a.item.start}`.localeCompare(`${b.item.date}${b.item.start}`));

  if (!rows.length) return null;
  const extra = Math.max(total - items.length, 0);
  // Las que siguen esperando: las de la lista sin confirmar + las que no entran en la lista.
  const pendingCount = items.filter((i) => !confirmedIds.has(i.id)).length + extra;

  return (
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Globe className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">
            {pendingCount > 0
              ? `Tenés ${pendingCount} reserva${pendingCount === 1 ? "" : "s"} online por confirmar`
              : "Reservas online al día"}
          </h3>
          <p className="text-xs text-muted-foreground">Las hicieron tus clientes desde tu página.</p>
        </div>
      </header>

      <ul className="divide-y">
        {rows.map(({ item, done }) => (
          <Row key={item.id} item={item} done={done} businessName={businessName} today={today} onConfirmed={(i) => setConfirmed((c) => [...c, i])} />
        ))}
      </ul>

      {extra > 0 && (
        <Link
          href={agendaHref(items[items.length - 1].date, "semana")}
          className="flex items-center justify-center gap-1.5 border-t px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
        >
          Y {extra} más en la agenda <ArrowRight className="size-4" />
        </Link>
      )}
    </section>
  );
}

function Row({
  item,
  done,
  businessName,
  today,
  onConfirmed,
}: {
  item: Item;
  done: boolean;
  businessName: string;
  today: string;
  onConfirmed: (item: Item) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const data = { clientName: item.clientName, serviceName: item.serviceName, date: item.date, time: item.start, businessName, today };
  // Antes de confirmar: escribirle; después: mandarle la confirmación.
  const chat = whatsAppLink(
    item.clientPhone,
    done
      ? messages.confirmation(data)
      : `Hola ${item.clientName.split(" ")[0]}, te escribo por tu reserva de ${item.serviceName} para ${relativeDay(item.date, today)} a las ${item.start}. ${businessName}`,
  );

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await setAppointmentStatus(item.id, "confirmed");
      if (result.ok) onConfirmed(item);
      else setError(result.error);
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Link
        href={agendaHref(item.date, "dia")}
        className="flex w-16 shrink-0 flex-col rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="Ver en la agenda"
      >
        <span className="text-xs text-muted-foreground">
          {item.date === today ? "Hoy" : shortDayLabel(item.date)}
        </span>
        <span className="font-mono text-sm tabular">{item.start}</span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">{item.serviceName}</p>
        {error && <p className="mt-0.5 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {done ? (
          <>
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="size-3.5" /> Confirmado
            </span>
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/30 bg-success-soft px-2.5 text-xs font-medium text-success transition-colors hover:bg-success/20"
              >
                <MessageCircle className="size-3.5" /> Avisarle
              </a>
            )}
          </>
        ) : (
          <>
            {chat && (
              <a
                href={chat}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Escribirle a ${item.clientName} por WhatsApp`}
                className="inline-flex size-8 items-center justify-center rounded-lg border border-success/30 bg-success-soft text-success transition-colors hover:bg-success/20"
              >
                <MessageCircle className="size-4" />
              </a>
            )}
            <button
              type="button"
              onClick={confirm}
              disabled={pending}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity",
                pending && "opacity-60",
              )}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" strokeWidth={3} />}
              Confirmar
            </button>
          </>
        )}
      </div>
    </li>
  );
}
