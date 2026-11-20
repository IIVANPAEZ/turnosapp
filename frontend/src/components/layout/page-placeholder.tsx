"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { findActiveItem } from "@/lib/navigation";

/** Página temporal para los módulos que todavía no se implementaron. */
export function PagePlaceholder({ sprint, description }: { sprint: string; description: string }) {
  const item = findActiveItem(usePathname());
  const Icon = item?.icon ?? Sparkles;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-line-strong px-6 py-16 text-center sm:py-20">
        <div
          className="pointer-events-none absolute top-0 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl border bg-card text-primary shadow-[0_8px_30px_-12px_rgb(242_169_59/0.5)]">
            <Icon className="size-6" strokeWidth={1.8} />
          </div>
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            {sprint.startsWith("Sprint") ? `Llega en el ${sprint}` : "Llega después del MVP"}
          </span>
          <h2 className="text-xl font-semibold tracking-tight">{item?.label ?? "Próximamente"}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
