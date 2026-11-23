"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE } from "@/lib/config";

/**
 * "La tira del día": el día de trabajo como una franja horizontal, con los
 * turnos como bloques del color de cada profesional y una marca de "ahora".
 * Es el elemento propio del diseño de TurnoPy (inicio, agenda, horarios).
 *
 * Con `openRanges`, las horas cerradas se ven rayadas y las abiertas lisas.
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
  /** Franjas en las que el negocio atiende ("HH:mm"). Si se omite, no se marca abierto/cerrado. */
  openRanges?: { start: string; end: string }[];
  /** Hora de inicio y fin de la franja (enteras). */
  from?: number;
  to?: number;
  timeZone?: string;
  /** "sm": compacta, sin marcas de hora (para apilar días). */
  size?: "default" | "sm";
  /** Mostrar la marca de "ahora" (por defecto, sí). */
  showNow?: boolean;
  /** Texto cuando no hay turnos ni franjas (vacío = sin texto). */
  emptyLabel?: string;
  /** Escribir el horario ("08–12") dentro de cada tramo abierto. */
  rangeLabels?: boolean;
  /** Mostrar las marcas de hora debajo (por defecto, en el tamaño normal). */
  hourScale?: boolean;
  className?: string;
};

/** "08:00" → "08" · "08:30" → "08:30" (etiqueta corta para dentro de la tira). */
function shortTime(hhmm: string) {
  return hhmm.endsWith(":00") ? hhmm.slice(0, 2) : hhmm;
}

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

/** Rayado diagonal para las horas cerradas. */
const CLOSED_PATTERN =
  "repeating-linear-gradient(-45deg, transparent 0 5px, var(--hatch) 5px 6px)";

export function DayStrip({
  items = [],
  openRanges,
  from = 8,
  to = 20,
  timeZone = DEFAULT_TIMEZONE,
  size = "default",
  showNow = true,
  emptyLabel = "Sin turnos para hoy",
  rangeLabels = false,
  hourScale,
  className,
}: DayStripProps) {
  // En el servidor no hay "ahora" (la página se prerenderiza): -1 = sin marca.
  const now = useSyncExternalStore(subscribeMinute, () => nowMinutes(timeZone), () => -1);

  const start = from * 60;
  const span = (to - from) * 60;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const pct = (minutes: number) => clamp(((minutes - start) / span) * 100);
  const nowPct = showNow && now >= start && now <= start + span ? pct(now) : null;
  const compact = size === "sm";

  const hours: number[] = [];
  for (let h = from; h <= to; h += 2) hours.push(h);

  return (
    <div className={cn("@container w-full", className)}>
      <div
        className={cn(
          "relative overflow-hidden border bg-inset",
          compact ? "h-6 rounded-md" : "h-10 rounded-lg",
        )}
        style={openRanges ? { backgroundImage: CLOSED_PATTERN } : undefined}
      >
        {/* Guías de cada hora (quedan debajo de los tramos abiertos) */}
        {!compact &&
          Array.from({ length: to - from - 1 }, (_, i) => (
            <span
              key={i}
              className="absolute inset-y-0 w-px bg-border"
              style={{ left: `${((i + 1) / (to - from)) * 100}%` }}
              aria-hidden="true"
            />
          ))}

        {/* Horas abiertas */}
        {openRanges?.map((r) => (
          <span
            key={`${r.start}-${r.end}`}
            // Ámbar oscuro sólido: tapa el rayado de "cerrado" para que el contraste sea claro.
            className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-x border-primary/45 bg-[color-mix(in_oklab,var(--primary)_20%,var(--inset))]"
            style={{ left: `${pct(toMinutes(r.start))}%`, width: `${pct(toMinutes(r.end)) - pct(toMinutes(r.start))}%` }}
            aria-hidden={!rangeLabels}
          >
            {rangeLabels && (
              <span className="truncate px-1 font-mono text-[11px] text-primary tabular">
                {shortTime(r.start)}–{shortTime(r.end)}
              </span>
            )}
          </span>
        ))}

        {items.map((item) => (
          <div
            key={item.id}
            className="absolute inset-y-1 overflow-hidden rounded-md px-1.5 py-1 text-[10.5px] leading-none font-medium whitespace-nowrap text-white"
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

        {items.length === 0 && !openRanges?.length && emptyLabel && (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-faint">{emptyLabel}</p>
        )}

        {nowPct !== null && (
          <span className="absolute -inset-y-px w-0.5 bg-now" style={{ left: `${nowPct}%` }} aria-hidden="true">
            {!compact && <span className="absolute -top-1 -left-0.75 size-2 rounded-full bg-now" />}
          </span>
        )}
      </div>

      {(hourScale ?? !compact) && (
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
      )}
    </div>
  );
}
