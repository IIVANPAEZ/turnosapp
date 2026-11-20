import { Suspense } from "react";
import { getCurrentBusiness } from "@/lib/auth/dal";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";
import { SignOutButton } from "./sign-out-button";

/** Sidebar fija para pantallas medianas en adelante. Mismo fondo que el contenido. */
export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="px-4 pt-5 pb-4">
        <Brand
          subtitle={
            <Suspense fallback={<span className="inline-block h-2.5 w-20 animate-pulse rounded bg-raised" />}>
              <BusinessName />
            </Suspense>
          }
        />
      </div>
      <SidebarNav />
      <SignOutButton />
    </aside>
  );
}

async function BusinessName() {
  const current = await getCurrentBusiness();
  return <>{current?.business.name ?? "Gestión de turnos"}</>;
}
