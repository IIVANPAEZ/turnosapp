"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CircleAlert,
  Globe,
  Loader2,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  ThumbsUp,
  UserX,
  XCircle,
} from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { TimeSelect } from "@/components/schedule/time-select";
import { cn } from "@/lib/utils";
import { formatDuration, formatPYG } from "@/lib/format";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/appointments/status";
import type { AgendaAppointment } from "@/lib/agenda/data";
import {
  getDayAvailability,
  rescheduleAppointment,
  setAppointmentStatus,
  updateAppointmentNotes,
  type AppointmentActionResult,
  type DayAvailability,
} from "@/lib/agenda/actions";
import { checkTime, freeSlots } from "@/lib/agenda/slots";
import { localParts, longDayLabel, WEEKDAYS_LONG, weekdayOf } from "@/lib/time/zone";
import { messages, whatsAppLink } from "@/lib/whatsapp";
import { agendaHref, type AgendaView } from "./agenda-toolbar";

type AppointmentDetailProps = {
  appointment: AgendaAppointment;
  businessName: string;
  timeZone: string;
  today: string;
  view: AgendaView;
  /** Avisa a la agenda (mensaje + turno a resaltar + fecha a la que ir). */
  onChanged: (message: string, highlightId?: string, goToDate?: string) => void;
};

type Panel = "none" | "cancel" | "reschedule";
type FollowUp = { kind: "cancelled" | "rescheduled"; date: string; time: string } | null;

const CANCEL_REASONS = ["Lo pidió el cliente", "No puedo atender", "Se enfermó"];

export function AppointmentDetail({ appointment: a, businessName, timeZone, today, view, onChanged }: AppointmentDetailProps) {
  const [panel, setPanel] = useState<Panel>("none");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(a.notes ?? "");

  // ¿Ya empezó? ("Finalizar" y "No vino" solo desde la hora de inicio.)
  const nowLocal = localParts(new Date(), timeZone);
  const started = a.date < nowLocal.ymd || (a.date === nowLocal.ymd && nowLocal.minutes >= a.startMin);
  const open = (a.status === "pending" || a.status === "confirmed") && !a.rescheduledTo;
  const closed = (a.status === "completed" || a.status === "no_show" || a.status === "cancelled") && !a.rescheduledTo;

  const messageData = { clientName: a.clientName, serviceName: a.serviceName, date: a.date, time: a.start, businessName, today };
  const confirmLink = whatsAppLink(a.clientPhone, messages.confirmation(messageData));
  const reminderLink = whatsAppLink(a.clientPhone, messages.reminder(messageData));

  const run = (action: () => Promise<AppointmentActionResult>, after?: (r: AppointmentActionResult & { ok: true }) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) return setError(result.error);
      after?.(result);
      if (!after) onChanged(result.message, a.id);
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        {/* Encabezado */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {a.rescheduledTo ? (
              <Chip style="rescheduled">Reprogramado → {a.rescheduledTo}</Chip>
            ) : (
              <Chip style={a.status}>{STATUS_LABELS[a.status]}</Chip>
            )}
            {a.date === today && open && started && <Chip style="in_progress">Ahora</Chip>}
            {a.online && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-primary">
                <Globe className="size-3" /> Reservado online
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {longDayLabel(a.date, Number(today.slice(0, 4)))} ·{" "}
            <span className="font-mono text-foreground tabular">
              {a.start}–{a.end}
            </span>
          </p>
          <p className="text-sm">
            {a.serviceName} <span className="text-muted-foreground">· {formatDuration(a.endMin - a.startMin)} ·</span>{" "}
            <span className="font-mono tabular">
              {a.priceType === "from" && "desde "}
              {formatPYG(a.price)}
            </span>
          </p>
          {a.cancelReason && <p className="text-sm text-muted-foreground">Motivo: {a.cancelReason}</p>}
          {a.rescheduledToDate && (
            <Link href={agendaHref(a.rescheduledToDate, view)} className="flex items-center gap-1 text-sm text-primary hover:underline">
              Ver turno nuevo <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Contacto */}
        <section className="flex flex-col gap-2 rounded-xl border bg-inset p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Contacto</p>
              <p className="font-mono text-sm">{a.clientPhone ?? "Sin celular"}</p>
            </div>
            {a.clientPhone && (
              <Button variant="ghost" size="icon" aria-label={`Llamar a ${a.clientName}`} render={<a href={`tel:${a.clientPhone.replace(/[^\d+]/g, "")}`} />} nativeButton={false}>
                <Phone />
              </Button>
            )}
          </div>
          {open && (confirmLink || reminderLink) ? (
            <div className="flex flex-wrap gap-2">
              {confirmLink && (
                <WhatsAppButton href={confirmLink}>
                  <ThumbsUp className="size-4" /> Enviar confirmación
                </WhatsAppButton>
              )}
              {reminderLink && (
                <WhatsAppButton href={reminderLink}>
                  <BellRing className="size-4" /> Enviar recordatorio
                </WhatsAppButton>
              )}
            </div>
          ) : (
            !a.clientPhone && <p className="text-xs text-faint">Sin celular no le podés escribir por WhatsApp.</p>
          )}
        </section>

        {/* Nota */}
        <section className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Nota</h3>
            {!editingNotes && (
              <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                <Pencil /> {a.notes ? "Editar" : "Agregar"}
              </Button>
            )}
          </div>
          {editingNotes ? (
            <div className="flex flex-col gap-2">
              <Textarea rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotes(a.notes ?? "");
                    setEditingNotes(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => updateAppointmentNotes(a.id, notes),
                      () => setEditingNotes(false),
                    )
                  }
                >
                  Guardar nota
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn("text-sm", a.notes ? "" : "text-faint")}>{a.notes ?? "Sin nota."}</p>
          )}
        </section>

        {/* Después de cancelar / reprogramar: avisar por WhatsApp */}
        {followUp && (
          <FollowUpCard
            followUp={followUp}
            appointment={a}
            businessName={businessName}
            today={today}
          />
        )}

        {/* Paneles de cancelar / reprogramar */}
        {panel === "cancel" && (
          <CancelPanel
            pending={pending}
            onBack={() => setPanel("none")}
            onConfirm={(reason) =>
              run(
                () => setAppointmentStatus(a.id, "cancelled", reason),
                (r) => {
                  setPanel("none");
                  setFollowUp({ kind: "cancelled", date: a.date, time: a.start });
                  onChanged(r.message);
                },
              )
            }
          />
        )}
        {panel === "reschedule" && (
          <ReschedulePanel
            appointment={a}
            today={today}
            pending={pending}
            onBack={() => setPanel("none")}
            onConfirm={(date, time) =>
              run(
                () => rescheduleAppointment(a.id, date, time),
                (r) => {
                  setPanel("none");
                  setFollowUp({ kind: "rescheduled", date, time });
                  // La agenda se queda donde está: el panel muestra "Avisar por WhatsApp"
                  // y el link "Ver turno nuevo".
                  onChanged(r.message, r.newId);
                },
              )
            }
          />
        )}

        {error && (
          <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
          </p>
        )}
      </div>

      {/* Acciones */}
      {panel === "none" && (open || closed) && (
        <div className="flex flex-col gap-2 border-t px-5 py-4">
          {open && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {started ? (
                  <>
                    <Button onClick={() => run(() => setAppointmentStatus(a.id, "completed"))} disabled={pending}>
                      {pending ? <Loader2 className="animate-spin" /> : <CheckCheck />} Finalizar
                    </Button>
                    <Button variant="outline" onClick={() => run(() => setAppointmentStatus(a.id, "no_show"))} disabled={pending}>
                      <UserX /> No vino
                    </Button>
                  </>
                ) : a.status === "pending" ? (
                  <Button className="col-span-2" onClick={() => run(() => setAppointmentStatus(a.id, "confirmed"))} disabled={pending}>
                    {pending ? <Loader2 className="animate-spin" /> : <ThumbsUp />} Confirmar
                  </Button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setPanel("reschedule")} disabled={pending}>
                  <CalendarClock /> Reprogramar
                </Button>
                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setPanel("cancel")} disabled={pending}>
                  <XCircle /> Cancelar turno
                </Button>
              </div>
              {started && a.status === "pending" && (
                <button
                  type="button"
                  className="self-center text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => run(() => setAppointmentStatus(a.id, "confirmed"))}
                >
                  Marcar como confirmado
                </button>
              )}
            </>
          )}
          {closed && (
            <Button variant="outline" onClick={() => run(() => setAppointmentStatus(a.id, "confirmed"))} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Deshacer · volver a Confirmado
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ style, children }: { style: keyof typeof STATUS_STYLES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLES[style])}>
      {children}
    </span>
  );
}

function WhatsAppButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-success/30 bg-success-soft px-3 text-[13px] font-medium text-success transition-colors hover:bg-success/20"
    >
      {children}
    </a>
  );
}

function FollowUpCard({
  followUp,
  appointment: a,
  businessName,
  today,
}: {
  followUp: NonNullable<FollowUp>;
  appointment: AgendaAppointment;
  businessName: string;
  today: string;
}) {
  const data = { clientName: a.clientName, serviceName: a.serviceName, date: followUp.date, time: followUp.time, businessName, today };
  const link = whatsAppLink(a.clientPhone, followUp.kind === "cancelled" ? messages.cancelled(data) : messages.rescheduled(data));
  if (!link) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success-soft p-3.5">
      <p className="text-sm">
        {followUp.kind === "cancelled" ? "Turno cancelado." : "Turno reprogramado."} ¿Le avisás a {a.clientName.split(" ")[0]}?
      </p>
      <WhatsAppButton href={link}>
        <MessageCircle className="size-4" /> Avisar por WhatsApp
      </WhatsAppButton>
    </div>
  );
}

function CancelPanel({
  pending,
  onBack,
  onConfirm,
}: {
  pending: boolean;
  onBack: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
      <h3 className="text-sm font-medium">¿Cancelar este turno?</h3>
      <p className="text-xs text-muted-foreground">El horario queda libre en tu agenda.</p>
      <div className="flex flex-wrap gap-1.5">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "h-8 rounded-lg border px-2.5 text-xs transition-colors",
              reason === r ? "border-primary/70 bg-primary-soft text-primary" : "bg-inset text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <Input
        value={reason}
        maxLength={120}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        aria-label="Motivo de la cancelación"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={pending}>
          Volver
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onConfirm(reason)} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Sí, cancelar turno
        </Button>
      </div>
    </section>
  );
}

function ReschedulePanel({
  appointment: a,
  today,
  pending,
  onBack,
  onConfirm,
}: {
  appointment: AgendaAppointment;
  today: string;
  pending: boolean;
  onBack: () => void;
  onConfirm: (date: string, time: string) => void;
}) {
  const duration = a.endMin - a.startMin;
  const [date, setDate] = useState(a.date >= today ? a.date : today);
  const [time, setTime] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loading, startLoading] = useTransition();
  const [dateOpen, setDateOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    startLoading(async () => {
      // Se ignora este mismo turno: su horario actual cuenta como libre.
      const result = await getDayAvailability(date, a.id);
      if (alive) setAvailability(result);
    });
    return () => {
      alive = false;
    };
  }, [date, a.id]);

  const dayName = WEEKDAYS_LONG[weekdayOf(date)].toLowerCase();
  const slots = useMemo(
    () => (availability && availability.date === date ? freeSlots(availability, duration) : []),
    [availability, date, duration],
  );
  const check = availability && time ? checkTime(availability, time, duration, dayName) : null;
  const same = date === a.date && time === a.start;
  const [y, m, d] = date.split("-").map(Number);

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-inset p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Reprogramar · {formatDuration(duration)}</h3>
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm transition-colors hover:border-line-strong"
              />
            }
          >
            <CalendarDays className="size-4 text-primary" />
            <span className="first-letter:uppercase">{longDayLabel(date, Number(today.slice(0, 4)))}</span>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-1">
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              selected={new Date(y, m - 1, d)}
              defaultMonth={new Date(y, m - 1, d)}
              onSelect={(day) => {
                if (!day) return;
                setDate(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`);
                setTime(null);
                setDateOpen(false);
              }}
              className="bg-transparent [--cell-size:--spacing(9)]"
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading && !availability ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Buscando horarios libres…
        </p>
      ) : slots.length ? (
        <div className="flex flex-wrap gap-1.5">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setTime(s);
                setManual(false);
              }}
              className={cn(
                "h-8 rounded-lg border px-2.5 font-mono text-[13px] transition-colors tabular",
                time === s ? "border-primary/70 bg-primary-soft text-primary" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No quedan horarios libres ese día. Podés elegir una hora a mano.</p>
      )}

      <div className="flex items-center gap-2 text-sm">
        {manual ? (
          <>
            <span className="text-muted-foreground">Hora:</span>
            <TimeSelect value={time ?? "09:00"} onChange={setTime} aria-label="Nueva hora" className="w-28" />
          </>
        ) : (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setManual(true);
              setTime((t) => t ?? slots[0] ?? a.start);
            }}
          >
            Elegir otra hora
          </button>
        )}
      </div>

      {check?.clash && <p className="text-sm text-destructive">Se pisa con {check.clash}.</p>}
      {!check?.clash && check && check.warnings.length > 0 && (
        <p className="text-sm text-warning">{check.warnings.join(" ")} Igual lo podés mover.</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={pending}>
          Volver
        </Button>
        <Button size="sm" onClick={() => time && onConfirm(date, time)} disabled={pending || !time || !!check?.clash || same}>
          {pending && <Loader2 className="animate-spin" />}
          {time ? `Mover al ${date === a.date ? "mismo día" : `${dayName} ${d}`}, ${time}` : "Elegí un horario"}
        </Button>
      </div>
    </section>
  );
}
