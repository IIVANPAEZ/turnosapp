"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Globe, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { markBookingLinkShared } from "@/lib/business/actions";

type BookingLinkCardProps = {
  businessName: string;
  slug: string;
  /** Lo que se muestra: "turnopy.com/mi-negocio" */
  displayUrl: string;
  status: { tone: "live" | "paused" | "setup"; text: string };
  shared: boolean;
};

/** Inicio → "Tu página de reservas": ver, copiar y compartir el link. */
export function BookingLinkCard({ businessName, slug, displayUrl, status, shared }: BookingLinkCardProps) {
  const [copied, setCopied] = useState(false);

  // El link real sale del dominio donde está abierta la app (en producción es el mismo que se muestra).
  const realUrl = () => `${window.location.origin}/${slug}`;
  const markShared = () => {
    if (!shared) void markBookingLinkShared();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(realUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      markShared();
    } catch {
      // Sin permiso de portapapeles: no hacemos nada.
    }
  };

  const share = () => {
    const text = `¡Ya podés reservar tu turno en ${businessName}! Elegí el día y el horario acá 👉 ${realUrl()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    markShared();
  };

  return (
    <section id="tu-pagina" className="relative scroll-mt-6 overflow-hidden rounded-xl bg-card p-5 ring-1 ring-foreground/[0.07]">
      <div className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Globe className="size-5" />
          </div>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              status.tone === "live" && "bg-success-soft text-success",
              status.tone === "paused" && "bg-warning-soft text-warning",
              status.tone === "setup" && "bg-raised text-muted-foreground",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {status.tone === "live" ? "Activa" : status.tone === "paused" ? "Pausada" : "Falta configurar"}
          </span>
        </div>

        <div>
          <h3 className="font-medium">Tu página de reservas</h3>
          <p className="mt-1 text-sm text-muted-foreground">{status.text}</p>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg border bg-inset py-1.5 pr-1.5 pl-3">
          <span className="truncate font-mono text-[13px]">{displayUrl}</span>
          <button
            type="button"
            onClick={copy}
            aria-live="polite"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-raised px-2.5 text-xs font-medium transition-colors hover:bg-[color-mix(in_oklab,var(--raised),white_6%)]"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/${slug}`}
            target="_blank"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors hover:border-line-strong"
          >
            <ExternalLink className="size-4" /> Ver mi página
          </Link>
          <button
            type="button"
            onClick={share}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-success/30 bg-success-soft text-sm font-medium text-success transition-colors hover:bg-success/20"
          >
            <MessageCircle className="size-4" /> Compartir
          </button>
        </div>
      </div>
    </section>
  );
}
