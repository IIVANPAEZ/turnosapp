import type { Metadata } from "next";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBusinessMembers, requireBusiness } from "@/lib/auth/dal";
import { MemberCard } from "./member-card";

export const metadata: Metadata = { title: "Profesionales" };

export default function ProfessionalsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Equipo</h2>
          <p className="text-sm text-muted-foreground">
            Las personas que atienden en tu negocio y reciben turnos.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button variant="outline" disabled>
            <UserPlus /> Agregar profesional
          </Button>
          <span className="text-xs text-muted-foreground">Próximamente</span>
        </div>
      </div>

      {/* Lee sesión y datos del negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<MembersSkeleton />}>
        <MembersList />
      </Suspense>
    </div>
  );
}

async function MembersList() {
  const [{ user, member: me }, members] = await Promise.all([requireBusiness(), getBusinessMembers()]);
  const isManager = me.role === "owner" || me.role === "admin";

  return (
    <div className="flex flex-col gap-3">
      {members.map((m) => (
        <MemberCard
          key={m.id}
          member={m}
          isMe={m.userId === user.id}
          canEdit={isManager || m.userId === user.id}
        />
      ))}
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]" aria-busy="true">
      <div className="size-12 rounded-full bg-raised" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-40 rounded bg-raised" />
        <div className="h-3 w-24 rounded bg-raised/60" />
      </div>
    </div>
  );
}
