"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { findActiveItem } from "@/lib/navigation";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/config";
import { CalendarCheck } from "lucide-react";

function formatToday() {
  return new Date().toLocaleDateString(DEFAULT_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: DEFAULT_TIMEZONE,
  });
}

const noopSubscribe = () => () => {};

type AppHeaderProps = {
  /** Bloque de cuenta (negocio + usuario). Viene del servidor ya envuelto en Suspense. */
  account?: React.ReactNode;
};

export function AppHeader({ account }: AppHeaderProps) {
  const title = findActiveItem(usePathname())?.label ?? "";
  // La fecha solo se calcula en el navegador: la página se prerenderiza en el build
  // y en el servidor quedaría la fecha de ese momento.
  const today = useSyncExternalStore(noopSubscribe, formatToday, () => "");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {/* Celular: el logo (la navegación está en la barra de abajo). */}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden" aria-hidden="true">
          <CalendarCheck className="size-4" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">{title}</h1>
          <p className="h-4 text-xs leading-4 first-letter:uppercase text-muted-foreground">{today}</p>
        </div>
      </div>
      {account}
    </header>
  );
}
