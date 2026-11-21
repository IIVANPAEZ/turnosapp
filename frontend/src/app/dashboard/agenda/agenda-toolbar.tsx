"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { es } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type AgendaView = "dia" | "semana";

type AgendaToolbarProps = {
  /** Fecha elegida "YYYY-MM-DD" */
  date: string;
  view: AgendaView;
  /** Texto de la fecha o del rango ("Sábado 21 de noviembre" / "16 – 22 de noviembre"). */
  title: string;
  /** Versión corta para el celular ("Sáb 21 nov" / "16 – 22 nov"). */
  shortTitle: string;
  prev: string;
  next: string;
  today: string;
  isCurrent: boolean;
};

export const agendaHref = (date: string, view: AgendaView) => `/dashboard/agenda?fecha=${date}&vista=${view}`;

export function AgendaToolbar({ date, view, title, shortTitle, prev, next, today, isCurrent }: AgendaToolbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [y, m, d] = date.split("-").map(Number);
  const selected = new Date(y, m - 1, d);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "dia" ? "Día anterior" : "Semana anterior"}
          render={<Link href={agendaHref(prev, view)} />}
          nativeButton={false}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant={isCurrent ? "secondary" : "outline"}
          render={<Link href={agendaHref(today, view)} />}
          nativeButton={false}
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "dia" ? "Día siguiente" : "Semana siguiente"}
          render={<Link href={agendaHref(next, view)} />}
          nativeButton={false}
        >
          <ChevronRight />
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="ml-1 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-raised"
              />
            }
          >
            <CalendarDays className="size-4 shrink-0 text-primary" />
            <span className="truncate text-base font-semibold tracking-tight sm:hidden">{shortTitle}</span>
            <span className="hidden truncate text-lg font-semibold tracking-tight sm:inline">{title}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-1">
            <Calendar
              mode="single"
              locale={es}
              weekStartsOn={1}
              selected={selected}
              defaultMonth={selected}
              onSelect={(day) => {
                if (!day) return;
                const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
                setOpen(false);
                router.push(agendaHref(ymd, view));
              }}
              className="bg-transparent [--cell-size:--spacing(9)]"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid w-full grid-cols-2 rounded-lg border bg-inset p-0.5 text-sm sm:w-auto" role="tablist" aria-label="Vista">
        {(
          [
            ["dia", "Día"],
            ["semana", "Semana"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={agendaHref(date, value)}
            role="tab"
            aria-selected={view === value}
            className={cn(
              "rounded-md px-4 py-1.5 text-center transition-colors",
              view === value ? "bg-raised font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
