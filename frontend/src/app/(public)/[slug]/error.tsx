"use client"; // Las pantallas de error tienen que ser componentes de cliente.

import { RotateCcw, TriangleAlert } from "lucide-react";

/** Página pública: si no se pudieron traer los datos (conexión), ofrecer reintentar. */
export default function PublicError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="glow-ambar flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
          <TriangleAlert className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="text-sm text-muted-foreground">No pudimos cargar la página de reservas. Revisá tu conexión y probá de nuevo.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" /> Reintentar
        </button>
      </div>
    </main>
  );
}
