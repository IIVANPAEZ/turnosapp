"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { findActiveItem } from "@/lib/navigation";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/config";
import { MobileNav } from "./mobile-nav";

function formatToday() {
  return new Date().toLocaleDateString(DEFAULT_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIMEZONE,
  });
}

const noopSubscribe = () => () => {};

export function AppHeader() {
  const title = findActiveItem(usePathname())?.label ?? "";
  // La fecha solo se calcula en el navegador: la página se prerenderiza en el build
  // y en el servidor quedaría la fecha de ese momento.
  const today = useSyncExternalStore(noopSubscribe, formatToday, () => "");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-white px-4 md:px-8">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <p className="hidden text-[13px] capitalize text-muted-foreground sm:block">{today}</p>
    </header>
  );
}
