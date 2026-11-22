"use client";

import { useState } from "react";
import { formatPYG, formatPYGCompact } from "@/lib/format";
import { MONTHS_SHORT, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time/zone";

const dayLabel = (ymd: string) =>
  `${WEEKDAYS_SHORT[weekdayOf(ymd)]} ${Number(ymd.slice(8, 10))} ${MONTHS_SHORT[Number(ymd.slice(5, 7)) - 1]}`;

/** Escala "linda": 0 · mitad · tope, con números redondos. */
function niceMax(max: number) {
  if (max <= 0) return 100_000;
  const exp = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= max) ?? 10;
  return step * exp;
}

/**
 * Cobrado por día: una sola serie (ámbar), columnas finas con punta redondeada,
 * líneas guía tenues y tooltip al pasar el mouse o tocar.
 */
export function DailyChart({ days, today }: { days: { date: string; total: number }[]; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...days.map((d) => d.total)));
  const every = days.length <= 16 ? 1 : 7;
  const best = days.reduce((b, d, i) => (d.total > (days[b]?.total ?? 0) ? i : b), 0);

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex h-48 gap-3">
        {/* Eje Y (líneas guía tenues, números redondos) */}
        <div className="flex w-[4.75rem] shrink-0 flex-col justify-between pb-6 text-right font-mono text-[11px] whitespace-nowrap text-faint tabular">
          <span>{formatPYGCompact(top)}</span>
          <span>{formatPYGCompact(top / 2)}</span>
          <span>₲ 0</span>
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-px bg-foreground/[0.07]" />
            ))}
          </div>
          <div
            className="absolute inset-x-0 top-0 bottom-0 flex items-stretch gap-0.5"
            role="img"
            aria-label={`Cobrado por día. Mejor día: ${dayLabel(days[best].date)}, ${formatPYG(days[best].total)}.`}
            onMouseLeave={() => setActive(null)}
          >
            {days.map((d, i) => (
              <button
                key={d.date}
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end outline-none"
              >
                <span className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center">
                  <span
                    className={
                      "w-full max-w-6 rounded-t-[4px] transition-opacity " +
                      (d.total > 0 ? "bg-primary" : "") +
                      (active !== null && active !== i ? " opacity-50" : "")
                    }
                    style={{ height: d.total > 0 ? `max(2px, ${(d.total / top) * 100}%)` : 0 }}
                  />
                </span>
                <span className={"h-6 pt-1.5 font-mono text-[10.5px] tabular " + (d.date === today ? "text-foreground" : "text-faint")}>
                  {i % every === 0 || d.date === today ? Number(d.date.slice(8, 10)) : ""}
                </span>
                {active === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-left text-xs whitespace-nowrap shadow-lg">
                    <span className="block text-muted-foreground">{dayLabel(d.date)}</span>
                    <span className="font-mono font-medium text-foreground tabular">{formatPYG(d.total)}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Vista de tabla para lectores de pantalla */}
      <table className="sr-only">
        <caption>Cobrado por día</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayLabel(d.date)}</th>
              <td>{formatPYG(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
