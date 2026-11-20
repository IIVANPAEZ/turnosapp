import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { HeaderAccount, HeaderAccountSkeleton } from "@/components/layout/header-account";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          account={
            // Lee sesión y negocio (y redirige si faltan): va dentro de Suspense
            // para que el resto del panel se muestre sin esperar.
            <Suspense fallback={<HeaderAccountSkeleton />}>
              <HeaderAccount />
            </Suspense>
          }
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
