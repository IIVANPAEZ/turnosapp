"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

/** Evento del navegador (Chrome/Edge/Android) para ofrecer la instalación. */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "turnosapp:install-dismissed";

function readEnv() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Sin almacenamiento: se muestra igual.
  }
  return `${standalone ? 1 : 0}${ios ? 1 : 0}${dismissed ? 1 : 0}`;
}
const noop = () => () => {};

/**
 * Inicio → "Instalá la app": botón del navegador en Android y computadora;
 * en iPhone, cómo agregarla desde Compartir. No aparece si ya está instalada.
 */
export function InstallApp() {
  // En el servidor se asume "instalada" ("100"): no se muestra nada hasta conocer el navegador.
  const env = useSyncExternalStore(noop, readEnv, () => "100");
  const [standalone, ios] = [env[0] === "1", env[1] === "1"];
  const [dismissed, setDismissed] = useState(false);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || installed || dismissed || env[2] === "1") return null;
  if (!prompt && !ios) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sin almacenamiento: solo se oculta por ahora.
    }
  };

  return (
    <section className="relative flex items-start gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.07] sm:items-center">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Smartphone className="size-5" />
      </div>
      <div className="min-w-0 flex-1 pr-6 sm:pr-0">
        <h3 className="text-sm font-medium">Instalá TurnosApp en tu celular</h3>
        {ios ? (
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tocá <Share className="mb-0.5 inline size-4" aria-label="Compartir" /> <span className="text-foreground">Compartir</span> y
            después <span className="text-foreground">“Agregar a inicio”</span>. Se abre como una app, sin la barra del navegador.
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">Se abre como una app, desde tu pantalla de inicio.</p>
        )}
      </div>
      {prompt && (
        <button
          type="button"
          onClick={async () => {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Download className="size-4" /> Instalar
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ahora no"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:text-foreground sm:static sm:self-center"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
