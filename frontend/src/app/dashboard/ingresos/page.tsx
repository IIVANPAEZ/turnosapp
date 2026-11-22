import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, Lock, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { requireBusiness } from "@/lib/auth/dal";
import { formatPYG } from "@/lib/format";
import { getIncome, getIncomeTotal, type Breakdown } from "@/lib/income/data";
import { resolvePeriod, type Period } from "@/lib/income/period";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/clients/schemas";
import { MONTHS_LONG, todayYMD } from "@/lib/time/zone";
import { DailyChart } from "./daily-chart";
import { PaymentsList } from "./payments-list";
import { PeriodPicker } from "./period-picker";
import { UnpaidList } from "./unpaid-list";

export const metadata: Metadata = { title: "Ingresos" };

export default function IncomePage({ searchParams }: PageProps<"/dashboard/ingresos">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Lee sesión y negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<IncomeSkeleton />}>
        <IncomeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** "1 al 30 de noviembre" · "28 de octubre al 3 de noviembre" · "22 de noviembre" */
function periodText(p: Period) {
  const d = (ymd: string) => Number(ymd.slice(8, 10));
  const m = (ymd: string) => MONTHS_LONG[Number(ymd.slice(5, 7)) - 1];
  if (p.from === p.to) return `${d(p.from)} de ${m(p.from)}`;
  if (p.from.slice(0, 7) === p.to.slice(0, 7)) return `${d(p.from)} al ${d(p.to)} de ${m(p.to)}`;
  return `${d(p.from)} de ${m(p.from)} al ${d(p.to)} de ${m(p.to)}`;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

async function IncomeContent({ searchParams }: Pick<PageProps<"/dashboard/ingresos">, "searchParams">) {
  const [{ business, member }, params] = await Promise.all([requireBusiness(), searchParams]);

  const header = (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Ingresos</h2>
      <p className="text-sm text-muted-foreground">Lo que cobraste y cómo te pagaron.</p>
    </div>
  );

  // Decisión del Sprint 5: los totales los ven solo el dueño o un administrador.
  if (member.role !== "owner" && member.role !== "admin") {
    return (
      <>
        {header}
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <Lock className="size-5 text-faint" />
          <h3 className="font-medium">Los ingresos los ve el dueño o un administrador</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Vos podés cobrar tus turnos al finalizarlos, y ver el cobro en cada turno.
          </p>
        </section>
      </>
    );
  }

  const today = todayYMD(business.timezone);
  const period = resolvePeriod(params, today);
  const [income, prevTotal] = await Promise.all([getIncome(period.from, period.to), getIncomeTotal(period.prevFrom, period.prevTo)]);
  const delta = prevTotal > 0 ? Math.round(((income.total - prevTotal) / prevTotal) * 100) : null;
  const ticket = income.paymentsCount ? Math.round(income.total / income.paymentsCount) : 0;
  const closedVisits = income.attended + income.noShows;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {header}
        <PeriodPicker current={period.key} from={period.from} to={period.to} rangeLabel={periodText(period)} />
      </div>

      {/* Números principales */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07] col-span-2 lg:col-span-1">
          <div className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
          <p className="relative text-sm text-muted-foreground first-letter:uppercase">Cobrado · {periodText(period)}</p>
          <p className="relative mt-1 font-mono text-3xl font-semibold tracking-tight tabular">{formatPYG(income.total)}</p>
          <p className="relative mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {delta === null ? (
              "Sin cobros en el período anterior para comparar"
            ) : (
              <>
                <span className={cn("flex items-center gap-0.5 font-medium", delta >= 0 ? "text-success" : "text-warning")}>
                  {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                  {delta >= 0 ? "+" : ""}
                  {delta}%
                </span>
                {period.prevLabel} ({formatPYG(prevTotal)})
              </>
            )}
          </p>
        </div>
        <Kpi label="Turnos atendidos" value={String(income.attended)} hint={`${income.paymentsCount} cobro${income.paymentsCount === 1 ? "" : "s"}`} />
        <Kpi label="Ticket promedio" value={ticket ? formatPYG(ticket) : "—"} hint="Por cobro" />
        <Kpi
          label="Falta cobrar"
          value={income.unpaidTotal ? formatPYG(income.unpaidTotal) : "₲ 0"}
          hint={income.unpaid.length ? `${income.unpaid.length} turno${income.unpaid.length === 1 ? "" : "s"} finalizado${income.unpaid.length === 1 ? "" : "s"}` : "Todo cobrado"}
          tone={income.unpaid.length ? "warning" : undefined}
          href={income.unpaid.length ? "#falta-cobrar" : undefined}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      {income.byDay.length > 1 && (
        <Card title="Cobrado por día">
          {income.total > 0 ? (
            <DailyChart days={income.byDay} today={today} />
          ) : (
            <Empty text="No hubo cobros en este período." />
          )}
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Cómo te pagaron">
          {income.total > 0 ? (
            <Bars
              rows={(["cash", "transfer"] as PaymentMethod[]).map((m) => ({
                name: PAYMENT_METHOD_LABELS[m],
                total: income.byMethod[m].total,
                count: income.byMethod[m].count,
              }))}
              total={income.total}
            />
          ) : (
            <Empty text="Todavía no hay cobros." />
          )}
        </Card>
        <Card title="Por servicio">
          {income.byService.length ? <Bars rows={topWithOthers(income.byService, 6)} total={income.total} /> : <Empty text="Todavía no hay cobros." />}
        </Card>
        {income.byMember.length > 1 && (
          <Card title="Por profesional">
            <Bars rows={income.byMember} total={income.total} />
          </Card>
        )}
      </div>

      {/* Otros datos del período */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi
          label="No vino"
          value={`${pct(income.noShows, closedVisits)}%`}
          hint={`${income.noShows} de ${closedVisits} turno${closedVisits === 1 ? "" : "s"} cerrado${closedVisits === 1 ? "" : "s"}`}
          tone={income.noShows ? "warning" : undefined}
        />
        <Kpi label="Clientes nuevos" value={String(income.newClients)} hint="Cargados en el período" />
        <Kpi
          label="Reservas online"
          value={`${pct(income.online, income.scheduled)}%`}
          hint={`${income.online} de ${income.scheduled} turno${income.scheduled === 1 ? "" : "s"}`}
        />
      </section>

      {income.unpaid.length > 0 && (
        <section id="falta-cobrar" className="flex scroll-mt-6 flex-col gap-3">
          <div>
            <h3 className="font-medium">Falta cobrar</h3>
            <p className="text-sm text-muted-foreground">Turnos finalizados sin cobro registrado.</p>
          </div>
          <UnpaidList items={income.unpaid} today={today} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="font-medium">Cobros</h3>
        {income.payments.length ? (
          <PaymentsList items={income.payments} today={today} showMember={income.byMember.length > 1} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center">
            <Wallet className="size-5 text-faint" />
            <p className="text-sm font-medium">No hay cobros en este período</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Se registran solos al tocar “Finalizar cita” y elegir cómo te pagó.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

/** Los N más grandes + "Otros". */
function topWithOthers(rows: Breakdown[], n: number): Breakdown[] {
  if (rows.length <= n) return rows;
  const rest = rows.slice(n - 1);
  return [
    ...rows.slice(0, n - 1),
    { name: "Otros", total: rest.reduce((s, r) => s + r.total, 0), count: rest.reduce((s, r) => s + r.count, 0) },
  ];
}

function Kpi({
  label,
  value,
  hint,
  tone,
  href,
  className: extra,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warning";
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-mono text-xl font-semibold tabular", tone === "warning" && "text-warning")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </>
  );
  const className = cn("min-w-0 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.07] sm:p-5", extra);
  return href ? (
    <a href={href} className={cn(className, "transition-colors hover:ring-line-strong")}>
      {body}
    </a>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]">
      <h3 className="font-medium">{title}</h3>
      {children}
    </section>
  );
}

/** Barras horizontales: nombre y monto en texto, barra fina en ámbar. */
function Bars({ rows, total }: { rows: Breakdown[]; total: number }) {
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {r.name} <span className="text-xs text-muted-foreground">· {r.count}</span>
            </span>
            <span className="shrink-0 font-mono tabular">
              {formatPYG(r.total)} <span className="text-xs text-muted-foreground">{pct(r.total, total)}%</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-inset">
            <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (r.total / total) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function IncomeSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-36 rounded bg-raised" />
        <div className="h-4 w-56 rounded bg-raised/60" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-card" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-card" />
    </div>
  );
}
