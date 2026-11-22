import { requireBusiness } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/business/members";
import { AccountMenu } from "./account-menu";

/**
 * Usuario actual en el header del panel (el negocio va en el sidebar).
 * También funciona como "guardia" del panel: requireBusiness() redirige a
 * /login (sin sesión) o a /onboarding (sin negocio).
 */
export async function HeaderAccount() {
  const { business, member } = await requireBusiness();

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3">
      <div className="hidden min-w-0 text-right sm:block">
        <p className="truncate text-[13px] font-medium leading-tight">{member.displayName}</p>
        <p className="truncate text-[11.5px] leading-tight text-muted-foreground">{ROLE_LABELS[member.role]}</p>
      </div>
      <AccountMenu
        name={member.displayName}
        roleLabel={ROLE_LABELS[member.role]}
        businessName={business.name}
        color={member.color}
      />
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
