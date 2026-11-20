import { BrandHero } from "@/components/brand-hero";

/**
 * Layout de las pantallas de acceso: panel de marca + formulario.
 * Celular: marca arriba, formulario abajo. Escritorio: lado a lado.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <BrandHero className="border-b lg:border-r lg:border-b-0" />
      <div className="flex items-start justify-center px-6 py-10 sm:px-10 lg:items-center lg:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
