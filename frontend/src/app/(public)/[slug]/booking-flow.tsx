"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, ChevronRight, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatPYG } from "@/lib/format";
import type { PublicService } from "@/lib/public/data";
import { fetchPublicAvailability } from "@/lib/public/actions";
import { addDays, MONTHS_SHORT, WEEKDAYS_LONG, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time/zone";

type BookingFlowProps = {
  slug: string;
  services: PublicService[];
  /** "YYYY-MM-DD" de hoy en la zona del negocio */
  today: string;
  maxDays: number;
};

/** Días que se cargan por tanda. */
const BATCH = 14;

export function BookingFlow({ slug, services, today, maxDays }: BookingFlowProps) {
  const [serviceId, setServiceId] = useState<string | null>(services.length === 1 ? services[0].id : null);
  const service = services.find((s) => s.id === serviceId) ?? null;
  // Cantidad de días mostrados (crece con "Más días").
  const [shownDays, setShownDays] = useState(BATCH);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[]>>({});
  const [loadedUntil, setLoadedUntil] = useState(0);
  const [loading, startLoading] = useTransition();
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const daysRef = useRef<HTMLDivElement>(null);

  const lastDay = Math.min(shownDays, maxDays + 1);
  const days = useMemo(() => Array.from({ length: lastDay }, (_, i) => addDays(today, i)), [today, lastDay]);

  // Al cambiar de servicio se empieza de cero.
  const pickService = (id: string) => {
    if (id === serviceId) return;
    setServiceId(id);
    setSlotsByDay({});
    setLoadedUntil(0);
    setShownDays(BATCH);
    setDay(null);
    setTime(null);
  };

  // Carga los horarios de los días que faltan.
  useEffect(() => {
    if (!serviceId || loadedUntil >= lastDay) return;
    const from = addDays(today, loadedUntil);
    const count = lastDay - loadedUntil;
    let alive = true;
    startLoading(async () => {
      const result = await fetchPublicAvailability(slug, serviceId, from, count);
      if (!alive) return;
      const next: Record<string, string[]> = {};
      for (let i = 0; i < count; i++) next[addDays(from, i)] = [];
      for (const s of result) (next[s.day] ??= []).push(s.slot);
      setSlotsByDay((prev) => ({ ...prev, ...next }));
      setLoadedUntil(lastDay);
    });
    return () => {
      alive = false;
    };
  }, [serviceId, slug, today, loadedUntil, lastDay]);

  // Elige solo el primer día con lugar (si todavía no se eligió ninguno).
  const firstAvailable = days.find((d) => (slotsByDay[d]?.length ?? 0) > 0) ?? null;
  const selectedDay = day ?? firstAvailable;
  const daySlots = selectedDay ? (slotsByDay[selectedDay] ?? []) : [];
  const morning = daySlots.filter((s) => s < "13:00");
  const afternoon = daySlots.filter((s) => s >= "13:00");
  const noSlotsLoaded = loadedUntil > 0 && !firstAvailable;

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Servicio */}
      <section className="flex flex-col gap-3">
        <StepTitle n={1} title="Elegí el servicio" />
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Servicio">
          {services.map((s) => {
            const selected = s.id === serviceId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pickService(s.id)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
                  selected ? "border-primary/70 bg-primary-soft" : "bg-card hover:border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-primary bg-primary text-primary-foreground" : "border-line-strong",
                  )}
                >
                  {selected && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.name}</span>
                  {s.description && <span className="mt-0.5 block text-sm text-muted-foreground">{s.description}</span>}
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" /> {formatDuration(s.durationMinutes)}
                  </span>
                </span>
                <span className="shrink-0 text-right font-mono text-sm tabular">
                  {s.priceType === "from" && <span className="block text-[11px] text-muted-foreground">desde</span>}
                  {formatPYG(s.price)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Día */}
      <section className={cn("flex flex-col gap-3", !service && "opacity-50")}>
        <StepTitle n={2} title="Elegí el día" />
        {!service ? (
          <p className="text-sm text-muted-foreground">Primero elegí un servicio.</p>
        ) : (
          <>
            <div ref={daysRef} className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0">
              {days.map((d) => {
                const count = slotsByDay[d]?.length;
                const known = count !== undefined;
                const disabled = known && count === 0;
                const selected = d === selectedDay;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled || !known}
                    onClick={() => {
                      setDay(d);
                      setTime(null);
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors",
                      selected
                        ? "border-primary/70 bg-primary-soft"
                        : disabled
                          ? "bg-inset opacity-50"
                          : "bg-card hover:border-line-strong",
                    )}
                  >
                    <span className={cn("text-xs", selected ? "text-primary" : "text-muted-foreground")}>
                      {d === today ? "Hoy" : d === addDays(today, 1) ? "Mañana" : WEEKDAYS_SHORT[weekdayOf(d)]}
                    </span>
                    <span className="text-xl leading-tight font-semibold tabular">{Number(d.slice(8, 10))}</span>
                    <span className="text-[11px] text-muted-foreground">{MONTHS_SHORT[Number(d.slice(5, 7)) - 1]}</span>
                    <span className={cn("mt-0.5 text-[10.5px]", disabled ? "text-faint" : "text-success")}>
                      {!known ? "…" : disabled ? "Sin lugar" : `${count} libres`}
                    </span>
                  </button>
                );
              })}
              {lastDay <= maxDays && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShownDays((n) => n + BATCH)}
                  className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                  Más días
                </button>
              )}
            </div>
            {noSlotsLoaded && !loading && (
              <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                No quedan horarios libres en estos días. Probá con “Más días”.
              </p>
            )}
          </>
        )}
      </section>

      {/* 3. Horario */}
      <section className={cn("flex flex-col gap-3", !selectedDay && "opacity-50")}>
        <StepTitle n={3} title="Elegí el horario" />
        {!service || !selectedDay ? (
          <p className="text-sm text-muted-foreground">
            {loading ? "Buscando horarios libres…" : "Elegí un servicio y un día."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {WEEKDAYS_LONG[weekdayOf(selectedDay)]} {Number(selectedDay.slice(8, 10))} de{" "}
              {MONTHS_SHORT[Number(selectedDay.slice(5, 7)) - 1]}
            </p>
            {[
              ["Mañana", morning],
              ["Tarde", afternoon],
            ].map(([label, list]) =>
              (list as string[]).length ? (
                <div key={label as string} className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">{label as string}</span>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {(list as string[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTime(s)}
                        aria-pressed={time === s}
                        className={cn(
                          "h-11 rounded-xl border font-mono text-[15px] transition-colors tabular",
                          time === s
                            ? "border-primary bg-primary font-semibold text-primary-foreground"
                            : "bg-card hover:border-line-strong",
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </section>

      {/* Resumen (fijo abajo) */}
      {service && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-popover/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{service.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedDay && time ? (
                  <>
                    {selectedDay === today ? "Hoy" : `${WEEKDAYS_SHORT[weekdayOf(selectedDay)]} ${Number(selectedDay.slice(8, 10))}`}{" "}
                    · <span className="font-mono tabular">{time}</span> · {service.priceType === "from" && "desde "}
                    {formatPYG(service.price)}
                  </>
                ) : (
                  "Elegí día y horario"
                )}
              </p>
            </div>
            {/* Etapa 3: tus datos y confirmar la reserva. */}
            <button
              type="button"
              disabled
              title="El paso de reservar llega en la próxima etapa"
              className="h-11 shrink-0 rounded-xl bg-primary px-5 font-semibold text-primary-foreground opacity-50"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 font-medium">
      <span className="flex size-6 items-center justify-center rounded-full bg-raised font-mono text-xs text-muted-foreground">
        {n}
      </span>
      {title}
    </h2>
  );
}
