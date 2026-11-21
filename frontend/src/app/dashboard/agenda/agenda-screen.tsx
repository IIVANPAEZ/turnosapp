"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import type { AgendaDay } from "@/lib/agenda/data";
import { AgendaToolbar, agendaHref, type AgendaView as View } from "./agenda-toolbar";
import { AgendaView } from "./agenda-view";
import { AppointmentDetail } from "./appointment-detail";
import { NewAppointmentForm, type ServiceOption } from "./new-appointment-form";

type AgendaScreenProps = {
  toolbar: Omit<React.ComponentProps<typeof AgendaToolbar>, "onCreate">;
  days: AgendaDay[];
  view: View;
  timeZone: string;
  services: ServiceOption[];
  today: string;
  businessName: string;
};

/** Agenda + panel "Nuevo turno" (desde el botón, el "+" flotante o tocando una celda). */
export function AgendaScreen({ toolbar, days, view, timeZone, services, today, businessName }: AgendaScreenProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 639px)");
  // Panel: null = cerrado; si no, día y hora precargados.
  const [draft, setDraft] = useState<{ date: string; time?: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // Turno abierto en el panel de detalle (se busca en los datos actuales: siempre al día).
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = openId ? days.flatMap((d) => [...d.appointments, ...d.inactive]).find((a) => a.id === openId) : null;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 4000);
    return () => clearTimeout(t);
  }, [highlightId]);

  // Día por defecto del formulario: el que se está mirando (o hoy, si cae en la semana mostrada).
  const defaultDate =
    view === "dia" ? toolbar.date : days.some((d) => d.date === today) ? today : days[0]?.date ?? today;

  const openNew = (date: string, time?: string) => setDraft({ date, time });

  return (
    <>
      <AgendaToolbar {...toolbar} onCreate={() => openNew(defaultDate)} />

      {notice && (
        <p
          className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success"
          aria-live="polite"
        >
          <Check className="size-4" /> {notice}
        </p>
      )}

      <AgendaView
        days={days}
        view={view}
        timeZone={timeZone}
        onCreate={openNew}
        highlightId={highlightId}
        onOpen={setOpenId}
      />

      {/* Celular: botón flotante */}
      <Button
        size="icon-lg"
        aria-label="Nuevo turno"
        onClick={() => openNew(defaultDate)}
        className="fixed right-4 bottom-5 z-30 size-14 rounded-full shadow-[0_10px_30px_-8px_rgb(242_169_59/0.7)] sm:hidden"
      >
        <Plus className="size-6" />
      </Button>

      <Sheet open={!!draft} onOpenChange={(open) => !open && setDraft(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "h-[94dvh] rounded-t-2xl" : "w-full sm:max-w-lg")}
        >
          <SheetHeader className="px-5 pt-5 pb-4">
            <SheetTitle className="text-lg">Nuevo turno</SheetTitle>
            <SheetDescription>Cliente, servicio, día y hora.</SheetDescription>
          </SheetHeader>
          {draft && (
            <NewAppointmentForm
              key={`${draft.date}-${draft.time ?? ""}`}
              services={services}
              initialDate={draft.date}
              initialTime={draft.time}
              today={today}
              onCancel={() => setDraft(null)}
              onDone={(id, message, date) => {
                setDraft(null);
                setNotice(message);
                setHighlightId(id);
                // Si el turno quedó en otro día de la vista, saltamos a ese día.
                if (!days.some((d) => d.date === date)) router.push(agendaHref(date, view));
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Detalle del turno */}
      <Sheet open={!!opened} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "max-h-[94dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
        >
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
                view={view}
                onChanged={(message, highlight, goToDate) => {
                  setNotice(message);
                  if (highlight) setHighlightId(highlight);
                  if (goToDate && !days.some((d) => d.date === goToDate)) router.push(agendaHref(goToDate, view));
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
