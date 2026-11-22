"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/actions";
import { dashboardNav, findActiveItem } from "@/lib/navigation";

/** Las 4 secciones del día a día van en la barra; el resto, en "Más". */
const MAIN = dashboardNav[0].items;
const MORE = dashboardNav.slice(1);

/**
 * Barra fija abajo en el celular (como una app): Inicio · Agenda · Clientes ·
 * Ingresos · Más. Respeta la barra de inicio del iPhone (safe-area).
 */
export function BottomNav() {
  const active = findActiveItem(usePathname());
  const [open, setOpen] = useState(false);
  const moreActive = !!active && !MAIN.some((i) => i.href === active.href);

  const tab = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] transition-colors";

  return (
    <>
      <nav
        aria-label="Secciones"
        className="shrink-0 border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="flex h-16 items-stretch px-1">
          {MAIN.map((item) => {
            const Icon = item.icon;
            const isActive = active?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(tab, isActive ? "font-medium text-foreground" : "text-muted-foreground")}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary-soft",
                  )}
                >
                  <Icon className={cn("size-5", isActive ? "text-primary" : "text-faint")} strokeWidth={isActive ? 2.1 : 1.7} />
                </span>
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className={cn(tab, moreActive ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            <span
              className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", moreActive && "bg-primary-soft")}
            >
              <MoreHorizontal className={cn("size-5", moreActive ? "text-primary" : "text-faint")} />
            </span>
            Más
          </button>
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-0 rounded-t-2xl p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Más secciones</SheetTitle>
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          <div className="flex flex-col gap-4 px-3 pt-3 pb-2">
            {MORE.map((section) => (
              <div key={section.label}>
                <p className="mb-1 px-3 text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">{section.label}</p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active?.href === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                        isActive ? "bg-raised font-medium" : "text-secondary-foreground active:bg-raised",
                      )}
                    >
                      <Icon className={cn("size-5", isActive ? "text-primary" : "text-faint")} strokeWidth={1.8} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-12 items-center gap-3 rounded-xl border-t px-3 text-[15px] text-muted-foreground active:bg-raised"
            >
              <LogOut className="size-5 text-faint" strokeWidth={1.8} /> Cerrar sesión
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
