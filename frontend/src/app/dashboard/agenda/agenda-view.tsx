"use client";

import { Fragment, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronDown, Clock, Globe, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/appointments/status";
import type { AgendaAppointment, AgendaDay } from "@/lib/agenda/data";
import { hhmmToMinutes, localParts, minutesToHHMM } from "@/lib/time/zone";
import { agendaHref } from "./agenda-toolbar";

/**
 * Agenda en cuadrícula: filas cada 30 min × columnas por día.
 * Cada celda lista TODOS los turnos que empiezan en esa media hora (si hay
 * varios, se apilan y la celda crece): nunca se tapan entre sí.
 */

const SLOT = 30;

/** Rayado diagonal para lo que está cerrado (igual que en Horarios). */
const CLOSED_PATTERN = "repeating-linear-gradient(-45deg, transparent 0 6px, rgb(220 230 240 / 0.05) 6px 7px)";
/** Rayado ámbar para los bloqueos. */
const BLOCK_PATTERN = "repeating-linear-gradient(-45deg, rgb(245 197 107 / 0.10) 0 6px, transparent 6px 12px)";

function subscribeMinute(cb: () => void) {
  const id = setInterval(cb, 60_000);
  return () => clearInterval(id);
}

/** Minutos actuales en la zona del negocio (−1 en el servidor). */
function useNowMinutes(timeZone: string) {
  return useSyncExternalStore(subscribeMinute, () => localParts(new Date(), timeZone).minutes, () => -1);
}

/** Rango de horas a mostrar: 8–20 como mínimo, ampliado por horarios y turnos. */
function visibleRange(days: AgendaDay[]) {
  let from = 8;
  let to = 20;
  for (const d of days) {
    for (const r of d.hours) {
      from = Math.min(from, Math.floor(hhmmToMinutes(r.start) / 60));
      to = Math.max(to, Math.ceil(hhmmToMinutes(r.end) / 60));
    }
    for (const a of [...d.appointments, ...d.inactive]) {
      from = Math.min(from, Math.floor(a.startMin / 60));
      to = Math.max(to, Math.ceil(a.endMin / 60));
    }
  }
  return { from, to: Math.min(24, to) };
}

/** "3 turnos" · "Bloqueado · Feriado" · "Libre" / "Sin turnos" · "Cerrado" */
function dayStatus(d: AgendaDay, emptyLabel: string, withReason = false) {
  const n = d.appointments.length;
  if (n) return `${n} turno${n === 1 ? "" : "s"}`;
  const allDay = d.blocks.find((b) => b.allDay);
  if (allDay) return withReason ? `Bloqueado · ${allDay.label}` : "Bloqueado";
  return d.hours.length ? emptyLabel : "Cerrado";
}

const isBlockedAllDay = (d: AgendaDay) => d.blocks.some((b) => b.allDay) && !d.appointments.length;

type AgendaViewProps = {
  days: AgendaDay[];
  view: "dia" | "semana";
  timeZone: string;
  /** Tocar una celda abre "Nuevo turno" con ese día y hora. */
  onCreate?: (date: string, time: string) => void;
  /** Turno recién cargado: se resalta unos segundos. */
  highlightId?: string | null;
  /** Tocar un turno abre su detalle. */
  onOpen?: (id: string) => void;
};

export function AgendaView({ days, view, timeZone, onCreate, highlightId, onOpen }: AgendaViewProps) {
  const now = useNowMinutes(timeZone);
  const range = visibleRange(days);
  // Con varios profesionales, cada turno muestra quién atiende (el color solo no alcanza).
  const multi = new Set(days.flatMap((d) => [...d.appointments, ...d.inactive].map((a) => a.memberName))).size > 1;

  if (view === "dia") {
    const day = days[0];
    return (
      <div className="flex flex-col gap-4">
        <DaySummary day={day} />
        <AgendaGrid days={days} range={range} now={now} multi={multi} onCreate={onCreate} highlightId={highlightId} onOpen={onOpen} />
        <InactiveList appointments={day.inactive} onOpen={onOpen} />
      </div>
    );
  }

  return (
    <>
      {/* Escritorio y tablet: cuadrícula de la semana */}
      <div className="hidden md:block">
        <AgendaGrid days={days} range={range} now={now} week multi={multi} onCreate={onCreate} highlightId={highlightId} onOpen={onOpen} />
      </div>

      {/* Celular: lista por día */}
      <ul className="flex flex-col gap-3 md:hidden">
        {days.map((d) => (
          <li key={d.date} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
            <Link
              href={agendaHref(d.date, "dia")}
              className={cn("flex items-baseline justify-between gap-3 px-4 py-3", d.isToday && "bg-primary-soft")}
            >
              <span className={cn("font-medium", d.isToday && "text-primary")}>
                {d.label}
                {d.isToday && <span className="ml-2 text-xs font-normal">Hoy</span>}
              </span>
              <span className={cn("text-xs", isBlockedAllDay(d) ? "text-warning" : "text-muted-foreground")}>
                {dayStatus(d, "Sin turnos", true)}
              </span>
            </Link>
            {d.appointments.length > 0 && (
              <ul className="divide-y border-t">
                {d.appointments.map((a) => (
                  <li key={a.id}>
                    <ListRow appointment={a} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Resumen arriba de la vista Día. */
function DaySummary({ day }: { day: AgendaDay }) {
  const allDay = day.blocks.find((b) => b.allDay);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">
        {day.appointments.length
          ? `${day.appointments.length} turno${day.appointments.length === 1 ? "" : "s"}`
          : "Sin turnos"}
      </span>
      <span>·</span>
      {allDay ? (
        <span className="text-warning">No atendés · {allDay.label}</span>
      ) : day.hours.length ? (
        <span>
          Atendés{" "}
          <span className="font-mono text-foreground tabular">
            {day.hours.map((r) => `${r.start}–${r.end}`).join(" · ")}
          </span>
        </span>
      ) : (
        <span>Cerrado</span>
      )}
    </p>
  );
}

/** La cuadrícula: columna de horas fija + una columna por día. */
function AgendaGrid({
  days,
  range,
  now,
  week,
  multi,
  onCreate,
  highlightId,
  onOpen,
}: {
  days: AgendaDay[];
  range: { from: number; to: number };
  now: number;
  week?: boolean;
  multi?: boolean;
  onCreate?: (date: string, time: string) => void;
  highlightId?: string | null;
  onOpen?: (id: string) => void;
}) {
  const slots: number[] = [];
  for (let m = range.from * 60; m < range.to * 60; m += SLOT) slots.push(m);
  const nowSlot = days.some((d) => d.isToday) && now >= 0 ? Math.floor(now / SLOT) * SLOT : -1;

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/[0.07]">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `4.25rem repeat(${days.length}, minmax(${week ? "8.5rem" : "0"}, 1fr))`,
        }}
      >
        {/* Encabezado de días (solo semana) */}
        {week && (
          <>
            <div className="sticky left-0 z-20 border-b bg-card" />
            {days.map((d) => (
              <Link
                key={d.date}
                href={agendaHref(d.date, "dia")}
                className={cn(
                  "border-b border-l px-2 py-2.5 text-center transition-colors hover:bg-raised",
                  d.isToday && "bg-primary-soft",
                )}
              >
                <span className={cn("block text-sm font-medium", d.isToday && "text-primary")}>{d.label}</span>
                <span className={cn("block text-[11px]", isBlockedAllDay(d) ? "text-warning" : "text-muted-foreground")}>
                  {dayStatus(d, "Libre")}
                </span>
              </Link>
            ))}
          </>
        )}

        {/* Filas cada 30 min */}
        {slots.map((m, rowIndex) => {
          const fullHour = m % 60 === 0;
          return (
            <Fragment key={m}>
              <div
                className={cn(
                  "sticky left-0 z-10 flex items-start justify-end bg-card px-2.5 pt-2 font-mono tabular",
                  rowIndex > 0 && (fullHour ? "border-t" : "border-t border-dashed border-border/60"),
                  fullHour ? "text-xs text-muted-foreground" : "text-[11px] text-faint",
                  m === nowSlot && "text-now",
                )}
              >
                {minutesToHHMM(m)}
              </div>
              {days.map((d) => (
                <Cell
                  key={d.date}
                  day={d}
                  slot={m}
                  first={rowIndex === 0}
                  fullHour={fullHour}
                  isNow={d.isToday && m === nowSlot}
                  week={week}
                  multi={multi}
                  onCreate={onCreate}
                  highlightId={highlightId}
                  onOpen={onOpen}
                />
              ))}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Cell({
  day,
  slot,
  first,
  fullHour,
  isNow,
  week,
  multi,
  onCreate,
  highlightId,
  onOpen,
}: {
  day: AgendaDay;
  slot: number;
  first: boolean;
  fullHour: boolean;
  isNow: boolean;
  week?: boolean;
  multi?: boolean;
  onCreate?: (date: string, time: string) => void;
  highlightId?: string | null;
  onOpen?: (id: string) => void;
}) {
  const starting = day.appointments.filter((a) => a.startMin >= slot && a.startMin < slot + SLOT);
  const ongoing = day.appointments.filter((a) => a.startMin < slot && a.endMin > slot);
  const open = day.hours.some((r) => hhmmToMinutes(r.start) <= slot && slot < hhmmToMinutes(r.end));
  const block = day.blocks.find((b) => b.startMin < slot + SLOT && b.endMin > slot);
  // El cartel del bloqueo va solo en su primera celda visible.
  const blockLabel = block && (first || block.startMin >= slot) ? block : null;

  const free = starting.length === 0 && ongoing.length === 0 && !block && open;
  const create = onCreate ? () => onCreate(day.date, minutesToHHMM(slot)) : undefined;

  return (
    <div
      onClick={create}
      onKeyDown={create ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), create()) : undefined}
      role={create ? "button" : undefined}
      tabIndex={create ? 0 : undefined}
      aria-label={create ? `Nuevo turno ${day.label} a las ${minutesToHHMM(slot)}` : undefined}
      className={cn(
        "group/cell relative flex min-h-11 min-w-0 flex-col gap-1 border-l p-1",
        create && "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        !first && (fullHour ? "border-t" : "border-t border-t-border/50 border-dashed"),
        !block && (open ? "bg-card" : "bg-inset"),
        isNow && "ring-1 ring-now/60 ring-inset",
      )}
      style={block ? { backgroundImage: BLOCK_PATTERN } : !open ? { backgroundImage: CLOSED_PATTERN } : undefined}
    >
      {blockLabel && (
        <span className="self-start rounded bg-background/80 px-1.5 py-0.5 text-[11px] text-warning">
          {week ? "Bloqueado" : `Bloqueado · ${blockLabel.label}`}
        </span>
      )}

      {starting.map((a) => (
        <AppointmentChip key={a.id} appointment={a} week={week} multi={multi} highlighted={a.id === highlightId} onOpen={onOpen} />
      ))}

      {create && free && (
        <span
          className="pointer-events-none absolute inset-1 hidden items-center justify-center rounded-md border border-dashed border-primary/40 text-primary group-hover/cell:flex group-focus-visible/cell:flex"
          aria-hidden="true"
        >
          <Plus className="size-4" />
        </span>
      )}

      {starting.length === 0 &&
        ongoing.map((a) => (
          <span key={a.id} className="truncate px-1 text-[11px] text-faint" title={`${a.clientName} sigue hasta las ${a.end}`}>
            ↳ {a.clientName.split(" ")[0]} (sigue)
          </span>
        ))}
    </div>
  );
}

/** Turno dentro de una celda. */
function AppointmentChip({
  appointment: a,
  week,
  multi,
  highlighted,
  onOpen,
}: {
  appointment: AgendaAppointment;
  week?: boolean;
  multi?: boolean;
  highlighted?: boolean;
  onOpen?: (id: string) => void;
}) {
  const who = multi ? a.memberName.split(" ")[0] : null;
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          e.stopPropagation();
          onOpen(a.id);
        }
      }}
      className={cn(
        "min-w-0 rounded-md border-l-[3px] bg-raised px-2 py-1.5 ring-1 ring-foreground/6 transition-shadow",
        onOpen && "cursor-pointer outline-none hover:bg-[color-mix(in_oklab,var(--raised),white_4%)] focus-visible:ring-2 focus-visible:ring-ring",
        a.status === "completed" && "opacity-75",
        highlighted && "animate-pulse ring-2 ring-primary",
      )}
      style={{ borderLeftColor: a.memberColor }}
      // Tocar un turno abre su detalle (y no "Nuevo turno" de la celda).
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(a.id);
      }}
      title={`${a.start}–${a.end} · ${a.clientName} · ${a.serviceName}${who ? ` · ${a.memberName}` : ""} · ${STATUS_LABELS[a.status]}${a.online ? " · Reservado online" : ""}`}
    >
      {week ? (
        <>
          <p className="truncate text-[12.5px] leading-tight font-medium">{a.clientName}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] leading-tight text-muted-foreground">
            <StatusDot status={a.status} />
            <span className="font-mono tabular">{a.start}</span>
            {a.online && <Globe className="size-3 shrink-0 text-primary" aria-label="Reservado online" />}
            <span className="truncate">· {who ?? a.serviceName}</span>
          </p>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-xs text-muted-foreground tabular">
            {a.start}–{a.end}
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{a.clientName}</span>
          <span className="min-w-0 truncate text-xs text-muted-foreground">{a.serviceName}</span>
          {a.online && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Globe className="size-3" aria-hidden="true" /> Online
            </span>
          )}
          {who && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: a.memberColor }} aria-hidden="true" />
              {who}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {a.status === "completed" && !a.payment && <span className="text-xs text-warning">Sin cobrar</span>}
            <StatusChip status={a.status} />
          </span>
        </div>
      )}
    </div>
  );
}

/** Puntito de color del estado (para la semana, donde no entra el texto). */
function StatusDot({ status }: { status: AgendaAppointment["status"] }) {
  const color: Record<AgendaAppointment["status"], string> = {
    pending: "bg-muted-foreground",
    confirmed: "bg-primary",
    in_progress: "bg-primary ring-2 ring-primary/30",
    completed: "bg-success",
    cancelled: "bg-destructive",
    no_show: "bg-warning",
  };
  return <span className={cn("size-1.5 shrink-0 rounded-full", color[status])} aria-label={STATUS_LABELS[status]} />;
}

function StatusChip({ status, label }: { status: keyof typeof STATUS_STYLES; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap",
        STATUS_STYLES[status],
      )}
    >
      {label ?? STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
    </span>
  );
}

/** Fila de lista (semana en el celular y lista de cancelados). */
function ListRow({
  appointment: a,
  muted,
  onOpen,
}: {
  appointment: AgendaAppointment;
  muted?: boolean;
  onOpen?: (id: string) => void;
}) {
  return (
    <div
      className={cn("flex items-center gap-3 px-4 py-3", onOpen && "cursor-pointer transition-colors hover:bg-raised")}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? () => onOpen(a.id) : undefined}
      onKeyDown={onOpen ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(a.id)) : undefined}
    >
      <span className="h-8 w-0.75 shrink-0 rounded-full" style={{ backgroundColor: a.memberColor }} aria-hidden="true" />
      <div className="w-18 shrink-0">
        <p className={cn("font-mono text-sm tabular", muted && "text-muted-foreground")}>{a.start}</p>
        <p className="font-mono text-[11px] text-faint tabular">{a.end}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", muted && "text-muted-foreground")}>{a.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {a.serviceName}
          {a.cancelReason && ` · ${a.cancelReason}`}
        </p>
      </div>
      {a.rescheduledTo ? (
        <StatusChip status="rescheduled" label={`Reprogramado → ${a.rescheduledTo}`} />
      ) : (
        <StatusChip status={a.status} />
      )}
    </div>
  );
}

/** Cancelados, "no vino" y reprogramados: no ocupan lugar en la cuadrícula. */
function InactiveList({ appointments, onOpen }: { appointments: AgendaAppointment[]; onOpen?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!appointments.length) return null;
  const n = appointments.length;
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Clock className="size-4" />
          {n} turno{n === 1 ? "" : "s"} cancelado{n === 1 ? "" : "s"}, no vino o reprogramado{n === 1 ? "" : "s"}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="divide-y border-t">
          {appointments.map((a) => (
            <li key={a.id}>
              <ListRow appointment={a} muted onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
