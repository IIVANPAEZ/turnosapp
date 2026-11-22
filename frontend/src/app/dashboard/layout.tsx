import type { Metadata } from "next";
import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { HeaderAccount, HeaderAccountSkeleton } from "@/components/layout/header-account";
import { BottomNav } from "@/components/layout/bottom-nav";

// App instalable: el manifiesto se enlaza solo en el panel y en el acceso (no en la página pública).
export const metadata: Metadata = { manifest: "/app.webmanifest" };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // h-dvh: alto real de la pantalla del celular (sin la barra del navegador).
  return (
    <div className="flex h-dvh overflow-hidden">
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
        <main className="flex-1 overflow-y-auto py-6 pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] md:py-8 md:pr-8 md:pl-8">
          {children}
        </main>
        {/* Celular: barra de secciones abajo (el contenido termina arriba de ella). */}
        <BottomNav />
      </div>
    </div>
  );
}
