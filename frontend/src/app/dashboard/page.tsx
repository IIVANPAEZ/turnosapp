import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Check, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { TodayPanel } from "@/components/today/today-panel";
import { cn } from "@/lib/utils";
import { DEFAULT_TIMEZONE, PUBLIC_SITE_DOMAIN } from "@/lib/config";
import { requireBusiness } from "@/lib/auth/dal";
import { MEMBER_COLORS } from "@/lib/business/members";
import { WEEKDAYS } from "@/lib/schedule/constants";
import { getTodaySchedule, getWeekHours, todayLabel } from "@/lib/schedule/data";
import { weeklyTotal } from "@/lib/schedule/week";
import { getServices } from "@/lib/services/data";

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

type Step = { label: string; hint: string; done: boolean; href?: string; soon?: boolean };

async function Home() {
  const { business, member } = await requireBusiness();
  const [services, week, today] = await Promise.all([
    getServices(),
    getWeekHours(member.id),
    getTodaySchedule(member.id),
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
    { label: "Compartí tu link de reservas", hint: "Por WhatsApp o Instagram", done: false, soon: true },
  ];
  const doneCount = steps.filter((s) => s.done).length;

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

      {/* Turnos de hoy: se conectan con la Agenda en el Sprint 3 (por ahora, lista vacía). */}
      <TodayPanel
        appointments={[]}
        dateLabel={todayLabel(business.timezone)}
        timeZone={business.timezone}
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
                    {step.soon && (
                      <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted-foreground">Próximamente</span>
                    )}
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

        <Card className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/15 blur-3xl"
            aria-hidden="true"
          />
          <CardContent className="relative flex flex-col gap-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Globe className="size-5" />
            </div>
            <div>
              <h3 className="font-medium">Tu página de reservas</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tus clientes van a reservar acá, sin escribirte por WhatsApp.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-inset py-1.5 pr-1.5 pl-3">
              <span className="truncate font-mono text-[13px]">{publicUrl}</span>
              <CopyButton value={`https://${publicUrl}`} />
            </div>
            <p className="text-xs text-faint">
              {services.length > 0 && hasHours
                ? "Tu página se habilita muy pronto: la estamos terminando."
                : `Para activarla, cargá ${[!services.length && "tus servicios", !hasHours && "tus horarios"].filter(Boolean).join(" y ")}.`}
            </p>
          </CardContent>
        </Card>
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
