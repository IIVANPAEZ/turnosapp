import { requireBusiness } from "@/lib/auth/dal";

/**
 * Negocio y usuario actuales en el header del panel.
 * También funciona como "guardia" del panel: requireBusiness() redirige a
 * /login (sin sesión) o a /onboarding (sin negocio).
 */
export async function HeaderAccount() {
  const { business, member } = await requireBusiness();
  const initial = member.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-[13px] font-medium leading-tight">{business.name}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{member.displayName}</p>
      </div>
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        style={{ backgroundColor: member.color }}
        title={`${member.displayName} · ${business.name}`}
        aria-hidden="true"
      >
        {initial}
      </div>
    </div>
  );
}

export function HeaderAccountSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-2.5" aria-hidden="true">
      <div className="hidden flex-col items-end gap-1 sm:flex">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-2.5 w-16 rounded bg-slate-100" />
      </div>
      <div className="size-8 rounded-full bg-slate-200" />
    </div>
  );
}
