import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBusiness } from "@/lib/auth/dal";
import { getUpcomingTimeOff, getWeekHours, todayInZone, todayWeekday } from "@/lib/schedule/data";
import { upcomingHolidays } from "@/lib/schedule/holidays";
import { TimeOffPanel } from "./time-off-panel";
import { WeekEditor } from "./week-editor";

export const metadata: Metadata = { title: "Horarios" };

export default function SchedulePage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Horarios de atención</h2>
        <p className="text-sm text-muted-foreground">
          Cuándo atendés cada semana. Tus clientes solo van a poder reservar dentro de estos horarios.
        </p>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:gap-5">
          <li>
            <span className="text-foreground">Día apagado</span> = ese día no atendés.
          </li>
          <li>
            ¿Cortás al mediodía? Usá <span className="text-foreground">Agregar pausa</span>.
          </li>
        </ul>
      </div>

      {/* Lee sesión y datos del negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<ScheduleSkeleton />}>
        <ScheduleContent />
      </Suspense>
    </div>
  );
}

async function ScheduleContent() {
  const { business, member } = await requireBusiness();
  const [week, timeOff] = await Promise.all([getWeekHours(member.id), getUpcomingTimeOff()]);
  const isManager = member.role === "owner" || member.role === "admin";
  const today = todayInZone(business.timezone);

  return (
    <div className="flex flex-col gap-12">
      {/* key: si el horario cambia en el servidor, el editor arranca de nuevo con esos datos. */}
      <WeekEditor
        key={JSON.stringify(week)}
        memberId={member.id}
        initialWeek={week}
        canEdit={isManager}
        timeZone={business.timezone}
        today={todayWeekday(business.timezone)}
      />
      <TimeOffPanel items={timeOff} holidays={upcomingHolidays(today)} canManage={isManager} today={today} />
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="h-56 rounded-xl bg-card" />
      <div className="divide-y overflow-hidden rounded-xl bg-card">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 px-5 py-4">
            <div className="h-5 w-28 rounded bg-raised" />
            <div className="h-9 w-52 rounded-lg bg-inset" />
          </div>
        ))}
      </div>
    </div>
  );
}
