import Link from "next/link";
import { SearchX } from "lucide-react";
import { APP_NAME } from "@/lib/config";

export default function PublicNotFound() {
  return (
    <main className="glow-ambar flex min-h-screen items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card text-faint">
          <SearchX className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">No encontramos esta página</h1>
        <p className="text-sm text-muted-foreground">
          Revisá que el link esté bien escrito, o pedíselo de nuevo al negocio.
        </p>
        <Link href="/" className="mt-2 text-sm text-faint hover:text-muted-foreground">
          {APP_NAME}
        </Link>
      </div>
    </main>
  );
}
