"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TodayPanel } from "@/components/today/today-panel";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { TodayAppointment } from "@/lib/appointments/status";
import type { AgendaDay } from "@/lib/agenda/data";
import { finishAppointment, setAppointmentStatus } from "@/lib/agenda/actions";
import { AppointmentDetail } from "./agenda/appointment-detail";
import { NewAppointmentForm, type ServiceOption } from "./agenda/new-appointment-form";

type HomeTodayProps = {
  day: AgendaDay;
  dateLabel: string;
  timeZone: string;
  today: string;
  businessName: string;
  services: ServiceOption[];
  hours: { hasHours: boolean; open: { start: string; end: string }[]; allDayBlock: string | null };
};

/** Tarjeta "Hoy" del inicio conectada: acciones rápidas, detalle y nuevo turno (mismos paneles que la agenda). */
export function HomeToday({ day, dateLabel, timeZone, today, businessName, services, hours }: HomeTodayProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const all = [...day.appointments, ...day.inactive];
  const opened = openId ? all.find((a) => a.id === openId) ?? null : null;
  const items: TodayAppointment[] = all.map((a) => ({
    id: a.id,
    start: a.start,
    end: a.end,
    clientName: a.clientName,
    serviceName: a.serviceName,
    status: a.status,
    rescheduledTo: a.rescheduledTo,
    price: a.price,
  }));

  const sheetClass = cn("gap-0 p-0", isMobile ? "max-h-[94dvh] rounded-t-2xl" : "w-full sm:max-w-md");

  return (
    <>
      {notice && (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success" aria-live="polite">
          <Check className="size-4" /> {notice}
        </p>
      )}

      <TodayPanel
        appointments={items}
        dateLabel={dateLabel}
        timeZone={timeZone}
        hours={hours}
        onOpen={setOpenId}
        onCreate={() => setCreating(true)}
        onAction={async (id, status) => {
          const result = await setAppointmentStatus(id, status);
          if (!result.ok) return result.error;
          setNotice(result.message);
          return null;
        }}
        onFinish={async (id, method, amount) => {
          const result = await finishAppointment(id, method, amount);
          if (!result.ok) return result.error;
          setNotice(result.message);
          return null;
        }}
      />

      {/* Detalle del turno */}
      <Sheet open={!!opened} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={sheetClass}>
          {opened && (
            <>
              <SheetHeader className="px-5 pt-5 pb-3">
                <SheetTitle className="text-lg">{opened.clientName}</SheetTitle>
                <SheetDescription>Detalle del turno</SheetDescription>
              </SheetHeader>
              <AppointmentDetail
                key={opened.id}
                appointment={opened}
                businessName={businessName}
                timeZone={timeZone}
                today={today}
                view="dia"
                onChanged={(message) => setNotice(message)}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Nuevo turno */}
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "h-[94dvh] rounded-t-2xl" : "w-full sm:max-w-lg")}
        >
          <SheetHeader className="px-5 pt-5 pb-4">
            <SheetTitle className="text-lg">Nuevo turno</SheetTitle>
            <SheetDescription>Cliente, servicio, día y hora.</SheetDescription>
          </SheetHeader>
          {creating && (
            <NewAppointmentForm
              services={services}
              initialDate={today}
              today={today}
              onCancel={() => setCreating(false)}
              onDone={(_id, message) => {
                setCreating(false);
                setNotice(message);
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
