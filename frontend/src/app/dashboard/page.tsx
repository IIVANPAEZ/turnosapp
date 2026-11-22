import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE, PUBLIC_SITE_DOMAIN } from "@/lib/config";
import { getBusinessSettings, requireBusiness } from "@/lib/auth/dal";
import { MEMBER_COLORS } from "@/lib/business/members";
import { WEEKDAYS } from "@/lib/schedule/constants";
import { getTodaySchedule, getWeekHours, todayLabel } from "@/lib/schedule/data";
import { weeklyTotal } from "@/lib/schedule/week";
import { getServices } from "@/lib/services/data";
import { getAgenda, getPendingOnline, hasAnyAppointment } from "@/lib/agenda/data";
import { todayYMD } from "@/lib/time/zone";
import { BookingLinkCard } from "./booking-link-card";
import { HomeToday } from "./home-today";
import { PendingOnline } from "./pending-online";

export const metadata: Metadata = { title: "Inicio" };

export default function DashboardPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Lee sesión y negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<HomeSkeleton />}>
        <Home />
      </Suspense>
    </div>
  );
}

function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date()),
  );
  if (hour < 12) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

type Step = { label: string; hint: string; done: boolean; href?: string };

async function Home() {
  const { business, member } = await requireBusiness();
  const todayDate = todayYMD(business.timezone);
  const [services, week, today, [agendaToday], anyAppointment, settings, pendingOnline] = await Promise.all([
    getServices(),
    getWeekHours(member.id),
    getTodaySchedule(member.id),
    getAgenda(todayDate, 1),
    hasAnyAppointment(),
    getBusinessSettings(),
    getPendingOnline(),
  ]);
  const firstName = member.displayName.split(" ")[0];
  const publicUrl = `${PUBLIC_SITE_DOMAIN}/${business.slug}`;

  const activeServices = services.filter((s) => s.isActive).length;
  const hasHours = WEEKDAYS.some((d) => week[d.value].length > 0);

  const steps: Step[] = [
    { label: "Creá tu negocio", hint: business.name, done: true },
    {
      label: "Elegí tu nombre y color de agenda",
      hint: "Así te ven tus clientes al reservar",
      done: member.color !== MEMBER_COLORS[0].value,
      href: "/dashboard/profesionales",
    },
    {
      label: "Cargá tus servicios",
      hint: services.length
        ? `${activeServices} servicio${activeServices === 1 ? "" : "s"} visible${activeServices === 1 ? "" : "s"} para reservar`
        : "Duración y precio de lo que ofrecés",
      done: services.length > 0,
      href: "/dashboard/servicios",
    },
    {
      label: "Definí tus horarios",
      hint: hasHours ? `${weeklyTotal(week)} por semana` : "Días y horas de atención",
      done: hasHours,
      href: "/dashboard/horarios",
    },
    {
      label: "Cargá tu primer turno",
      hint: anyAppointment ? "Ya estás usando tu agenda" : "Desde la Agenda o con “Nuevo turno”",
      done: anyAppointment,
      href: "/dashboard/agenda",
    },
    {
      label: "Compartí tu link de reservas",
      hint: settings?.bookingLinkSharedAt ? "Ya lo compartiste" : "Copialo o mandalo por WhatsApp",
      done: !!settings?.bookingLinkSharedAt,
      href: "#tu-pagina",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  // Estado de la página de reservas.
  const missing = [!activeServices && "tus servicios", !hasHours && "tus horarios"].filter(Boolean).join(" y ");
  const pageStatus = missing
    ? { tone: "setup" as const, text: `Para que te puedan reservar, cargá ${missing}.` }
    : settings && !settings.bookingEnabled
      ? { tone: "paused" as const, text: "Pausaste las reservas online. Podés activarlas en Configuración." }
      : { tone: "live" as const, text: "Tus clientes ya pueden reservar acá, sin escribirte por WhatsApp." };

  // Estado de hoy para la tarjeta "Hoy".
  const allDayBlock = today.blocks.find((b) => b.allDay);

  return (
    <>
      <section>
        <p className="text-sm text-muted-foreground">{business.name}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(business.timezone || DEFAULT_TIMEZONE)}, {firstName}
        </h2>
      </section>

      {/* Reservas que hicieron los clientes y esperan confirmación. */}
      <PendingOnline
        items={pendingOnline.items}
        total={pendingOnline.total}
        businessName={business.name}
        today={todayDate}
      />

      {/* Turnos de hoy: en curso, próximos y atendidos (con acciones rápidas). */}
      <HomeToday
        day={agendaToday}
        dateLabel={todayLabel(business.timezone)}
        timeZone={business.timezone}
        today={todayDate}
        businessName={business.name}
        services={services
          .filter((s) => s.isActive)
          .map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price, priceType: s.priceType }))}
        hours={{ hasHours, open: today.open, allDayBlock: allDayBlock?.label ?? null }}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-medium">Primeros pasos</h3>
                <span className="font-mono text-xs text-muted-foreground tabular">
                  {doneCount}/{steps.length}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-inset">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(doneCount / steps.length) * 100}%` }}
                />
              </div>
            </div>

            <ol className="flex flex-col">
              {steps.map((step) => {
                const body = (
                  <>
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                        step.done ? "border-primary bg-primary text-primary-foreground" : "border-line-strong text-faint",
                      )}
                      aria-hidden="true"
                    >
                      {step.done && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", step.done ? "text-muted-foreground line-through decoration-faint" : "font-medium")}>
                        {step.label}
                      </span>
                      <span className="block truncate text-xs text-faint">{step.hint}</span>
                    </span>
                    {step.href && !step.done && <ArrowRight className="size-4 text-muted-foreground" />}
                  </>
                );
                const className = "flex items-center gap-3 rounded-lg px-2 py-2.5 -mx-2";
                return (
                  <li key={step.label}>
                    {step.href && !step.done ? (
                      <Link href={step.href} className={cn(className, "transition-colors hover:bg-raised")}>
                        {body}
                      </Link>
                    ) : (
                      <div className={className}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        <BookingLinkCard
          businessName={business.name}
          slug={business.slug}
          displayUrl={publicUrl}
          status={pageStatus}
          shared={!!settings?.bookingLinkSharedAt}
        />
      </div>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-28 rounded bg-raised" />
        <div className="h-8 w-64 rounded bg-raised" />
      </div>
      <div className="h-28 rounded-xl bg-card" />
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-72 rounded-xl bg-card" />
        <div className="h-72 rounded-xl bg-card" />
      </div>
    </div>
  );
}
