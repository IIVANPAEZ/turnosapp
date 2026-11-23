"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, CircleAlert, Coffee, CopyPlus, Loader2, MoreHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DayStrip } from "@/components/day-strip";
import { TimeSelect } from "@/components/schedule/time-select";
import { cn } from "@/lib/utils";
import { saveWorkingHours } from "@/lib/schedule/actions";
import {
  TIME_OPTIONS,
  WEEK_TEMPLATES,
  WEEKDAYS,
  type TimeRange,
  type WeekHours,
  type Weekday,
} from "@/lib/schedule/constants";
import {
  dayProblems,
  dayTotal,
  insertPause,
  suggestPause,
  toMinutes,
  visibleHours,
  weekHasProblems,
  weeklyTotal,
} from "@/lib/schedule/week";

type WeekEditorProps = {
  memberId: string;
  initialWeek: WeekHours;
  canEdit: boolean;
  timeZone: string;
  today: Weekday;
};

const toTime = (minutes: number) =>
  TIME_OPTIONS[Math.min(TIME_OPTIONS.length - 1, Math.max(0, Math.round(minutes / 15)))];

export function WeekEditor({ memberId, initialWeek, canEdit, timeZone, today }: WeekEditorProps) {
  const [saved, setSaved] = useState(initialWeek);
  const [week, setWeek] = useState(initialWeek);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = useMemo(() => JSON.stringify(week) !== JSON.stringify(saved), [week, saved]);
  const hasProblems = weekHasProblems(week);
  const isEmpty = WEEKDAYS.every((d) => week[d.value].length === 0);
  const { from, to } = visibleHours(week);

  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 3000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const setDay = (day: Weekday, ranges: TimeRange[]) => {
    setError(null);
    setWeek((w) => ({ ...w, [day]: ranges }));
  };

  /** Al abrir un día, copia el horario del día abierto más cercano (o 08–18). */
  const openDay = (day: Weekday) => {
    const neighbor = [...WEEKDAYS].reverse().find((d) => d.value < day && week[d.value].length > 0)
      ?? WEEKDAYS.find((d) => week[d.value].length > 0);
    setDay(day, neighbor ? week[neighbor.value].map((r) => ({ ...r })) : [{ start: "08:00", end: "18:00" }]);
  };

  // Día en el que está abierto el recuadro "Nueva pausa" (null = ninguno).
  const [pauseDay, setPauseDay] = useState<Weekday | null>(null);

  const copyTo = (day: Weekday, targets: Weekday[]) => {
    setError(null);
    setWeek((w) => {
      const next = { ...w };
      for (const t of targets) next[t] = w[day].map((r) => ({ ...r }));
      return next;
    });
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveWorkingHours(memberId, week);
      if (result.ok) {
        setSaved(week);
        setSavedAt(Date.now());
      } else {
        setError(result.error);
      }
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Vista semanal con "la tira del día" */}
      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-medium">Tu semana de un vistazo</h3>
          <span className="font-mono text-xs text-muted-foreground tabular">
            {isEmpty ? "Sin horario" : `${weeklyTotal(week)} por semana`}
          </span>
        </div>
        <div className="grid grid-cols-[2.25rem_1fr_3.25rem] items-center gap-x-3 gap-y-2">
          {WEEKDAYS.map((d) => {
            const ranges = week[d.value];
            return (
              <div key={d.value} className="contents">
                <span className={cn("text-sm", d.value === today ? "font-medium text-primary" : "text-muted-foreground")}>
                  {d.short}
                </span>
                <DayStrip
                  openRanges={ranges}
                  rangeLabels
                  hourScale={false}
                  from={from}
                  to={to}
                  timeZone={timeZone}
                  showNow={d.value === today}
                  emptyLabel="Cerrado"
                />
                <span className="text-right font-mono text-xs text-muted-foreground tabular">
                  {ranges.length ? dayTotal(ranges) : "—"}
                </span>
              </div>
            );
          })}
          <span />
          <HourScale from={from} to={to} />
          <span />
        </div>
      </section>

      {/* Plantillas cuando todavía no hay horario */}
      {canEdit && isEmpty && (
        <section className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-5">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">Empezá con una plantilla</span>
            <span className="text-muted-foreground">· después la ajustás</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {WEEK_TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setWeek(structuredClone(t.week))}
                className="rounded-xl border bg-inset p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-primary-soft"
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Editor día por día */}
      <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
        <ul className="divide-y">
          {WEEKDAYS.map((d) => {
            const ranges = week[d.value];
            const open = ranges.length > 0;
            const problems = dayProblems(ranges);
            return (
              <li key={d.value} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-6 sm:px-5">
                <div className="flex items-center justify-between gap-3 sm:w-40 sm:pt-1.5">
                  <label className="flex cursor-pointer items-center gap-3">
                    <Switch
                      checked={open}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => (checked ? openDay(d.value) : setDay(d.value, []))}
                      aria-label={`${d.label}: ${open ? "abierto" : "cerrado"}`}
                    />
                    <span className={cn("text-sm font-medium", !open && "text-muted-foreground")}>{d.label}</span>
                  </label>
                  {d.value === today && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary sm:hidden">Hoy</span>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {!open ? (
                    <p className="text-sm text-faint sm:pt-1.5">Cerrado</p>
                  ) : (
                    ranges.map((r, i) => {
                      const next = ranges[i + 1];
                      // Entre dos horarios válidos y en orden, se muestra la pausa.
                      const pause =
                        next && !problems[i] && !problems[i + 1] && toMinutes(r.end) < toMinutes(next.start)
                          ? `${r.end} – ${next.start}`
                          : null;
                      return (
                        <div key={i} className="flex flex-col gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <TimeSelect
                                value={r.start}
                                disabled={!canEdit}
                                invalid={!!problems[i]}
                                aria-label={`${d.label}, horario ${i + 1}, abre a las`}
                                onChange={(v) => setDay(d.value, ranges.map((x, j) => (j === i ? { ...x, start: v } : x)))}
                                className="w-24"
                              />
                              <span className="text-faint">–</span>
                              <TimeSelect
                                value={r.end}
                                disabled={!canEdit}
                                invalid={!!problems[i]}
                                aria-label={`${d.label}, horario ${i + 1}, cierra a las`}
                                onChange={(v) => setDay(d.value, ranges.map((x, j) => (j === i ? { ...x, end: v } : x)))}
                                className="w-24"
                              />
                              {canEdit && ranges.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Quitar horario ${i + 1} del ${d.label}`}
                                  onClick={() => setDay(d.value, ranges.filter((_, j) => j !== i))}
                                >
                                  <X />
                                </Button>
                              )}
                            </div>
                            {problems[i] && <p className="text-xs text-destructive">{problems[i]}</p>}
                          </div>
                          {pause && (
                            <p className="flex items-center gap-2 pl-1 text-xs text-faint">
                              <Coffee className="size-3.5" />
                              Pausa · <span className="font-mono tabular">{pause}</span>
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}

                  {pauseDay === d.value && open && (
                    <PauseEditor
                      dayLabel={d.label}
                      ranges={ranges}
                      onCancel={() => setPauseDay(null)}
                      onApply={(next) => {
                        setDay(d.value, next);
                        setPauseDay(null);
                      }}
                    />
                  )}
                </div>

                {canEdit && open && (
                  <div className="flex items-center gap-1 sm:pt-0.5">
                    <Button
                      type="button"
                      variant={pauseDay === d.value ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setPauseDay(pauseDay === d.value ? null : d.value)}
                      disabled={ranges.length >= 6 || !suggestPause(ranges) || hasProblems}
                      title={!suggestPause(ranges) ? "El horario es muy corto para agregar una pausa" : undefined}
                    >
                      <Coffee /> Agregar pausa
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Copiar horario del ${d.label}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => copyTo(d.value, [1, 2, 3, 4, 5])}>
                          <CopyPlus /> Copiar a días hábiles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyTo(d.value, [1, 2, 3, 4, 5, 6, 7])}>
                          <CopyPlus /> Copiar a todos los días
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Barra flotante de guardado */}
      {canEdit && (dirty || savedAt || error) && (
        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border bg-popover/95 p-3 shadow-[0_16px_40px_-16px_var(--shadow-strong)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pl-4">
          <p className={cn("flex items-center gap-2 text-sm", error || hasProblems ? "text-destructive" : "text-muted-foreground")}>
            {error ? (
              <>
                <CircleAlert className="size-4" /> {error}
              </>
            ) : hasProblems ? (
              <>
                <CircleAlert className="size-4" /> Revisá los horarios marcados en rojo
              </>
            ) : dirty ? (
              <>
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> Tenés cambios sin guardar
              </>
            ) : (
              <span className="flex items-center gap-2 text-success">
                <Check className="size-4" /> Horario guardado
              </span>
            )}
          </p>
          {dirty && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setWeek(saved);
                  setError(null);
                }}
                className="flex-1 sm:flex-none"
              >
                Descartar
              </Button>
              <Button type="button" onClick={save} disabled={pending || hasProblems} className="flex-1 sm:flex-none">
                {pending && <Loader2 className="animate-spin" />}
                Guardar horario
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PAUSE_PRESETS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 h" },
  { minutes: 90, label: "1 h 30" },
  { minutes: 120, label: "2 h" },
] as const;

/** Recuadro para elegir la pausa: desde qué hora y cuánto dura. */
function PauseEditor({
  dayLabel,
  ranges,
  onApply,
  onCancel,
}: {
  dayLabel: string;
  ranges: TimeRange[];
  onApply: (ranges: TimeRange[]) => void;
  onCancel: () => void;
}) {
  const suggestion = suggestPause(ranges) ?? { start: "12:00", minutes: 60 };
  const [start, setStart] = useState(suggestion.start);
  const [end, setEnd] = useState(toTime(toMinutes(suggestion.start) + suggestion.minutes));
  const [error, setError] = useState<string | null>(null);
  const minutes = toMinutes(end) - toMinutes(start);

  const apply = () => {
    const result = insertPause(ranges, start, end);
    if ("error" in result) return setError(result.error);
    onApply(result.ranges);
  };

  return (
    <div className="mt-1 flex flex-col gap-3 rounded-xl border border-primary/30 bg-inset p-3.5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Coffee className="size-4 text-primary" /> Nueva pausa del {dayLabel.toLowerCase()}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">De</span>
        <TimeSelect
          value={start}
          aria-label="La pausa empieza a las"
          onChange={(v) => {
            setError(null);
            // Mantiene la duración elegida al mover el inicio.
            setStart(v);
            setEnd(toTime(toMinutes(v) + Math.max(minutes, 15)));
          }}
          className="w-24"
        />
        <span className="text-muted-foreground">a</span>
        <TimeSelect
          value={end}
          aria-label="La pausa termina a las"
          onChange={(v) => {
            setError(null);
            setEnd(v);
          }}
          className="w-24"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Duración de la pausa">
        {PAUSE_PRESETS.map((p) => (
          <button
            key={p.minutes}
            type="button"
            role="radio"
            aria-checked={minutes === p.minutes}
            onClick={() => {
              setError(null);
              setEnd(toTime(toMinutes(start) + p.minutes));
            }}
            className={cn(
              "h-8 rounded-lg border px-3 font-mono text-xs transition-colors tabular",
              minutes === p.minutes
                ? "border-primary/70 bg-primary-soft text-primary"
                : "bg-card text-muted-foreground hover:border-line-strong hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={apply}>
          Agregar pausa
        </Button>
      </div>
    </div>
  );
}

/** Marcas de hora debajo de la vista semanal. */
function HourScale({ from, to }: { from: number; to: number }) {
  const hours: number[] = [];
  for (let h = from; h <= to; h += 2) hours.push(h);
  return (
    <div className="relative mt-1 h-3 font-mono text-[10px] text-faint tabular" aria-hidden="true">
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
  );
}
