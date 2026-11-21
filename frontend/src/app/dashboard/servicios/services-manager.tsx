"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { Check, CircleAlert, Copy, Loader2, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { formatDuration, formatPYG } from "@/lib/format";
import type { BusinessCategory } from "@/lib/business/schemas";
import type { Service } from "@/lib/services/data";
import {
  addServiceTemplates,
  deleteService,
  duplicateService,
  setServiceActive,
  type ServiceActionResult,
} from "@/lib/services/actions";
import { SERVICE_TEMPLATES } from "@/lib/services/templates";
import { ServiceForm } from "./service-form";

type ServicesManagerProps = {
  services: Service[];
  category: BusinessCategory;
  canEdit: boolean;
};

type Notice = { kind: "ok" | "error"; text: string } | null;

export function ServicesManager({ services, category, canEdit }: ServicesManagerProps) {
  // Pausar/activar se ve al instante; si el servidor falla, vuelve atrás solo.
  const [optimistic, setOptimisticActive] = useOptimistic(
    services,
    (state, { id, isActive }: { id: string; isActive: boolean }) =>
      state.map((s) => (s.id === id ? { ...s, isActive } : s)),
  );
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  // Panel de edición: undefined = cerrado · null = nuevo · Service = editar
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const report = (result: ServiceActionResult) =>
    setNotice(result.ok ? { kind: "ok", text: result.message } : { kind: "error", text: result.error });

  const toggle = (service: Service, isActive: boolean) =>
    startTransition(async () => {
      setOptimisticActive({ id: service.id, isActive });
      report(await setServiceActive(service.id, isActive));
    });

  const duplicate = (service: Service) =>
    startTransition(async () => report(await duplicateService(service.id)));

  const activeCount = optimistic.filter((s) => s.isActive).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Servicios</h2>
          <p className="text-sm text-muted-foreground">
            {optimistic.length === 0
              ? "Lo que ofrecés, cuánto dura y cuánto cuesta."
              : `${optimistic.length} servicio${optimistic.length === 1 ? "" : "s"} · ${activeCount} visible${activeCount === 1 ? "" : "s"} para reservar`}
          </p>
        </div>
        {canEdit && optimistic.length > 0 && (
          <Button onClick={() => setEditing(null)}>
            <Plus /> Nuevo servicio
          </Button>
        )}
      </div>

      <div aria-live="polite" className="min-h-0">
        {notice && (
          <p
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              notice.kind === "ok" ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {notice.kind === "ok" ? <Check className="size-4" /> : <CircleAlert className="size-4" />}
            {notice.text}
          </p>
        )}
      </div>

      {optimistic.length === 0 ? (
        canEdit ? (
          <TemplatesPicker category={category} onCreateBlank={() => setEditing(null)} onResult={report} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Todavía no hay servicios cargados.
          </p>
        )
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
          {optimistic.map((s) => (
            <li key={s.id} className={cn("flex items-center gap-3 px-4 py-3.5 sm:px-5", !s.isActive && "bg-inset/40")}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setEditing(s)}
                className="flex min-w-0 flex-1 flex-col gap-1 text-left disabled:cursor-default sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate font-medium", !s.isActive && "text-muted-foreground")}>{s.name}</span>
                    {!s.isActive && (
                      <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-[11px] text-muted-foreground">
                        Pausado
                      </span>
                    )}
                  </span>
                  {s.description && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{s.description}</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="rounded-md bg-raised px-2 py-0.5 font-mono text-xs text-secondary-foreground tabular">
                    {formatDuration(s.durationMinutes)}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm tabular sm:w-36 sm:text-right",
                      s.isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.priceType === "from" && <span className="text-xs text-muted-foreground">desde </span>}
                    {formatPYG(s.price)}
                  </span>
                </span>
              </button>

              {canEdit && (
                <>
                  <Switch
                    checked={s.isActive}
                    onCheckedChange={(checked) => toggle(s, checked)}
                    aria-label={s.isActive ? `Pausar ${s.name}` : `Activar ${s.name}`}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon" aria-label={`Opciones de ${s.name}`} />}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setEditing(s)}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicate(s)}>
                        <Copy /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setToDelete(s)}>
                        <Trash2 /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Panel de crear/editar: abajo en el celular, a la derecha en escritorio. */}
      <Sheet open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("gap-0 p-0", isMobile ? "max-h-[92dvh] rounded-t-2xl" : "w-full sm:max-w-md")}
        >
          <SheetHeader className="px-5 pt-5 pb-4">
            <SheetTitle className="text-lg">{editing ? "Editar servicio" : "Nuevo servicio"}</SheetTitle>
            <SheetDescription>
              {editing ? "Los cambios se ven al instante en tu página." : "Lo vas a poder editar cuando quieras."}
            </SheetDescription>
          </SheetHeader>
          {editing !== undefined && (
            <ServiceForm
              key={editing?.id ?? "new"}
              service={editing}
              onCancel={() => setEditing(undefined)}
              onDone={(message) => {
                setEditing(undefined);
                setNotice({ kind: "ok", text: message });
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      <DeleteDialog service={toDelete} onClose={() => setToDelete(null)} onResult={report} />
    </div>
  );
}

function DeleteDialog({
  service,
  onClose,
  onResult,
}: {
  service: Service | null;
  onClose: () => void;
  onResult: (r: ServiceActionResult) => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar “{service?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer. Si solo querés dejar de ofrecerlo por un tiempo, pausalo con el interruptor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!service) return;
                onResult(await deleteService(service.id));
                onClose();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TemplatesPicker({
  category,
  onCreateBlank,
  onResult,
}: {
  category: BusinessCategory;
  onCreateBlank: () => void;
  onResult: (r: ServiceActionResult) => void;
}) {
  const templates = SERVICE_TEMPLATES[category];
  const [selected, setSelected] = useState(() => new Set(templates.map((t) => t.key)));
  const [pending, startTransition] = useTransition();

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-line-strong p-5 sm:p-8">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-xl flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl border bg-card text-primary">
            <Tags className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Cargá tus servicios en segundos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Elegí los que hacés. Los precios son de ejemplo: los ajustás después.
            </p>
          </div>
        </div>

        <ul className="flex flex-col gap-1.5">
          {templates.map((t) => {
            const checked = selected.has(t.key);
            return (
              <li key={t.key}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                    "has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                    checked ? "border-primary/50 bg-primary-soft" : "bg-inset hover:border-line-strong",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(t.key)} />
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      checked ? "border-primary bg-primary text-primary-foreground" : "border-line-strong",
                    )}
                    aria-hidden="true"
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground tabular">{formatDuration(t.durationMinutes)}</span>
                  <span className="w-32 text-right font-mono text-xs whitespace-nowrap text-secondary-foreground tabular">
                    {t.priceType === "from" && "desde "}
                    {formatPYG(t.price)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          <button type="button" onClick={onCreateBlank} className="text-sm text-muted-foreground hover:text-foreground">
            O creá uno desde cero
          </button>
          <Button
            size="lg"
            disabled={pending || selected.size === 0}
            className="w-full sm:w-auto"
            onClick={() =>
              startTransition(async () => {
                onResult(await addServiceTemplates([...selected]));
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" /> : <Plus />}
            Agregar {selected.size} servicio{selected.size === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}
