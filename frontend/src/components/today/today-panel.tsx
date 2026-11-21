"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, CheckCheck, Coffee, MoonStar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  isOpenStatus,
  STATUS_LABELS,
  STATUS_STYLES,
  type TodayAppointment,
} from "@/lib/appointments/status";

/**
 * Tarjeta "Hoy" del inicio: lo que estás atendiendo, lo que viene y lo que ya pasó.
 * También se usa como muestra en las pantallas de marca (login) con `demo`.
 */

type HoursInfo = {
  /** ¿Cargó su horario semanal? */
  hasHours: boolean;
  /** Horario real de hoy (ya descontados los bloqueos). */
  open: { start: string; end: string }[];
  /** Motivo si hoy está bloqueado todo el día. */
  allDayBlock?: string | null;
};

type TodayPanelProps = {
  appointments: TodayAppointment[];
  /** "vie 20 nov" */
  dateLabel: string;
  timeZone: string;
  hours: HoursInfo;
  /** Muestra con hora fija (minutos desde medianoche) y sin acciones reales. */
  demo?: { nowMinutes: number };
  className?: string;
};

type TabKey = "now" | "upcoming" | "done";

function toMinutes(hhmm: string) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function nowInZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone })
    .formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value) * 60 + Number(parts.find((p) => p.type === "minute")?.value);
}

function subscribeMinute(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

/** 25 → "25 min" · 90 → "1 h 30 min" */
function inMinutes(m: number) {
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 60)} h`;
}

export function TodayPanel({ appointments, dateLabel, timeZone, hours, demo, className }: TodayPanelProps) {
  // En el servidor (prerender) no hay "ahora": -1 = todavía no se sabe.
  const liveNow = useSyncExternalStore(subscribeMinute, () => nowInZone(timeZone), () => -1);
  const now = demo ? demo.nowMinutes : liveNow;

  const sorted = [...appointments].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const inProgress = sorted.filter(
    (a) => isOpenStatus(a.status) && !a.rescheduledTo && now >= 0 && toMinutes(a.start) <= now && now < toMinutes(a.end),
  );
  const upcoming = sorted.filter(
    (a) => isOpenStatus(a.status) && !a.rescheduledTo && (now < 0 || toMinutes(a.start) > now),
  );
  const done = sorted.filter((a) => !inProgress.includes(a) && !upcoming.includes(a)).reverse();

  // Pestaña automática: "En curso" si hay alguien, si no "Próximos". El usuario puede cambiarla.
  const [chosen, setChosen] = useState<TabKey | null>(null);
  const tab: TabKey = chosen ?? (inProgress.length ? "now" : "upcoming");

  const nextUp = upcoming[0];
  const openNow = hours.open.some((r) => now >= 0 && toMinutes(r.start) <= now && now < toMinutes(r.end));

  return (
    <section className={cn("flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]", className)}>
      {/* Encabezado: fecha + horario de hoy */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-medium">
            Hoy <span className="font-normal text-muted-foreground first-letter:uppercase">· {dateLabel}</span>
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {!hours.hasHours ? (
              demo ? null : (
                <Link href="/dashboard/horarios" className="text-primary hover:underline">
                  Cargá tus horarios para empezar →
                </Link>
              )
            ) : hours.allDayBlock ? (
              <span className="text-warning">No atendés hoy · {hours.allDayBlock}</span>
            ) : hours.open.length ? (
              <>
                Atendés{" "}
                <span className="font-mono text-foreground tabular">
                  {hours.open.map((r) => `${r.start}–${r.end}`).join(" · ")}
                </span>
              </>
            ) : (
              "Hoy está cerrado"
            )}
          </p>
        </div>
        {!demo && (
          <Link
            href="/dashboard/agenda"
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver agenda <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setChosen(v as TabKey)} className="gap-3">
        <TabsList className="grid h-10 w-full grid-cols-3 rounded-lg border bg-inset p-1">
          <PanelTab value="now" label="En curso" count={inProgress.length} highlight={inProgress.length > 0} />
          <PanelTab value="upcoming" label="Próximos" count={upcoming.length} />
          <PanelTab value="done" label="Atendidos" count={done.length} />
        </TabsList>

        <TabsContent value="now" className="min-h-44">
          {inProgress.length ? (
            <ul className="flex flex-col gap-2">
              {inProgress.map((a) => {
                const total = toMinutes(a.end) - toMinutes(a.start);
                const elapsed = Math.min(total, Math.max(0, now - toMinutes(a.start)));
                return (
                  <li key={a.id} className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
                    <AppointmentRow appointment={a} chip={<Chip style="in_progress">En curso</Chip>} />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-inset">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(elapsed / total) * 100}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Termina en {inMinutes(total - elapsed)}</p>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton demo={!!demo} primary>
                        <CheckCheck className="size-4" /> Finalizar
                      </ActionButton>
                      <ActionButton demo={!!demo}>No vino</ActionButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={nextUp ? Coffee : openNow ? Coffee : MoonStar}
              title={
                nextUp
                  ? `Libre hasta las ${nextUp.start}`
                  : openNow
                    ? "Ahora estás libre"
                    : hours.hasHours
                      ? "Fuera de tu horario"
                      : "Sin turnos en curso"
              }
              detail={nextUp ? `Sigue ${nextUp.clientName} · ${nextUp.serviceName}` : "Cuando un turno empiece, lo vas a ver acá."}
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="min-h-44">
          {upcoming.length ? (
            <ul className="flex flex-col divide-y">
              {upcoming.map((a) => (
                <li key={a.id} className="py-3 first:pt-1 last:pb-0">
                  <AppointmentRow
                    appointment={a}
                    chip={<Chip style={a.status}>{STATUS_LABELS[a.status]}</Chip>}
                    hint={now >= 0 ? `en ${inMinutes(toMinutes(a.start) - now)}` : undefined}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CalendarCheck2}
              title="No tenés más turnos hoy"
              detail={
                demo
                  ? ""
                  : "Cuando tus clientes reserven o cargues un turno en la Agenda, aparecen acá."
              }
            />
          )}
        </TabsContent>

        <TabsContent value="done" className="min-h-44">
          {done.length ? (
            <ul className="flex flex-col divide-y">
              {done.map((a) => (
                <li key={a.id} className="py-3 first:pt-1 last:pb-0">
                  <AppointmentRow
                    appointment={a}
                    muted
                    chip={
                      a.rescheduledTo ? (
                        <Chip style="rescheduled">Reprogramado → {a.rescheduledTo}</Chip>
                      ) : isOpenStatus(a.status) ? (
                        // Ya pasó la hora pero nadie lo cerró.
                        <Chip style="pending">Sin cerrar</Chip>
                      ) : (
                        <Chip style={a.status}>{STATUS_LABELS[a.status]}</Chip>
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={CheckCheck}
              title="Todavía no atendiste a nadie hoy"
              detail="Acá vas a ver los turnos que pasaron: finalizados, cancelados, no vino o reprogramados."
            />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PanelTab({ value, label, count, highlight }: { value: TabKey; label: string; count: number; highlight?: boolean }) {
  return (
    <TabsTrigger
      value={value}
      className="h-full gap-1.5 rounded-md text-[13px] data-active:bg-raised data-active:text-foreground data-active:shadow-none"
    >
      {label}
      <span
        className={cn(
          "min-w-5 rounded-full px-1.5 font-mono text-[11px] leading-5 tabular",
          highlight ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
        )}
      >
        {count}
      </span>
    </TabsTrigger>
  );
}

function AppointmentRow({
  appointment: a,
  chip,
  hint,
  muted,
}: {
  appointment: TodayAppointment;
  chip: React.ReactNode;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-[4.75rem] shrink-0 pt-0.5">
        <p className={cn("font-mono text-sm tabular", muted ? "text-muted-foreground" : "text-foreground")}>{a.start}</p>
        <p className="font-mono text-[11px] text-faint tabular">{a.end}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", muted && "text-muted-foreground")}>{a.clientName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {a.serviceName}
          {hint && <span className="text-faint"> · {hint}</span>}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">{chip}</div>
    </div>
  );
}

function Chip({ style, children }: { style: keyof typeof STATUS_STYLES; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", STATUS_STYLES[style])}>
      {children}
    </span>
  );
}

/** Botón de acción rápida. En la muestra del login es solo visual. */
function ActionButton({ demo, primary, children }: { demo: boolean; primary?: boolean; children: React.ReactNode }) {
  const className = cn(
    "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium",
    primary ? "bg-primary text-primary-foreground" : "border border-line-strong text-foreground",
  );
  if (demo) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }
  // Se conecta en el Sprint 3, cuando existan los turnos.
  return (
    <button type="button" className={cn(className, "transition-opacity hover:opacity-90")}>
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: React.ElementType; title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center">
      <Icon className="size-5 text-faint" />
      <p className="text-sm font-medium">{title}</p>
      {detail && <p className="max-w-sm text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
