"use client"; // Las pantallas de error tienen que ser componentes de cliente.

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error inesperado en una pantalla del panel: mensaje amable en lugar de la
 * pantalla técnica. El menú y la barra de abajo siguen funcionando (el layout
 * no se reemplaza). Next 16: "retry" vuelve a pedir y dibujar la pantalla.
 */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[panel]", error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as Error & { digest?: string }).digest ?? "") : "";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-warning-soft text-warning">
        <TriangleAlert className="size-5" />
      </div>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Algo salió mal</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No pudimos mostrar esta pantalla. Puede ser la conexión: probá de nuevo en un momento.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => retry()}>
          <RotateCcw /> Reintentar
        </Button>
        <Button variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>
          Ir al inicio
        </Button>
      </div>
      {digest && <p className="font-mono text-[11px] text-faint">Código: {digest}</p>}
    </div>
  );
}
