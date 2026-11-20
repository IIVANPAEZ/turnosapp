import Link from "next/link";
import { Brand } from "@/components/layout/brand";

/** Layout de las pantallas de acceso: tarjeta centrada sobre fondo claro. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-10">
      <Link href="/" aria-label="Ir al inicio">
        <Brand tone="light" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
