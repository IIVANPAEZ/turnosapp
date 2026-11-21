import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBusiness } from "@/lib/auth/dal";
import { getAgenda } from "@/lib/agenda/data";
import { addDays, isYMD, longDayLabel, MONTHS_SHORT, shortDayLabel, startOfWeek, todayYMD, weekRangeLabel } from "@/lib/time/zone";
import { AgendaToolbar, type AgendaView as View } from "./agenda-toolbar";
import { AgendaView } from "./agenda-view";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage({ searchParams }: PageProps<"/dashboard/agenda">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      {/* Lee sesión, negocio y la fecha de la URL: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<AgendaSkeleton />}>
        <AgendaContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AgendaContent({ searchParams }: Pick<PageProps<"/dashboard/agenda">, "searchParams">) {
  const [{ business }, params] = await Promise.all([requireBusiness(), searchParams]);
  const tz = business.timezone;
  const today = todayYMD(tz);

  const view: View = params.vista === "semana" ? "semana" : "dia";
  const date = isYMD(params.fecha) ? params.fecha : today;
  const from = view === "semana" ? startOfWeek(date) : date;
  const step = view === "semana" ? 7 : 1;

  const days = await getAgenda(from, step);
  const currentYear = Number(today.slice(0, 4));

  return (
    <>
      <AgendaToolbar
        date={date}
        view={view}
        title={view === "semana" ? weekRangeLabel(from) : longDayLabel(date, currentYear)}
        shortTitle={view === "semana" ? shortWeekLabel(from) : `${shortDayLabel(date)} ${MONTHS_SHORT[Number(date.slice(5, 7)) - 1]}`}
        prev={addDays(from, -step)}
        next={addDays(from, step)}
        today={today}
        isCurrent={view === "semana" ? startOfWeek(today) === from : date === today}
      />
      <AgendaView days={days} view={view} timeZone={tz} />
    </>
  );
}

/** "16 – 22 nov" · "30 nov – 6 dic" */
function shortWeekLabel(monday: string) {
  const sunday = addDays(monday, 6);
  const m1 = MONTHS_SHORT[Number(monday.slice(5, 7)) - 1];
  const m2 = MONTHS_SHORT[Number(sunday.slice(5, 7)) - 1];
  const d1 = Number(monday.slice(8, 10));
  const d2 = Number(sunday.slice(8, 10));
  return m1 === m2 ? `${d1} – ${d2} ${m2}` : `${d1} ${m1} – ${d2} ${m2}`;
}

function AgendaSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true">
      <div className="flex items-center gap-2">
        <div className="size-9 rounded-lg bg-raised" />
        <div className="h-9 w-16 rounded-lg bg-raised" />
        <div className="size-9 rounded-lg bg-raised" />
        <div className="ml-2 h-6 w-56 rounded bg-raised" />
      </div>
      <div className="h-140 rounded-xl bg-card" />
    </div>
  );
}
