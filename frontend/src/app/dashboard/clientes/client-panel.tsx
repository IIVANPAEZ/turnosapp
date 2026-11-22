"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowLeft, CalendarPlus, Globe, Loader2, MessageCircle, Pencil, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPYG } from "@/lib/format";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/appointments/status";
import { getClientDetail, updateClient, type ClientAppointment, type ClientDetail } from "@/lib/clients/actions";
import { CLIENT_NOTES_MAX, PAYMENT_METHOD_LABELS } from "@/lib/clients/schemas";
import { WEEKDAYS_SHORT, weekdayOf } from "@/lib/time/zone";
import { whatsAppLink } from "@/lib/whatsapp";
import { NewAppointmentForm, type ServiceOption } from "../agenda/new-appointment-form";
import { dayMonth, monthYear } from "./dates";

type ClientPanelProps = {
  clientId: string;
  today: string;
  services: ServiceOption[];
  onNotice: (message: string) => void;
  onClose: () => void;
};

type Mode = "view" | "edit" | "book";

/** Ficha del cliente: datos, contacto, próximos turnos e historial. */
export function ClientPanel({ clientId, today, services, onNotice, onClose }: ClientPanelProps) {
  const [detail, setDetail] = useState<ClientDetail | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>("view");

  const load = useCallback(async () => {
    const d = await getClientDetail(clientId);
    setDetail(d);
  }, [clientId]);

  useEffect(() => {
    let alive = true;
    getClientDetail(clientId).then((d) => alive && setDetail(d));
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (detail === undefined) return <PanelSkeleton />;
  if (detail === null) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <SheetTitle>No encontramos este cliente</SheetTitle>
        <SheetDescription>Puede que el link esté mal o que el cliente sea de otro negocio.</SheetDescription>
      </div>
    );
  }

  if (mode === "book") {
    return (
      <>
        <SheetHeader className="px-5 pt-5 pb-4">
          <SheetTitle className="text-lg">Nuevo turno</SheetTitle>
          <SheetDescription>Para {detail.name}.</SheetDescription>
        </SheetHeader>
        <NewAppointmentForm
          services={services}
          initialDate={today}
          initialClient={{ id: detail.id, name: detail.name, phone: detail.phone }}
          today={today}
          onCancel={() => setMode("view")}
          onDone={(_id, message) => {
            onNotice(message);
            setMode("view");
            void load();
          }}
        />
      </>
    );
  }

  const upcoming = detail.appointments
    .filter((a) => !a.rescheduled && (a.status === "pending" || a.status === "confirmed") && a.date >= today)
    .reverse();
  const upcomingIds = new Set(upcoming.map((a) => a.id));
  const history = detail.appointments.filter((a) => !upcomingIds.has(a.id));
  const visits = detail.appointments.filter((a) => a.status === "completed").length;
  const noShows = detail.appointments.filter((a) => a.status === "no_show").length;
  const paid = detail.appointments.reduce((sum, a) => sum + (a.payment?.amount ?? 0), 0);
  const firstName = detail.name.trim().split(/\s+/)[0];
  const chat = whatsAppLink(detail.phone, `Hola ${firstName}, `);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SheetHeader className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-raised text-base font-medium text-muted-foreground">
            {detail.name.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-lg">{detail.name}</SheetTitle>
            <SheetDescription>Cliente desde {monthYear(detail.since)}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        {mode === "edit" ? (
          <EditClient
            detail={detail}
            onCancel={() => setMode("view")}
            onSaved={(message) => {
              onNotice(message);
              setMode("view");
              void load();
            }}
          />
        ) : (
          <>
            {/* Números */}
            <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
              <Stat label="Visitas" value={String(visits)} />
              <Stat label="No vino" value={String(noShows)} tone={noShows > 0 ? "warning" : undefined} />
              <Stat label="Cobrado" value={paid ? formatPYG(paid) : "—"} />
            </div>

            {/* Contacto y nota */}
            <section className="flex flex-col gap-3 rounded-xl border bg-inset p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Celular</p>
                  <p className="font-mono text-sm">{detail.phone ?? "Sin celular"}</p>
                </div>
                <div className="flex items-center gap-1">
                  {detail.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Llamar a ${detail.name}`}
                      render={<a href={`tel:${detail.phone.replace(/[^\d+]/g, "")}`} />}
                      nativeButton={false}
                    >
                      <Phone />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Editar datos" onClick={() => setMode("edit")}>
                    <Pencil />
                  </Button>
                </div>
              </div>
              {chat && (
                <a
                  href={chat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-success/30 bg-success-soft px-3 text-sm font-medium text-success transition-colors hover:bg-success/20"
                >
                  <MessageCircle className="size-4" /> Escribir por WhatsApp
                </a>
              )}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Nota</p>
                {detail.notes ? (
                  <p className="mt-0.5 text-sm whitespace-pre-line">{detail.notes}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="mt-0.5 text-left text-sm text-faint transition-colors hover:text-muted-foreground"
                  >
                    Agregar una nota (preferencias, cómo ubicarlo…)
                  </button>
                )}
              </div>
            </section>

            {/* Próximos */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Próximos turnos</h3>
              {upcoming.length ? (
                <ul className="flex flex-col gap-2">
                  {upcoming.map((a) => (
                    <AppointmentRow key={a.id} a={a} today={today} highlight />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No tiene turnos por venir.</p>
              )}
            </section>

            {/* Historial */}
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Historial</h3>
              {history.length ? (
                <ul className="divide-y rounded-xl border">
                  {history.map((a) => (
                    <AppointmentRow key={a.id} a={a} today={today} />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Todavía no tiene turnos pasados.</p>
              )}
            </section>
          </>
        )}
      </div>

      {mode === "view" && (
        <div className="flex gap-2 border-t p-4">
          <Button variant="ghost" onClick={onClose} className="sm:hidden">
            Cerrar
          </Button>
          <Button className="flex-1" onClick={() => setMode("book")} disabled={!services.length}>
            <CalendarPlus /> Nuevo turno para {firstName}
          </Button>
        </div>
      )}
    </div>
  );
}

function AppointmentRow({ a, today, highlight }: { a: ClientAppointment; today: string; highlight?: boolean }) {
  const day =
    a.date === today ? "Hoy" : `${WEEKDAYS_SHORT[weekdayOf(a.date)]} ${dayMonth(a.date, today)}`;
  return (
    <li className={cn("flex items-start gap-3 px-3 py-2.5", highlight && "rounded-xl border bg-card")}>
      <div className="w-[5.5rem] shrink-0">
        <p className="text-sm">{day}</p>
        <p className="font-mono text-xs text-muted-foreground tabular">{a.start}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {a.serviceName}
          {a.online && <Globe className="size-3 shrink-0 text-primary" aria-label="Reservado online" />}
        </p>
        {a.memberName && <p className="truncate text-xs text-faint">{a.memberName}</p>}
        {a.status === "completed" && (
          <p className={cn("mt-0.5 text-xs", a.payment ? "text-success" : "text-warning")}>
            {a.payment
              ? `Cobrado ${formatPYG(a.payment.amount)} · ${PAYMENT_METHOD_LABELS[a.payment.method]}`
              : "Sin cobrar"}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
          STATUS_STYLES[a.rescheduled ? "rescheduled" : a.status],
        )}
      >
        {a.rescheduled ? "Reprogramado" : STATUS_LABELS[a.status]}
      </span>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 truncate font-mono text-[15px] font-medium tabular", tone === "warning" && "text-warning")}>
        {value}
      </p>
    </div>
  );
}

function EditClient({
  detail,
  onCancel,
  onSaved,
}: {
  detail: ClientDetail;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(detail.name);
  const [phone, setPhone] = useState(detail.phone ?? "");
  const [notes, setNotes] = useState(detail.notes ?? "");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateClient({ id: detail.id, name, phone, notes });
      if (result.ok) onSaved(result.message);
      else setError({ field: result.field, message: result.error });
    });
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onCancel}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver a la ficha
      </button>
      <FieldGroup>
        <Field data-invalid={error?.field === "name"}>
          <FieldLabel htmlFor="client-name">Nombre y apellido</FieldLabel>
          <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          {error?.field === "name" && <FieldError>{error.message}</FieldError>}
        </Field>
        <Field data-invalid={error?.field === "phone"}>
          <FieldLabel htmlFor="client-phone">Celular</FieldLabel>
          <Input
            id="client-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0981 123 456"
            maxLength={30}
          />
          {error?.field === "phone" && <FieldError>{error.message}</FieldError>}
        </Field>
        <Field data-invalid={error?.field === "notes"}>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="client-notes">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <span className={cn("font-mono text-xs tabular", notes.length > CLIENT_NOTES_MAX ? "text-destructive" : "text-faint")}>
              {notes.length}/{CLIENT_NOTES_MAX}
            </span>
          </div>
          <Textarea
            id="client-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej.: Prefiere la tarde. Viene con su hija."
          />
          {error?.field === "notes" ? (
            <FieldError>{error.message}</FieldError>
          ) : (
            <FieldDescription>Solo la ve tu equipo. No anotes datos de salud.</FieldDescription>
          )}
        </Field>
      </FieldGroup>
      {error && !error.field && <p className="text-sm text-destructive">{error.message}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5 p-5" aria-busy="true">
      <SheetTitle className="sr-only">Cargando cliente</SheetTitle>
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-full bg-raised" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 rounded bg-raised" />
          <div className="h-3.5 w-28 rounded bg-raised/60" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-card" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-inset" />
      <div className="h-40 rounded-xl bg-card" />
    </div>
  );
}
