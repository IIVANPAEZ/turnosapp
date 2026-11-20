import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

// Landing provisoria. Se reemplaza cuando exista registro/login (Sprint 1).
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{APP_NAME}</h1>
      <p className="max-w-md text-muted-foreground">
        Organizá tus turnos, servicios, clientes e ingresos desde un solo lugar.
      </p>
      <Button render={<Link href="/dashboard" />} nativeButton={false} size="lg">
        Ir al panel
      </Button>
    </main>
  );
}
