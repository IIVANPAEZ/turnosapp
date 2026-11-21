import { BellRing, CalendarClock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { Brand } from "@/components/layout/brand";
import { TodayPanel } from "@/components/today/today-panel";
import type { TodayAppointment } from "@/lib/appointments/status";

/** Día de ejemplo para la muestra de la tarjeta "Hoy" (con la hora fija en 14:50). */
const DEMO_APPOINTMENTS: TodayAppointment[] = [
  { id: "1", start: "09:00", end: "09:45", clientName: "Laura Giménez", serviceName: "Corte de cabello", status: "completed" },
  { id: "2", start: "10:00", end: "10:30", clientName: "Sofía Ruiz", serviceName: "Barba", status: "cancelled" },
  {
    id: "3",
    start: "11:00",
    end: "12:00",
    clientName: "Marta López",
    serviceName: "Coloración",
    status: "pending",
    rescheduledTo: "jue 14:00",
  },
  { id: "4", start: "14:30", end: "15:30", clientName: "Ana Benítez", serviceName: "Corte + barba", status: "confirmed" },
  { id: "5", start: "15:45", end: "16:30", clientName: "Daniela Ríos", serviceName: "Manicura", status: "confirmed" },
  { id: "6", start: "17:00", end: "17:30", clientName: "Carla Duarte", serviceName: "Barba", status: "pending" },
];

const DEMO_NOW = 14 * 60 + 50;

const FEATURES = [
  { icon: CalendarClock, text: "Tus clientes reservan solos, 24/7" },
  { icon: BellRing, text: "Recordatorios por WhatsApp" },
  { icon: Wallet, text: "Tus servicios y precios en guaraníes" },
];

/**
 * Panel de marca de las pantallas públicas (login, registro, recuperar).
 * En el celular queda arriba del formulario (sin la muestra, para no empujarlo);
 * en escritorio, a la izquierda.
 */
export function BrandHero({ className }: { className?: string }) {
  return (
    <section className={cn("glow-ambar relative flex flex-col overflow-hidden", className)}>
      <div className="relative flex flex-1 flex-col gap-8 px-6 pt-8 pb-8 sm:px-10 lg:justify-between lg:px-14 lg:py-12">
        <Brand />

        <div className="flex flex-col gap-6 lg:max-w-lg">
          <div>
            <h2 className="text-[28px] leading-[1.08] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Tu agenda,
              <br />
              <span className="text-primary">siempre en orden.</span>
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
              Turnos, clientes y recordatorios en un solo lugar, para cualquier negocio que trabaje con turnos.
            </p>
          </div>

          {/* Muestra de la tarjeta "Hoy" del panel: lo mismo que van a ver al entrar. */}
          <TodayPanel
            demo={{ nowMinutes: DEMO_NOW }}
            appointments={DEMO_APPOINTMENTS}
            dateLabel="viernes"
            timeZone={DEFAULT_TIMEZONE}
            hours={{ hasHours: true, open: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "19:00" }] }}
            className="hidden bg-card/70 backdrop-blur-sm sm:flex"
          />
        </div>

        <ul className="hidden flex-col gap-3 lg:flex">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-secondary-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-primary">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
