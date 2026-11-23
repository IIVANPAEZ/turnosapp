"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarOff, Check, CircleAlert, Clock, Flag, Loader2, Plus, Trash2 } from "lucide-react";
import { es } from "react-day-picker/locale";
import type { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TimeSelect } from "@/components/schedule/time-select";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { addTimeOff, deleteTimeOff, type ScheduleActionResult } from "@/lib/schedule/actions";
import type { TimeOffItem } from "@/lib/schedule/data";
import type { Holiday } from "@/lib/schedule/holidays";

type TimeOffPanelProps = {
  items: TimeOffItem[];
  holidays: Holiday[];
  canManage: boolean;
  /** "YYYY-MM-DD" de hoy en la zona del negocio */
  today: string;
};

type Notice = { kind: "ok" | "error"; text: string } | null;

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "2027-03-01" → "lun 1 mar" (+ año si no es el actual). Sin depender de la zona del navegador. */
function holidayLabel(ymd: string, currentYear: string) {
  const d = new Date(`${ymd}T12:00:00Z`);
  const year = ymd.slice(0, 4) !== currentYear ? ` ${ymd.slice(0, 4)}` : "";
  return `${WEEKDAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year}`;
}

/** Date local del calendario → "YYYY-MM-DD" */
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TimeOffPanel({ items, holidays, canManage, today }: TimeOffPanelProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [toDelete, setToDelete] = useState<TimeOffItem | null>(null);
  const [showAllHolidays, setShowAllHolidays] = useState(false);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isMobile = useMediaQuery("(max-width: 639px)");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const report = (r: ScheduleActionResult) =>
    setNotice(r.ok ? { kind: "ok", text: r.message } : { kind: "error", text: r.error });

  // No sugerir feriados que ya están bloqueados.
  const blockedDays = new Set(items.flatMap((i) => i.coveredDays));
  const pendingHolidays = holidays.filter((h) => !blockedDays.has(h.date));
  const visibleHolidays = showAllHolidays ? pendingHolidays : pendingHolidays.slice(0, 4);

  const blockHoliday = (h: Holiday) =>
    startTransition(async () => {
      setBlocking(h.date);
      report(await addTimeOff({ allDay: true, startDate: h.date, endDate: h.date, reason: h.name }));
      setBlocking(null);
    });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Días y horas bloqueados</h3>
          <p className="text-sm text-muted-foreground">Vacaciones, feriados o un rato que no vas a atender.</p>
        </div>
        {canManage && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus /> Agregar bloqueo
          </Button>
        )}
      </div>

      <div aria-live="polite">
        {notice && (
          <p
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              notice.kind === "ok" ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {notice.kind === "ok" ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
            {notice.text}
          </p>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Bloqueos próximos */}
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <CalendarOff className="size-5 text-faint" />
              <p className="text-sm text-muted-foreground">No tenés bloqueos próximos.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised text-muted-foreground">
                    {t.allDay ? <CalendarOff className="size-4" /> : <Clock className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium first-letter:uppercase">{t.dates}</span>
                      {t.current && (
                        <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary">Ahora</span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono tabular">{t.detail}</span>
                      {t.reason && ` · ${t.reason}`}
                    </span>
                  </span>
                  {canManage && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Eliminar bloqueo ${t.dates}`} onClick={() => setToDelete(t)}>
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Feriados sugeridos */}
        {canManage && pendingHolidays.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Flag className="size-4 text-primary" />
              <h4 className="text-sm font-medium">Feriados próximos</h4>
            </div>
            <ul className="flex flex-col gap-1">
              {visibleHolidays.map((h) => (
                <li key={h.date} className="flex items-center gap-3 rounded-lg py-1.5">
                  <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground tabular first-letter:uppercase">
                    {holidayLabel(h.date, today.slice(0, 4))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{h.name}</span>
                    {h.movable && <span className="block text-[11px] text-warning">Puede trasladarse: confirmá la fecha</span>}
                  </span>
                  <Button size="sm" variant="secondary" disabled={blocking === h.date} onClick={() => blockHoliday(h)}>
                    {blocking === h.date && <Loader2 className="animate-spin" />}
                    Bloquear
                  </Button>
                </li>
              ))}
            </ul>
            {pendingHolidays.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllHolidays((v) => !v)}
                className="self-start text-xs text-muted-foreground hover:text-foreground"
              >
                {showAllHolidays ? "Ver menos" : `Ver los ${pendingHolidays.length} feriados del año`}
              </button>
            )}
          </div>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
        >
          <SheetHeader className="px-5 pt-5 pb-4">
            <SheetTitle className="text-lg">Agregar bloqueo</SheetTitle>
            <SheetDescription>En ese tiempo no se van a poder reservar turnos.</SheetDescription>
          </SheetHeader>
          {open && (
            <TimeOffForm
              today={today}
              onCancel={() => setOpen(false)}
              onDone={(r) => {
                report(r);
                if (r.ok) setOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteTimeOffDialog item={toDelete} onClose={() => setToDelete(null)} onResult={report} />
    </section>
  );
}

function TimeOffForm({
  today,
  onCancel,
  onDone,
}: {
  today: string;
  onCancel: () => void;
  onDone: (r: ScheduleActionResult) => void;
}) {
  const todayDate = new Date(`${today}T00:00:00`);
  const [allDay, setAllDay] = useState(true);
  const [range, setRange] = useState<DateRange | undefined>({ from: todayDate, to: todayDate });
  const [day, setDay] = useState<Date | undefined>(todayDate);
  const [startTime, setStartTime] = useState("15:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      setError(null);
      if (allDay && !range?.from) return setError("Elegí al menos un día.");
      if (!allDay && !day) return setError("Elegí el día.");
      const result = allDay
        ? await addTimeOff({
            allDay: true,
            startDate: toYMD(range!.from!),
            endDate: toYMD(range!.to ?? range!.from!),
            reason,
          })
        : await addTimeOff({ allDay: false, startDate: toYMD(day!), startTime, endTime, reason });
      if (!result.ok) setError(result.error);
      onDone(result);
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        {/* Tipo de bloqueo */}
        <div className="grid grid-cols-2 rounded-lg border bg-inset p-0.5 text-sm" role="radiogroup" aria-label="Tipo de bloqueo">
          {(
            [
              [true, "Día(s) completo(s)"],
              [false, "Unas horas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={allDay === value}
              onClick={() => setAllDay(value)}
              className={cn(
                "rounded-md py-1.5 transition-colors",
                allDay === value ? "bg-segment font-medium text-foreground shadow-[var(--segment-shadow)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex justify-center rounded-xl border bg-inset py-2">
          {allDay ? (
            <Calendar
              mode="range"
              locale={es}
              weekStartsOn={1}
              selected={range}
              onSelect={setRange}
              disabled={{ before: todayDate }}
              className="bg-transparent [--cell-size:--spacing(10)]"
            />
          ) : (
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              selected={day}
              onSelect={setDay}
              disabled={{ before: todayDate }}
              className="bg-transparent [--cell-size:--spacing(10)]"
            />
          )}
        </div>

        {!allDay && (
          <Field>
            <FieldLabel>Horario bloqueado</FieldLabel>
            <div className="flex items-center gap-2">
              <TimeSelect value={startTime} onChange={setStartTime} aria-label="Desde" className="flex-1" />
              <span className="text-faint">–</span>
              <TimeSelect value={endTime} onChange={setEndTime} aria-label="Hasta" className="flex-1" />
            </div>
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="timeoff-reason">
            Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input
            id="timeoff-reason"
            maxLength={120}
            placeholder={allDay ? "Ej.: Vacaciones" : "Ej.: Trámite"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>

        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4" /> {error}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-t px-5 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending} className="flex-1 sm:flex-none">
          Cancelar
        </Button>
        <Button type="button" onClick={submit} disabled={pending} className="flex-1 sm:ml-auto sm:flex-none">
          {pending && <Loader2 className="animate-spin" />}
          Bloquear
        </Button>
      </div>
    </div>
  );
}

function DeleteTimeOffDialog({
  item,
  onClose,
  onResult,
}: {
  item: TimeOffItem | null;
  onClose: () => void;
  onResult: (r: ScheduleActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar este bloqueo?</AlertDialogTitle>
          <AlertDialogDescription>
            {item?.dates} · {item?.detail}
            {item?.reason ? ` · ${item.reason}` : ""}. Ese tiempo vuelve a quedar disponible para reservar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!item) return;
                onResult(await deleteTimeOff(item.id));
                onClose();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Quitar bloqueo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
