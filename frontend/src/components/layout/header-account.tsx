import { requireBusiness } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/business/members";

/**
 * Usuario actual en el header del panel (el negocio va en el sidebar).
 * También funciona como "guardia" del panel: requireBusiness() redirige a
 * /login (sin sesión) o a /onboarding (sin negocio).
 */
export async function HeaderAccount() {
  const { business, member } = await requireBusiness();
  const initial = member.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-[13px] font-medium leading-tight">{member.displayName}</p>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{ROLE_LABELS[member.role]}</p>
      </div>
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-background outline outline-line-strong"
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
    <div className="flex animate-pulse items-center gap-3" aria-hidden="true">
      <div className="hidden flex-col items-end gap-1.5 sm:flex">
        <div className="h-3 w-24 rounded bg-raised" />
        <div className="h-2.5 w-14 rounded bg-card" />
      </div>
      <div className="size-9 rounded-full bg-raised" />
    </div>
  );
}
