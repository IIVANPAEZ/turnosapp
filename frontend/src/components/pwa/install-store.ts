"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado de "instalar la app", compartido por la tarjeta de Inicio y el menú
 * de la cuenta. El navegador avisa una sola vez por carga (beforeinstallprompt),
 * así que se escucha apenas se carga este módulo y se guarda el aviso.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallState = {
  /** Ya abierta como app instalada. */
  standalone: boolean;
  /** iPhone/iPad: se instala a mano (Compartir → Agregar a inicio). */
  ios: boolean;
  /** El navegador ofrece instalarla con un botón. */
  canPrompt: boolean;
  /** Se instaló en esta visita. */
  installed: boolean;
};

let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

let cache: InstallState | null = null;
let cacheKey = "";
function snapshot(): InstallState {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const key = `${standalone}${ios}${!!deferred}${installed}`;
  if (key !== cacheKey || !cache) {
    cacheKey = key;
    cache = { standalone, ios, canPrompt: !!deferred, installed };
  }
  return cache;
}
// En el servidor se asume "instalada": no se muestra nada hasta conocer el navegador.
const SERVER: InstallState = { standalone: true, ios: false, canPrompt: false, installed: false };

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstall(): InstallState {
  return useSyncExternalStore(subscribe, snapshot, () => SERVER);
}

/** ¿Tiene sentido ofrecer instalarla? */
export const canOfferInstall = (s: InstallState) => !s.standalone && !s.installed && (s.canPrompt || s.ios);

/** Abre el instalador del navegador. Devuelve true si la instaló. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  if (outcome === "accepted") installed = true;
  emit();
  return outcome === "accepted";
}

// "Ahora no" en la tarjeta de Inicio: la esconde 30 días (el menú de la cuenta la sigue ofreciendo).
const DISMISS_KEY = "turnosapp:install-dismissed";
const DISMISS_DAYS = 30;

export function isInstallCardDismissed(): boolean {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY));
    return !!value && Date.now() - value < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissInstallCard() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Sin almacenamiento: solo se oculta por ahora.
  }
}
