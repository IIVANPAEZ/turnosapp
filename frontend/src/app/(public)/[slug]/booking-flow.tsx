"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatPYG } from "@/lib/format";
import type { PublicService } from "@/lib/public/data";
import { bookAppointment, fetchPublicAvailability, type BookingResult } from "@/lib/public/actions";
import { buildIcs, downloadIcs } from "@/lib/public/ics";
import { addDays, MONTHS_LONG, MONTHS_SHORT, startOfWeek, WEEKDAYS_LONG, WEEKDAYS_SHORT, weekdayOf } from "@/lib/time/zone";
import { relativeDay, whatsAppLink } from "@/lib/whatsapp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BookingBusiness = {
  name: string;
  slug: string;
  timezone: string;
  whatsapp: string | null;
  place: string | null;
};

type BookingFlowProps = {
  business: BookingBusiness;
  services: PublicService[];
  /** "YYYY-MM-DD" de hoy en la zona del negocio */
  today: string;
  maxDays: number;
};

type Stage = "pick" | "details" | "done";
type Booked = Extract<BookingResult, { ok: true }> & { name: string };

/** Nombre y celular se recuerdan en este navegador para la próxima reserva. */
const STORAGE_KEY = "turnosapp:cliente";

const longDay = (d: string) =>
  `${WEEKDAYS_LONG[weekdayOf(d)]} ${Number(d.slice(8, 10))} de ${MONTHS_LONG[Number(d.slice(5, 7)) - 1]}`;

export function BookingFlow({ business, services, today, maxDays }: BookingFlowProps) {
  const [stage, setStage] = useState<Stage>("pick");
  const [serviceId, setServiceId] = useState<string | null>(services.length === 1 ? services[0].id : null);
  const service = services.find((s) => s.id === serviceId) ?? null;
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[]>>({});
  // Semanas ya cargadas (0 = esta semana). Semana elegida con las flechas (null = automática).
  const [loadedWeeks, setLoadedWeeks] = useState<Record<number, true>>({});
  const [chosenWeek, setChosenWeek] = useState<number | null>(null);
  const [loading, startLoading] = useTransition();
  // Semanas pidiéndose ahora, y "generación" de la búsqueda: si cambia (otro servicio,
  // reinicio), las respuestas viejas se ignoran.
  const inFlight = useRef(new Set<number>());
  const generation = useRef(0);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  // Semanas de lunes a domingo, desde la de hoy hasta el último día reservable.
  const firstMonday = startOfWeek(today);
  const lastAllowed = addDays(today, maxDays);
  const maxWeek = Math.floor((Date.parse(lastAllowed) - Date.parse(firstMonday)) / (7 * 86_400_000));
  const weekDays = (w: number) => Array.from({ length: 7 }, (_, i) => addDays(firstMonday, w * 7 + i));
  const weekHasSlots = (w: number) => weekDays(w).some((d) => (slotsByDay[d]?.length ?? 0) > 0);

  // Semana automática: la primera con lugar (mientras se van cargando, la última cargada).
  let autoWeek = 0;
  let searching = false;
  for (let w = 0; w <= maxWeek; w++) {
    autoWeek = w;
    if (!loadedWeeks[w]) {
      searching = true;
      autoWeek = Math.max(0, w - 1);
      break;
    }
    if (weekHasSlots(w)) break;
  }
  const week = chosenWeek ?? autoWeek;
  const days = weekDays(week);

  const goTo = (next: Stage, anchor?: string) => {
    setStage(next);
    // Después de pintar el paso nuevo: arriba de todo, o a la sección indicada.
    setTimeout(() => {
      const el = anchor ? document.getElementById(anchor) : null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  // Al cambiar de servicio se empieza de cero.
  const pickService = (id: string) => {
    if (id === serviceId) return;
    setServiceId(id);
    resetSlots();
    setChosenWeek(null);
    setDay(null);
    setTime(null);
    setSlotError(null);
  };

  // Vuelve a pedir los horarios (por ejemplo, si se ocupó uno mientras completaba los datos).
  function resetSlots() {
    setSlotsByDay({});
    setLoadedWeeks({});
    inFlight.current.clear();
    generation.current++;
  }

  // Carga la semana que se ve y la siguiente (para que pasar sea instantáneo); si todavía
  // se busca la primera semana con lugar, también la próxima sin cargar.
  useEffect(() => {
    if (!serviceId) return;
    const wanted = [week, week + 1];
    if (chosenWeek === null && searching) wanted.push(autoWeek + 1);
    const missing = wanted.filter((w) => w >= 0 && w <= maxWeek && !loadedWeeks[w] && !inFlight.current.has(w));
    if (!missing.length) return;
    const gen = generation.current;
    for (const w of missing) {
      inFlight.current.add(w);
      const from = weekDays(w)[0] < today ? today : weekDays(w)[0];
      const to = weekDays(w)[6] > lastAllowed ? lastAllowed : weekDays(w)[6];
      const count = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
      startLoading(async () => {
        const result = count > 0 ? await fetchPublicAvailability(business.slug, serviceId, from, count) : [];
        if (gen !== generation.current) return; // respuesta de una búsqueda vieja
        inFlight.current.delete(w);
        const next: Record<string, string[]> = {};
        for (let i = 0; i < count; i++) next[addDays(from, i)] = [];
        for (const sl of result) (next[sl.day] ??= []).push(sl.slot);
        setSlotsByDay((prev) => ({ ...prev, ...next }));
        setLoadedWeeks((prev) => ({ ...prev, [w]: true }));
      });
    }
    // weekDays depende de firstMonday (derivado de today).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, business.slug, today, lastAllowed, week, chosenWeek, searching, autoWeek, maxWeek, loadedWeeks]);

  // Elige solo el primer día con lugar (si todavía no se eligió ninguno).
  const firstAvailable = days.find((d) => (slotsByDay[d]?.length ?? 0) > 0) ?? null;
  const selectedDay = day ?? firstAvailable;
  const daySlots = selectedDay ? (slotsByDay[selectedDay] ?? []) : [];
  const morning = daySlots.filter((s) => s < "13:00");
  const afternoon = daySlots.filter((s) => s >= "13:00");
  const weekLoaded = !!loadedWeeks[week];
  const noSlotsThisWeek = weekLoaded && !firstAvailable && !(chosenWeek === null && searching);
  const ready = !!service && !!selectedDay && !!time;

  // El horario se ocupó mientras el cliente completaba sus datos: vuelve a elegir con horarios frescos.
  const onSlotLost = (message: string) => {
    setSlotError(message);
    setTime(null);
    resetSlots();
    goTo("pick", "paso-horario");
  };

  const restart = () => {
    setBooked(null);
    setTime(null);
    resetSlots();
    goTo("pick");
  };

  if (stage === "done" && booked && service && selectedDay && time) {
    return (
      <SuccessScreen
        business={business}
        booked={booked}
        service={service}
        date={selectedDay}
        time={time}
        today={today}
        onRestart={restart}
      />
    );
  }

  if (stage === "details" && service && selectedDay && time) {
    return (
      <DetailsStep
        business={business}
        service={service}
        date={selectedDay}
        time={time}
        today={today}
        onBack={() => goTo("pick")}
        onSlotLost={onSlotLost}
        onBooked={(b) => {
          setBooked(b);
          goTo("done");
        }}
      />
    );
  }

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
            <WeekPicker
              week={week}
              maxWeek={maxWeek}
              days={days}
              today={today}
              lastAllowed={lastAllowed}
              slotsByDay={slotsByDay}
              selectedDay={selectedDay}
              loading={loading && !weekLoaded}
              onWeek={(w) => {
                setChosenWeek(w);
                setDay(null);
                setTime(null);
              }}
              onDay={(d) => {
                setDay(d);
                setTime(null);
              }}
            />
            {noSlotsThisWeek && (
              <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                {week < maxWeek ? "No hay horarios libres esta semana." : `No quedan horarios libres en los próximos ${maxDays} días.`}
                {week < maxWeek && (
                  <button
                    type="button"
                    onClick={() => {
                      setChosenWeek(week + 1);
                      setDay(null);
                      setTime(null);
                    }}
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Ver la siguiente <ChevronRight className="size-4" />
                  </button>
                )}
              </p>
            )}
          </>
        )}
      </section>

      {/* 3. Horario */}
      <section id="paso-horario" className={cn("flex scroll-mt-6 flex-col gap-3", !selectedDay && "opacity-50")}>
        <StepTitle n={3} title="Elegí el horario" />
        {slotError && (
          <p role="alert" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
            <AlertCircle className="mt-0.5 size-4 shrink-0" /> {slotError}
          </p>
        )}
        {!service || !selectedDay ? (
          <p className="text-sm text-muted-foreground">
            {loading ? "Buscando horarios libres…" : "Elegí un servicio y un día."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
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
                        onClick={() => {
                          setTime(s);
                          setSlotError(null);
                        }}
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
            {loading && daySlots.length === 0 && (
              <p className="text-sm text-muted-foreground">Buscando horarios libres…</p>
            )}
          </div>
        )}
      </section>

      {/* Resumen (fijo abajo) */}
      {service && (
        <BottomBar
          title={service.name}
          subtitle={
            ready ? (
              <SummaryLine service={service} date={selectedDay!} time={time!} today={today} />
            ) : (
              "Elegí día y horario"
            )
          }
        >
          <button
            type="button"
            disabled={!ready}
            onClick={() => goTo("details")}
            className="h-11 shrink-0 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            Continuar
          </button>
        </BottomBar>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paso 4: tus datos
// ---------------------------------------------------------------------------

type Saved = { name: string; phone: string };

function readSaved(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Saved>) : {};
    return { name: typeof v.name === "string" ? v.name : "", phone: typeof v.phone === "string" ? v.phone : "" };
  } catch {
    return { name: "", phone: "" };
  }
}

function DetailsStep({
  business,
  service,
  date,
  time,
  today,
  onBack,
  onSlotLost,
  onBooked,
}: {
  business: BookingBusiness;
  service: PublicService;
  date: string;
  time: string;
  today: string;
  onBack: () => void;
  onSlotLost: (message: string) => void;
  onBooked: (b: Booked) => void;
}) {
  // Este paso solo se muestra en el navegador (después de elegir), así que se puede leer localStorage acá.
  const [saved] = useState(readSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (form: FormData) => {
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    setError(null);
    startTransition(async () => {
      const result = await bookAppointment({
        slug: business.slug,
        serviceId: service.id,
        date,
        time,
        name,
        phone,
        notes: String(form.get("notes") ?? ""),
        website: String(form.get("website") ?? ""),
      });
      if (!result.ok) {
        if (result.code === "slot") onSlotLost(result.message);
        else setError(result.message);
        return;
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, phone }));
      } catch {
        // Sin almacenamiento (modo privado): no pasa nada.
      }
      onBooked({ ...result, name });
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Cambiar servicio u horario
      </button>

      {/* Lo que eligió */}
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-primary-soft py-2 text-primary">
          <span className="text-[11px] uppercase">{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
          <span className="text-xl leading-tight font-semibold tabular">{Number(date.slice(8, 10))}</span>
          <span className="text-[11px]">{MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{service.name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {longDay(date)} · <span className="font-mono tabular">{time}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDuration(service.durationMinutes)} · {service.priceType === "from" && "desde "}
            {formatPYG(service.price)}
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <StepTitle n={4} title="Tus datos" />
        <form id="booking-form" action={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-name">Nombre y apellido</Label>
            <Input
              id="bk-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              defaultValue={saved.name}
              placeholder="Ej.: María González"
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-phone">Celular (WhatsApp)</Label>
            <Input
              id="bk-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              defaultValue={saved.phone}
              placeholder="0981 123 456"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              {business.name} te va a escribir a este número si necesita avisarte algo.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-notes">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea id="bk-notes" name="notes" maxLength={300} rows={3} placeholder="¿Algo que el negocio deba saber?" />
          </div>
          {/* Campo trampa para bots: invisible para las personas. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="bk-website">No completar</label>
            <input id="bk-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </form>
      </section>

      <BottomBar title={service.name} subtitle={<SummaryLine service={service} date={date} time={time} today={today} />}>
        <button
          type="submit"
          form="booking-form"
          disabled={pending}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Reservando…" : "Confirmar reserva"}
        </button>
      </BottomBar>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Listo
// ---------------------------------------------------------------------------

function SuccessScreen({
  business,
  booked,
  service,
  date,
  time,
  today,
  onRestart,
}: {
  business: BookingBusiness;
  booked: Booked;
  service: PublicService;
  date: string;
  time: string;
  today: string;
  onRestart: () => void;
}) {
  const confirmed = booked.status === "confirmed";
  const chat = whatsAppLink(
    business.whatsapp,
    `Hola, soy ${booked.name}. Acabo de reservar ${booked.serviceName} para ${relativeDay(date, today)} a las ${time} desde la página de reservas.`,
  );

  const addToCalendar = () => {
    const ics = buildIcs({
      uid: booked.appointmentId,
      date,
      time,
      durationMinutes: booked.durationMinutes,
      timeZone: business.timezone,
      title: `${booked.serviceName} · ${business.name}`,
      location: business.place,
      description: confirmed ? "Turno confirmado." : `Turno por confirmar: ${business.name} te va a avisar.`,
    });
    downloadIcs(`turno-${business.slug}-${date}.ics`, ics);
  };

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="size-7" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">¡Listo, tu turno está reservado!</h2>
        <p className="max-w-sm text-[15px] text-muted-foreground">
          {confirmed
            ? `Te esperamos en ${business.name}.`
            : `${business.name} te va a confirmar por WhatsApp. ¡Te esperamos!`}
        </p>
      </div>

      {/* El turno */}
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-4 p-4">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-primary-soft py-2 text-primary">
            <span className="text-[11px] uppercase">{WEEKDAYS_SHORT[weekdayOf(date)]}</span>
            <span className="text-xl leading-tight font-semibold tabular">{Number(date.slice(8, 10))}</span>
            <span className="text-[11px]">{MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{booked.serviceName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {longDay(date)} · <span className="font-mono tabular">{time}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDuration(booked.durationMinutes)} · {service.priceType === "from" && "desde "}
              {formatPYG(service.price)}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
              confirmed ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
            )}
          >
            {confirmed ? "Confirmado" : "Por confirmar"}
          </span>
        </div>
        {business.place && (
          <p className="flex items-center gap-1.5 border-t px-4 py-3 text-sm text-muted-foreground">
            <MapPin className="size-4 text-faint" /> {business.place}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={addToCalendar}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl sm:flex-1 border bg-card font-medium transition-colors hover:border-line-strong"
        >
          <CalendarPlus className="size-4" /> Agregar a mi calendario
        </button>
        {chat && (
          <a
            href={chat}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl sm:flex-1 border border-success/30 bg-success-soft font-medium text-success transition-colors hover:bg-success/20"
          >
            <MessageCircle className="size-4" /> Escribir al negocio
          </a>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Necesitás cambiar o cancelar? {chat ? "Escribile al negocio por WhatsApp." : "Comunicate con el negocio."}
      </p>

      <button
        type="button"
        onClick={onRestart}
        className="mx-auto text-sm text-faint transition-colors hover:text-muted-foreground"
      >
        Hacer otra reserva
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

function SummaryLine({ service, date, time, today }: { service: PublicService; date: string; time: string; today: string }) {
  return (
    <>
      {date === today ? "Hoy" : `${WEEKDAYS_SHORT[weekdayOf(date)]} ${Number(date.slice(8, 10))}`} ·{" "}
      <span className="font-mono tabular">{time}</span> · {service.priceType === "from" && "desde "}
      {formatPYG(service.price)}
    </>
  );
}

function BottomBar({ title, subtitle, children }: { title: string; subtitle: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-popover/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Una semana (lunes a domingo) con flechas para pasar a la siguiente. */
function WeekPicker({
  week,
  maxWeek,
  days,
  today,
  lastAllowed,
  slotsByDay,
  selectedDay,
  loading,
  onWeek,
  onDay,
}: {
  week: number;
  maxWeek: number;
  days: string[];
  today: string;
  lastAllowed: string;
  slotsByDay: Record<string, string[]>;
  selectedDay: string | null;
  loading: boolean;
  onWeek: (w: number) => void;
  onDay: (d: string) => void;
}) {
  const first = days[0];
  const last = days[6];
  const month = (d: string) => MONTHS_SHORT[Number(d.slice(5, 7)) - 1];
  const range =
    first.slice(5, 7) === last.slice(5, 7)
      ? `${Number(first.slice(8, 10))} – ${Number(last.slice(8, 10))} ${month(last)}`
      : `${Number(first.slice(8, 10))} ${month(first)} – ${Number(last.slice(8, 10))} ${month(last)}`;
  const title = week === 0 ? "Esta semana" : week === 1 ? "La semana que viene" : `Semana del ${Number(first.slice(8, 10))} ${month(first)}`;
  const arrow =
    "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <button type="button" className={arrow} disabled={week <= 0} onClick={() => onWeek(week - 1)} aria-label="Semana anterior">
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{range}</p>
        </div>
        <button type="button" className={arrow} disabled={week >= maxWeek} onClick={() => onWeek(week + 1)} aria-label="Semana siguiente">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((d) => {
          const outside = d < today || d > lastAllowed;
          const count = slotsByDay[d]?.length;
          const known = count !== undefined;
          const disabled = outside || !known || count === 0;
          const selected = d === selectedDay;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onDay(d)}
              aria-pressed={selected}
              aria-label={`${WEEKDAYS_LONG[weekdayOf(d)]} ${Number(d.slice(8, 10))}: ${
                outside ? "no disponible" : !known ? "cargando" : count ? `${count} horarios libres` : "sin lugar"
              }`}
              className={cn(
                "flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-0.5 py-2.5 transition-colors",
                selected
                  ? "border-primary/70 bg-primary-soft"
                  : disabled
                    ? "border-transparent bg-inset/60"
                    : "bg-card hover:border-line-strong",
              )}
            >
              <span className={cn("text-[11px]", selected ? "text-primary" : "text-muted-foreground")}>
                {d === today ? "Hoy" : WEEKDAYS_SHORT[weekdayOf(d)]}
              </span>
              <span className={cn("text-lg leading-tight font-semibold tabular", outside && "text-faint")}>
                {Number(d.slice(8, 10))}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] tabular",
                  outside || (known && !count) ? "text-faint" : "text-success",
                )}
                aria-hidden="true"
              >
                {outside ? "" : !known ? (loading ? "…" : "") : count ? count : "—"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-faint">El número es la cantidad de horarios libres.</p>
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
