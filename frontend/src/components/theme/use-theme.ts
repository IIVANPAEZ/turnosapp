"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

/** Elección de tema en este dispositivo. "auto" = sigue al sistema. */
export type ThemePref = "claro" | "oscuro" | "auto";

const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "claro" || v === "oscuro" ? v : "auto";
  } catch {
    return "auto";
  }
}

/** Guarda la elección y aplica el tema al instante (mismo código que el script del <head>). */
export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "auto") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Sin almacenamiento: se aplica solo por esta visita.
  }
  (window as Window & { __turnosappTheme?: () => void }).__turnosappTheme?.();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña cambió el tema.
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY) {
      (window as Window & { __turnosappTheme?: () => void }).__turnosappTheme?.();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, read, () => "auto");
}
