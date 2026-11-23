"use client";

import { useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { canOfferInstall, dismissInstallCard, isInstallCardDismissed, promptInstall, useInstall } from "./install-store";
import { IosInstallSteps } from "./ios-install-steps";

/**
 * Inicio → "Instalá TurnoPy": botón del navegador en Android y computadora;
 * en iPhone, cómo agregarla desde Compartir. No aparece si ya está instalada.
 * "Ahora no" la esconde 30 días (sigue disponible en el menú de la cuenta).
 */
export function InstallApp() {
  const state = useInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canOfferInstall(state) || dismissed || isInstallCardDismissed()) return null;

  return (
    <section className="relative flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.07] sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-start gap-4 sm:flex-1 sm:items-center">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Smartphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1 pr-6 sm:pr-0">
          <h3 className="text-sm font-medium">Instalá {APP_NAME} en tu celular</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Se abre como una app, desde tu pantalla de inicio.</p>
        </div>
      </div>
      {state.ios && !state.canPrompt ? (
        <div className="pl-14 sm:pl-0">
          <IosInstallSteps />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="ml-14 inline-flex h-9 w-fit shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:ml-0"
        >
          <Download className="size-4" /> Instalar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          dismissInstallCard();
          setDismissed(true);
        }}
        aria-label="Ahora no"
        title="Ahora no (sigue en el menú de tu cuenta)"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-faint transition-colors hover:text-foreground sm:static"
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
