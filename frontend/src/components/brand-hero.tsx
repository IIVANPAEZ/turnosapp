import { BellRing, CalendarClock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brand } from "@/components/layout/brand";
import { DayStrip, type DayStripItem } from "@/components/day-strip";

/** Día de ejemplo para mostrar "la tira del día" en las pantallas de marca. */
const DEMO_DAY: DayStripItem[] = [
  { id: "1", start: "09:00", end: "10:00", label: "Laura", color: "#c98a2b" },
  { id: "2", start: "10:15", end: "11:00", label: "Sofi", color: "#0891b2" },
  { id: "3", start: "12:00", end: "13:30", label: "Marta", color: "#c98a2b" },
  { id: "4", start: "14:30", end: "15:30", label: "Ana", color: "#059669" },
  { id: "5", start: "16:00", end: "17:30", label: "Dani", color: "#0891b2" },
];

const FEATURES = [
  { icon: CalendarClock, text: "Tus clientes reservan solos, 24/7" },
  { icon: BellRing, text: "Recordatorios por WhatsApp" },
  { icon: Wallet, text: "Tus servicios y precios en guaraníes" },
];

/**
 * Panel de marca de las pantallas públicas (login, registro, recuperar).
 * En el celular queda arriba del formulario; en escritorio, a la izquierda.
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
              Turnos, clientes y recordatorios en un solo lugar, para profesionales de belleza y salud.
            </p>
          </div>

          <div className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm sm:p-4">
            <div className="mb-2.5 flex items-baseline justify-between text-xs">
              <span className="font-medium">Hoy</span>
              <span className="text-muted-foreground">5 turnos · ₲ 720.000</span>
            </div>
            <DayStrip items={DEMO_DAY} />
          </div>
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
