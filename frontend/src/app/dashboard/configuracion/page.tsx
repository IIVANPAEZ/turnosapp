import type { Metadata } from "next";
import { Suspense } from "react";
import { getBusinessSettings, requireBusiness } from "@/lib/auth/dal";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Configuración" };

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Tu negocio</h2>
        <p className="text-sm text-muted-foreground">
          Datos de tu negocio y de tu página de reservas. Los cambios se ven al instante.
        </p>
      </div>

      {/* Lee sesión y negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const [{ member }, business] = await Promise.all([requireBusiness(), getBusinessSettings()]);
  if (!business) return null; // requireBusiness ya redirige si no hay negocio

  const canEdit = member.role === "owner" || member.role === "admin";
  // key: si el negocio cambia en el servidor, el formulario arranca de nuevo con esos datos.
  return <SettingsForm key={business.id} business={business} canEdit={canEdit} />;
}

function SettingsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-10" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-4 lg:grid-cols-[15rem_1fr] lg:gap-10">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 rounded bg-raised" />
            <div className="h-3 w-44 rounded bg-raised/60" />
          </div>
          <div className="h-48 rounded-xl bg-card" />
        </div>
      ))}
    </div>
  );
}
