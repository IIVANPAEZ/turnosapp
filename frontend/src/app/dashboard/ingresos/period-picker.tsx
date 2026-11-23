"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MAX_RANGE_DAYS, PERIOD_LABELS, type PeriodKey } from "@/lib/income/period";

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toDate = (ymd: string) => new Date(Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)) - 1, Number(ymd.slice(8, 10)));

/** Hoy · Esta semana · Este mes · Mes anterior · Fechas (calendario). */
export function PeriodPicker({ current, from, to, rangeLabel }: { current: PeriodKey; from: string; to: string; rangeLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(current === "rango" ? { from: toDate(from), to: toDate(to) } : undefined);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-lg bg-inset p-1" role="tablist" aria-label="Período">
        {(Object.keys(PERIOD_LABELS) as (keyof typeof PERIOD_LABELS)[]).map((key) => (
          <Link
            key={key}
            href={`/dashboard/ingresos?periodo=${key}`}
            role="tab"
            aria-selected={current === key}
            className={cn(
              "flex h-8 items-center rounded-md px-3 text-sm transition-colors",
              current === key ? "bg-segment font-medium text-foreground shadow-[var(--segment-shadow)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[key]}
          </Link>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition-colors hover:border-line-strong",
                current === "rango" ? "border-primary/70 bg-primary-soft text-primary" : "bg-card",
              )}
            />
          }
        >
          <CalendarDays className="size-4" />
          {current === "rango" ? rangeLabel : "Elegir fechas"}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-1">
          <Calendar
            mode="range"
            locale={es}
            weekStartsOn={1}
            numberOfMonths={1}
            selected={range}
            defaultMonth={range?.from ?? toDate(to)}
            onSelect={(r) => {
              setRange(r);
              if (r?.from && r.to && r.from.getTime() !== r.to.getTime()) {
                setOpen(false);
                router.push(`/dashboard/ingresos?periodo=rango&desde=${toYMD(r.from)}&hasta=${toYMD(r.to)}`);
              }
            }}
            className="bg-transparent [--cell-size:--spacing(9)]"
          />
          <p className="px-3 pb-2 text-xs text-muted-foreground">Elegí el primer y el último día (hasta {MAX_RANGE_DAYS} días).</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
