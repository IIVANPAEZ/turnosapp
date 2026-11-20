import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBusiness } from "@/lib/auth/dal";
import { getServices } from "@/lib/services/data";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Servicios" };

export default function ServicesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Lee sesión y datos del negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<ServicesSkeleton />}>
        <ServicesContent />
      </Suspense>
    </div>
  );
}

async function ServicesContent() {
  const [{ business, member }, services] = await Promise.all([requireBusiness(), getServices()]);
  const canEdit = member.role === "owner" || member.role === "admin";
  return <ServicesManager services={services} category={business.category} canEdit={canEdit} />;
}

function ServicesSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4" aria-busy="true">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-36 rounded bg-raised" />
          <div className="h-3.5 w-56 rounded bg-raised/60" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-raised" />
      </div>
      <div className="divide-y overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.07]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-4 flex-1 rounded bg-raised" />
            <div className="h-5 w-14 rounded bg-raised" />
            <div className="h-4 w-24 rounded bg-raised" />
            <div className="h-5 w-8 rounded-full bg-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
