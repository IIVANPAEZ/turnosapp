import type { Metadata } from "next";
import { Suspense } from "react";
import { requireBusiness } from "@/lib/auth/dal";
import { getClients } from "@/lib/clients/data";
import { getServices } from "@/lib/services/data";
import { todayYMD } from "@/lib/time/zone";
import { ClientsScreen } from "./clients-screen";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientsPage({ searchParams }: PageProps<"/dashboard/clientes">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Lee sesión y negocio: con cacheComponents va dentro de Suspense. */}
      <Suspense fallback={<ClientsSkeleton />}>
        <ClientsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClientsContent({ searchParams }: Pick<PageProps<"/dashboard/clientes">, "searchParams">) {
  const [{ business, member }, params, clients, services] = await Promise.all([
    requireBusiness(),
    searchParams,
    getClients(),
    getServices(),
  ]);
  const openId = typeof params.cliente === "string" ? params.cliente : null;

  return (
    <ClientsScreen
      clients={clients}
      initialOpenId={openId}
      today={todayYMD(business.timezone)}
      seesEveryone={member.role === "owner" || member.role === "admin"}
      services={services
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, price: s.price, priceType: s.priceType }))}
    />
  );
}

function ClientsSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-36 rounded bg-raised" />
        <div className="h-4 w-64 rounded bg-raised/60" />
      </div>
      <div className="h-10 rounded-lg bg-inset" />
      <div className="h-96 rounded-xl bg-card" />
    </div>
  );
}
