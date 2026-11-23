"use client";

import { WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

/**
 * Aviso "Sin conexión". Next reintenta solo las navegaciones y las acciones
 * (guardar, confirmar, cobrar…) cuando vuelve la señal (experimental.useOffline).
 * No guardamos datos en el celular, para no mostrar una agenda vieja.
 */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] md:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2.5 rounded-xl bg-warning px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-[0_12px_32px_-12px_var(--shadow-strong)]"
    >
      <WifiOff className="size-4 shrink-0" />
      Sin conexión. Lo que hagas se envía solo cuando vuelva la señal.
    </div>
  );
}
