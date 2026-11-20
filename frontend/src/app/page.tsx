import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

// Landing provisoria. La página de marketing real se hace más adelante.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{APP_NAME}</h1>
      <p className="max-w-md text-muted-foreground">
        Organizá tus turnos, servicios, clientes e ingresos desde un solo lugar.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
        <Button render={<Link href="/registro" />} nativeButton={false} size="lg">
          Crear cuenta gratis
        </Button>
        <Button render={<Link href="/login" />} nativeButton={false} size="lg" variant="outline">
          Ingresar
        </Button>
      </div>
    </main>
  );
}
