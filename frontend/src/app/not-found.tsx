import Link from "next/link";
import { SearchX } from "lucide-react";
import { APP_NAME } from "@/lib/config";

/** Página que no existe (por ejemplo, un link viejo del panel). */
export default function NotFound() {
  return (
    <main className="glow-ambar flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card text-faint">
          <SearchX className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">No encontramos esta página</h1>
        <p className="text-sm text-muted-foreground">Puede que el link esté mal escrito o que la página ya no exista.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir a mi panel
          </Link>
          <Link href="/" className="inline-flex h-10 items-center rounded-lg px-4 text-sm text-muted-foreground hover:text-foreground">
            {APP_NAME}
          </Link>
        </div>
      </div>
    </main>
  );
}
