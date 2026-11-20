"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE } from "@/lib/config";

/**
 * "La tira del día": el día de trabajo como una franja horizontal, con los
 * turnos como bloques del color de cada profesional y una marca de "ahora".
 * Es el elemento propio del diseño de TurnosApp (inicio, agenda, horarios).
 */

export type DayStripItem = {
  id: string;
  /** "HH:mm" en la zona horaria del negocio */
  start: string;
  end: string;
  label: string;
  color: string;
};

type DayStripProps = {
  items?: DayStripItem[];
  /** Hora de inicio y fin de la franja (enteras). */
  from?: number;
  to?: number;
  timeZone?: string;
  className?: string;
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutos desde medianoche, ahora, en la zona del negocio. */
function nowMinutes(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return h * 60 + m;
}

// Se re-renderiza una vez por minuto para mover la marca de "ahora".
function subscribeMinute(callback: () => void) {
  const id = setInterval(callback, 60_000);
  return () => clearInterval(id);
}

export function DayStrip({
  items = [],
  from = 8,
  to = 20,
  timeZone = DEFAULT_TIMEZONE,
  className,
}: DayStripProps) {
  // En el servidor no hay "ahora" (la página se prerenderiza): -1 = sin marca.
  const now = useSyncExternalStore(subscribeMinute, () => nowMinutes(timeZone), () => -1);

  const start = from * 60;
  const span = (to - from) * 60;
  const pct = (minutes: number) => ((minutes - start) / span) * 100;
  const nowPct = now >= start && now <= start + span ? pct(now) : null;

  const hours: number[] = [];
  for (let h = from; h <= to; h += 2) hours.push(h);

  return (
    <div className={cn("@container w-full", className)}>
      <div className="relative h-10 overflow-hidden rounded-lg border bg-inset">
        {/* Guías de cada hora */}
        {Array.from({ length: to - from - 1 }, (_, i) => (
          <span
            key={i}
            className="absolute inset-y-0 w-px bg-border"
            style={{ left: `${((i + 1) / (to - from)) * 100}%` }}
            aria-hidden="true"
          />
        ))}

        {items.map((item) => (
          <div
            key={item.id}
            className="absolute inset-y-1 overflow-hidden rounded-md px-1.5 py-1 text-[10.5px] font-medium leading-none whitespace-nowrap text-white"
            style={{
              left: `${pct(toMinutes(item.start))}%`,
              width: `${pct(toMinutes(item.end)) - pct(toMinutes(item.start))}%`,
              backgroundColor: item.color,
            }}
            title={`${item.start}–${item.end} · ${item.label}`}
          >
            {/* En franjas angostas (celular) solo se ven los bloques de color. */}
            <span className="@max-md:sr-only">{item.label}</span>
          </div>
        ))}

        {items.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-faint">
            Sin turnos para hoy
          </p>
        )}

        {nowPct !== null && (
          <span className="absolute -inset-y-px w-0.5 bg-now" style={{ left: `${nowPct}%` }} aria-hidden="true">
            <span className="absolute -top-1 -left-0.75 size-2 rounded-full bg-now" />
          </span>
        )}
      </div>
      <div className="relative mt-1.5 h-3 font-mono text-[10px] text-faint tabular" aria-hidden="true">
        {hours.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${((h - from) / (to - from)) * 100}%` }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  );
}
