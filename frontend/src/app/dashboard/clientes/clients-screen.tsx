"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Users, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { formatPYG } from "@/lib/format";
import type { ClientSummary } from "@/lib/clients/data";
import { CLIENT_TAG_LABELS, type ClientTag } from "@/lib/clients/schemas";
import type { ServiceOption } from "../agenda/new-appointment-form";
import { ClientPanel } from "./client-panel";
import { dayMonth } from "./dates";

type ClientsScreenProps = {
  clients: ClientSummary[];
  initialOpenId: string | null;
  today: string;
  seesEveryone: boolean;
  services: ServiceOption[];
};

type Sort = "recent" | "name" | "visits";
type Filter = "all" | ClientTag;

/** Filas que se muestran por tanda. */
const PAGE = 60;

/** Sin acentos y en minúsculas, para buscar "benitez" y encontrar "Benítez". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function ClientsScreen({ clients, initialOpenId, today, seesEveryone, services }: ClientsScreenProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: clients.length, new: 0, frequent: 0, lost: 0 };
    for (const cl of clients) for (const t of cl.tags) c[t]++;
    return c;
  }, [clients]);

  const list = useMemo(() => {
    const q = fold(query.trim());
    const digits = query.replace(/\D/g, "");
    const filtered = clients.filter((c) => {
      if (filter !== "all" && !c.tags.includes(filter)) return false;
      if (!q) return true;
      if (fold(c.name).includes(q)) return true;
      return digits.length >= 3 && !!c.phone && c.phone.replace(/\D/g, "").includes(digits);
    });
    const byName = (a: ClientSummary, b: ClientSummary) => a.name.localeCompare(b.name, "es");
    return filtered.sort((a, b) =>
      sort === "name" ? byName(a, b) : sort === "visits" ? b.visits - a.visits || byName(a, b) : b.activity - a.activity,
    );
  }, [clients, query, sort, filter]);

  const close = () => {
    setOpenId(null);
    // Saca "?cliente=" de la dirección sin recargar.
    if (window.location.search.includes("cliente=")) window.history.replaceState(null, "", "/dashboard/clientes");
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {clients.length
              ? `${clients.length} cliente${clients.length === 1 ? "" : "s"}. Se agregan solos al cargar un turno o cuando te reservan online.`
              : "Se agregan solos al cargar un turno o cuando te reservan online."}
          </p>
        </div>
      </div>

      {notice && (
        <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success" aria-live="polite">
          <Check className="size-4" /> {notice}
        </p>
      )}

      {clients.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="size-5" />
          </div>
          <h3 className="font-medium">Todavía no tenés clientes</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cuando cargues un turno en la Agenda o alguien reserve desde tu página, el cliente aparece acá con su historial.
          </p>
        </section>
      ) : (
        <>
          {/* Buscar, filtrar y ordenar */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Buscar por nombre o celular"
                aria-label="Buscar cliente"
                className="h-11 pr-9 pl-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Borrar búsqueda"
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-faint hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filtrar">
                {(["all", "new", "frequent", "lost"] as Filter[]).map((f) => (
                  <Pill key={f} selected={filter === f} onClick={() => setFilter(f)}>
                    {f === "all" ? "Todos" : f === "lost" ? "No volvieron" : `${CLIENT_TAG_LABELS[f]}s`}
                    <span className="font-mono text-[11px] tabular opacity-70">{counts[f]}</span>
                  </Pill>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg bg-inset p-1" role="radiogroup" aria-label="Ordenar">
                {(
                  [
                    ["recent", "Recientes"],
                    ["name", "A–Z"],
                    ["visits", "Más visitas"],
                  ] as [Sort, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={sort === value}
                    onClick={() => setSort(value)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs transition-colors",
                      sort === value ? "bg-raised font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lista */}
          {list.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No encontramos clientes{query.trim() ? ` con “${query.trim()}”` : " con ese filtro"}.
            </p>
          ) : (
            <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
              <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8.5rem_4.5rem_7rem] gap-4 border-b px-4 py-2.5 text-xs text-faint md:grid">
                <span>Cliente</span>
                <span>Última visita</span>
                <span>Próximo turno</span>
                <span className="text-right">Visitas</span>
                <span className="text-right">{seesEveryone ? "Cobrado" : "Cobrado (tuyo)"}</span>
              </div>
              <ul className="divide-y">
                {list.slice(0, shown).map((c) => (
                  <li key={c.id}>
                    <ClientRow client={c} today={today} onOpen={() => setOpenId(c.id)} />
                  </li>
                ))}
              </ul>
              {list.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="w-full border-t px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
                >
                  Ver más ({list.length - shown})
                </button>
              )}
            </section>
          )}
        </>
      )}

      <Sheet open={!!openId} onOpenChange={(o) => !o && close()}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "h-[94dvh] rounded-t-2xl" : "w-full sm:max-w-lg")}
        >
          {openId && (
            <ClientPanel
              key={openId}
              clientId={openId}
              today={today}
              services={services}
              onNotice={setNotice}
              onClose={close}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ClientRow({ client: c, today, onOpen }: { client: ClientSummary; today: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 px-4 py-3 text-left transition-colors outline-none hover:bg-raised focus-visible:bg-raised md:grid-cols-[2.25rem_minmax(0,1fr)_7rem_8.5rem_4.5rem_7rem] md:gap-x-4"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-raised text-sm font-medium text-muted-foreground">
        {c.name.trim().charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{c.name}</span>
          {c.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </span>
        <span className="block truncate font-mono text-xs text-muted-foreground">{c.phone ?? "Sin celular"}</span>
        {/* Celular: resumen en una línea */}
        <span className="mt-0.5 block truncate text-xs text-faint md:hidden">
          {c.next
            ? `Próximo: ${c.next.date === today ? "hoy" : dayMonth(c.next.date, today)} ${c.next.time}`
            : c.lastVisit
              ? `Última visita: ${dayMonth(c.lastVisit, today)}`
              : "Sin visitas todavía"}
          {c.visits > 0 && ` · ${c.visits} visita${c.visits === 1 ? "" : "s"}`}
        </span>
      </span>
      <span className="hidden text-sm text-muted-foreground md:block">{c.lastVisit ? dayMonth(c.lastVisit, today) : "—"}</span>
      <span className="hidden text-sm md:block">
        {c.next ? (
          <>
            {c.next.date === today ? "Hoy" : dayMonth(c.next.date, today)}{" "}
            <span className="font-mono text-muted-foreground tabular">{c.next.time}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </span>
      <span className="hidden text-right font-mono text-sm tabular md:block">{c.visits}</span>
      <span className="hidden text-right font-mono text-sm tabular md:block">
        {c.totalPaid ? formatPYG(c.totalPaid) : <span className="text-faint">—</span>}
      </span>
    </button>
  );
}

export function TagChip({ tag }: { tag: ClientTag }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tag === "new" && "bg-primary-soft text-primary",
        tag === "frequent" && "bg-success-soft text-success",
        tag === "lost" && "bg-warning-soft text-warning",
      )}
    >
      {CLIENT_TAG_LABELS[tag]}
    </span>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors",
        selected
          ? "border-primary/70 bg-primary-soft font-medium text-primary"
          : "bg-inset text-muted-foreground hover:border-line-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
