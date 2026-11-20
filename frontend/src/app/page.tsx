import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandHero } from "@/components/brand-hero";
import { Button } from "@/components/ui/button";

// Landing provisoria: marca + accesos. La página de marketing real se hace más adelante.
export default function Home() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandHero className="border-b lg:border-r lg:border-b-0" />
      <div className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empezá gratis</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Configurás tu negocio en 2 minutos y compartís tu link de reservas.
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button render={<Link href="/registro" />} nativeButton={false} size="lg" className="h-11 text-[15px]">
              Crear cuenta gratis <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="lg"
              variant="outline"
              className="h-11 text-[15px]"
            >
              Ya tengo cuenta
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
