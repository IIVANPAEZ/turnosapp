"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { dashboardNav, findActiveItem } from "@/lib/navigation";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const active = findActiveItem(usePathname());

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
      {dashboardNav.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-2.5 text-[10.5px] font-medium tracking-[0.12em] text-faint uppercase">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = active?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                    isActive
                      ? "bg-raised font-medium text-foreground"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-4.25", isActive ? "text-primary" : "text-faint group-hover:text-muted-foreground")}
                    strokeWidth={isActive ? 2.1 : 1.7}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
