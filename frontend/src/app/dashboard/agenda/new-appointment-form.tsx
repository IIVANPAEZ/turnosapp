"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarDays, Check, CircleAlert, Loader2, Search, TriangleAlert, UserPlus, X } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { DurationPicker } from "@/components/services/duration-picker";
import { TimeSelect } from "@/components/schedule/time-select";
import { cn } from "@/lib/utils";
import { formatDuration, formatPYG } from "@/lib/format";
import {
  createAppointment,
  getDayAvailability,
  searchClients,
  type ClientOption,
  type DayAvailability,
} from "@/lib/agenda/actions";
import { checkTime, freeSlots } from "@/lib/agenda/slots";
import { longDayLabel, WEEKDAYS_LONG, weekdayOf } from "@/lib/time/zone";

export type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  priceType: "fixed" | "from";
};

type NewAppointmentFormProps = {
  services: ServiceOption[];
  /** Día y hora precargados (ej. al tocar una celda de la agenda). */
  initialDate: string;
  initialTime?: string;
  today: string;
  /** Turno creado (con la fecha final, por si se cambió en el formulario). */
  onDone: (id: string, message: string, date: string) => void;
  onCancel: () => void;
};

type ClientChoice = { mode: "existing"; client: ClientOption } | { mode: "new"; name: string; phone: string };

export function NewAppointmentForm({ services, initialDate, initialTime, today, onDone, onCancel }: NewAppointmentFormProps) {
  const [client, setClient] = useState<ClientChoice | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(services.length === 1 ? services[0].id : null);
  const service = services.find((s) => s.id === serviceId) ?? null;
  const [duration, setDuration] = useState<number>(service?.durationMinutes ?? 60);
  const [adjustDuration, setAdjustDuration] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState<string | null>(initialTime ?? null);
  const [manualTime, setManualTime] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [loadingDay, startLoadingDay] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [existing, setExisting] = useState<ClientOption | null>(null);
  const [dateOpen, setDateOpen] = useState(false);

  // Disponibilidad del día elegido.
  useEffect(() => {
    let alive = true;
    startLoadingDay(async () => {
      const result = await getDayAvailability(date);
      if (alive) setAvailability(result);
    });
    return () => {
      alive = false;
    };
  }, [date]);

  const dayName = WEEKDAYS_LONG[weekdayOf(date)].toLowerCase();
  const slots = useMemo(
    () => (availability && availability.date === date ? freeSlots(availability, duration) : []),
    [availability, date, duration],
  );
  const check = availability && time ? checkTime(availability, time, duration, dayName) : null;
  const morning = slots.filter((s) => s < "13:00");
  const afternoon = slots.filter((s) => s >= "13:00");

  const canSave =
    !!client &&
    (client.mode === "existing" || client.name.trim().length >= 2) &&
    !!service &&
    !!time &&
    !check?.clash;

  const pickService = (s: ServiceOption) => {
    setServiceId(s.id);
    setDuration(s.durationMinutes);
    setAdjustDuration(false);
    setError(null);
  };

  const submit = () =>
    startSaving(async () => {
      if (!client || !service || !time) return;
      setError(null);
      setExisting(null);
      const result = await createAppointment({
        client: client.mode === "existing" ? { id: client.client.id } : { name: client.name, phone: client.phone },
        serviceId: service.id,
        date,
        time,
        durationMinutes: duration,
        notes,
        status,
      });
      if (result.ok) return onDone(result.id, result.message, date);
      // Si el cliente nuevo ya se guardó, de ahora en más lo usamos como existente.
      if (result.createdClient) setClient({ mode: "existing", client: result.createdClient });
      if (result.existingClient) setExisting(result.existingClient);
      setError({ text: result.error, field: result.field });
      // Refresca la disponibilidad: puede que otro turno se haya cargado mientras tanto.
      if (result.field === "time") setAvailability(await getDayAvailability(date));
    });

  const [y, m, d] = date.split("-").map(Number);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5">
        {/* 1. Cliente */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Cliente</h3>
          <ClientPicker
            value={client}
            onChange={(c) => {
              setClient(c);
              setExisting(null);
              if (error?.field === "client" || error?.field === "phone") setError(null);
            }}
            phoneError={error?.field === "phone" ? error.text : null}
          />
          {existing && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm">
              <span>
                ¿Es <strong>{existing.name}</strong>
                {existing.phone && <span className="text-muted-foreground"> · {existing.phone}</span>}?
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setClient({ mode: "existing", client: existing });
                  setExisting(null);
                  setError(null);
                }}
              >
                Usar este cliente
              </Button>
            </div>
          )}
        </section>

        {/* 2. Servicio */}
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Servicio</h3>
          {services.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No tenés servicios activos. Cargalos en Servicios para poder dar turnos.
            </p>
          ) : (
            <div className="grid gap-1.5" role="radiogroup" aria-label="Servicio">
              {services.map((s) => {
                const selected = s.id === serviceId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => pickService(s)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selected ? "border-primary/70 bg-primary-soft" : "bg-inset hover:border-line-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-line-strong",
                      )}
                    >
                      {selected && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular">{formatDuration(s.durationMinutes)}</span>
                    <span className="text-right font-mono text-xs whitespace-nowrap text-secondary-foreground tabular">
                      {s.priceType === "from" && "desde "}
                      {formatPYG(s.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {service && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Duración: <span className="font-mono text-foreground">{formatDuration(duration)}</span>
                {duration !== service.durationMinutes && " (ajustada)"} ·{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => setAdjustDuration((v) => !v)}>
                  {adjustDuration ? "Listo" : "Ajustar"}
                </button>
              </p>
              {adjustDuration && <DurationPicker value={duration} onChange={setDuration} />}
            </div>
          )}
        </section>

        {/* 3. Día y hora */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Día y hora</h3>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border bg-inset px-3 py-1.5 text-sm transition-colors hover:border-line-strong"
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
                    setDate(
                      `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`,
                    );
                    if (!manualTime) setTime(null);
                    setDateOpen(false);
                  }}
                  className="bg-transparent [--cell-size:--spacing(9)]"
                />
              </PopoverContent>
            </Popover>
          </div>

          {!service ? (
            <p className="text-sm text-faint">Elegí un servicio para ver los horarios libres.</p>
          ) : loadingDay && !availability ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Buscando horarios libres…
            </p>
          ) : (
            <>
              {slots.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {[
                    ["Mañana", morning],
                    ["Tarde", afternoon],
                  ].map(([label, list]) =>
                    (list as string[]).length ? (
                      <div key={label as string} className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">{label as string}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(list as string[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setTime(s);
                                setManualTime(false);
                                if (error?.field === "time") setError(null);
                              }}
                              className={cn(
                                "h-8 rounded-lg border px-2.5 font-mono text-[13px] transition-colors tabular",
                                time === s
                                  ? "border-primary/70 bg-primary-soft text-primary"
                                  : "bg-inset text-muted-foreground hover:border-line-strong hover:text-foreground",
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
              ) : (
                <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                  {availability?.isPast
                    ? "Es un día que ya pasó."
                    : availability && !availability.hours.length
                      ? `El ${dayName} no atendés según tu horario.`
                      : "No quedan horarios libres para este servicio ese día."}{" "}
                  Podés elegir otra hora a mano.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {manualTime || (time && !slots.includes(time)) ? (
                  <>
                    <span className="text-muted-foreground">Hora:</span>
                    <TimeSelect value={time ?? "09:00"} onChange={setTime} aria-label="Hora del turno" className="w-28" />
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setManualTime(true);
                      setTime((t) => t ?? slots[0] ?? "09:00");
                    }}
                  >
                    Elegir otra hora
                  </button>
                )}
              </div>

              {check?.clash && (
                <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> Se pisa con {check.clash}.
                </p>
              )}
              {!check?.clash && check && check.warnings.length > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                  <div className="flex flex-col gap-0.5">
                    {check.warnings.map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                    <span className="text-xs text-muted-foreground">Igual lo podés cargar.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* 4. Estado y nota */}
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-2 rounded-lg border bg-inset p-0.5 text-sm" role="radiogroup" aria-label="Estado">
            {(
              [
                ["confirmed", "Confirmado"],
                ["pending", "Por confirmar"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={status === value}
                onClick={() => setStatus(value)}
                className={cn(
                  "rounded-md px-2 py-1.5 transition-colors",
                  status === value ? "bg-raised font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Field>
            <FieldLabel htmlFor="appointment-notes">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </FieldLabel>
            <Textarea
              id="appointment-notes"
              rows={2}
              maxLength={300}
              placeholder="Ej.: Viene con su hija"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </section>

        {error && error.field !== "phone" && (
          <p className="flex items-start gap-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error.text}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t px-5 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button type="button" onClick={submit} disabled={saving || !canSave} className="flex-1 sm:ml-auto sm:flex-none">
          {saving && <Loader2 className="animate-spin" />}
          {check && check.warnings.length > 0 && !check.clash ? "Cargar igual" : "Cargar turno"}
        </Button>
      </div>
    </div>
  );
}

/** Buscar un cliente existente o cargar uno nuevo. */
function ClientPicker({
  value,
  onChange,
  phoneError,
}: {
  value: ClientChoice | null;
  onChange: (c: ClientChoice | null) => void;
  phoneError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const lastQuery = useRef(0);

  // Búsqueda 250 ms después de la última tecla.
  useEffect(() => {
    const id = ++lastQuery.current;
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      const found = await searchClients(query);
      if (id === lastQuery.current) {
        setResults(found);
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  if (value?.mode === "existing") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary-soft px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{value.client.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{value.client.phone ?? "Sin celular"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  if (value?.mode === "new") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border bg-inset p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="size-4 text-primary" /> Cliente nuevo
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Volver a buscar" onClick={() => onChange(null)}>
            <X />
          </Button>
        </div>
        <Field>
          <FieldLabel htmlFor="new-client-name">Nombre y apellido</FieldLabel>
          <Input
            id="new-client-name"
            autoComplete="off"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Ej.: Ana Benítez"
          />
        </Field>
        <Field data-invalid={!!phoneError}>
          <FieldLabel htmlFor="new-client-phone">
            Celular <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input
            id="new-client-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            aria-invalid={!!phoneError}
            value={value.phone}
            onChange={(e) => onChange({ ...value, phone: e.target.value })}
            placeholder="0981 123 456"
          />
          {phoneError ? (
            <p className="text-sm text-destructive">{phoneError}</p>
          ) : (
            !value.phone.trim() && <FieldDescription>Sin celular no vas a poder escribirle por WhatsApp.</FieldDescription>
          )}
        </Field>
      </div>
    );
  }

  const digitsOnly = /^[\d\s+()-]+$/.test(query.trim());
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
        <Input
          autoFocus
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o celular"
          className="pl-9"
          aria-label="Buscar cliente"
        />
        {searching && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-faint" />}
      </div>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-lg border bg-inset">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onChange({ mode: "existing", client: c })}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-raised"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.phone ?? "Sin celular"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground">No encontramos clientes con “{query.trim()}”.</p>
      )}
      <button
        type="button"
        onClick={() =>
          onChange({
            mode: "new",
            name: digitsOnly ? "" : query.trim(),
            phone: digitsOnly ? query.trim() : "",
          })
        }
        className="flex items-center gap-2 self-start rounded-lg px-1 py-1 text-sm text-primary hover:underline"
      >
        <UserPlus className="size-4" />
        {query.trim().length >= 2 && !digitsOnly ? `Nuevo cliente: “${query.trim()}”` : "Nuevo cliente"}
      </button>
    </div>
  );
}
