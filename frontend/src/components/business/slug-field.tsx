"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PUBLIC_SITE_DOMAIN } from "@/lib/config";
import { checkSlugAvailability, type SlugAvailability } from "@/lib/business/actions";
import { slugProblem } from "@/lib/business/slug";

/**
 * Campo de la dirección pública (turnosapp.com/<slug>) con verificación en vivo.
 * Lo usan el onboarding y la configuración del negocio.
 */

export type SlugStatus = { status: "idle" } | { status: "checking" } | { status: "current" } | SlugAvailability;

/** Normaliza mientras se escribe: minúsculas, sin tildes ni espacios. */
export function normalizeSlugInput(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-");
}

/**
 * Consulta si el slug está libre 500 ms después de la última tecla.
 * currentSlug: la dirección actual del negocio (no se marca como "tomada").
 */
export function useSlugAvailability(slug: string, currentSlug?: string): SlugStatus {
  const [status, setStatus] = useState<SlugStatus>({ status: "idle" });
  const lastCheck = useRef(0);
  const isCurrent = !!currentSlug && slug === currentSlug;

  useEffect(() => {
    const id = ++lastCheck.current;
    if (isCurrent) return;
    const timer = setTimeout(async () => {
      if (!slug || slugProblem(slug)) {
        setStatus({ status: "idle" });
        return;
      }
      setStatus({ status: "checking" });
      const result = await checkSlugAvailability(slug);
      if (id === lastCheck.current) setStatus(result); // ignora respuestas viejas
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, isCurrent]);

  return isCurrent ? { status: "current" } : status;
}

/** Input con el prefijo del dominio. Recibe las props de register("slug"). */
export function SlugInput(props: React.ComponentProps<typeof Input>) {
  return (
    <div className="flex items-center rounded-lg border border-input bg-inset transition-colors hover:border-line-strong focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25">
      <span className="pl-3 font-mono text-[13px] text-faint select-none">{PUBLIC_SITE_DOMAIN}/</span>
      <Input
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="border-0 bg-transparent pl-0.5 font-mono text-[13px] hover:border-0 focus-visible:ring-0 md:text-[13px]"
        {...props}
      />
    </div>
  );
}

/** Mensaje debajo del campo según el estado de la verificación. */
export function SlugHint({
  status,
  slug,
  emptyHint = "Se completa sola con el nombre. Podés cambiarla.",
}: {
  status: SlugStatus;
  slug: string;
  emptyHint?: string;
}) {
  if (!slug) return <FieldDescription>{emptyHint}</FieldDescription>;

  const problem = slugProblem(slug);
  if (problem) return <FieldDescription className="text-destructive">{problem}</FieldDescription>;

  switch (status.status) {
    case "current":
      return <FieldDescription>Es tu dirección actual.</FieldDescription>;
    case "checking":
      return (
        <FieldDescription className="flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin" /> Verificando…
        </FieldDescription>
      );
    case "available":
      return (
        <FieldDescription className="flex items-center gap-1.5 text-success">
          <CircleCheck className="size-3.5" /> Disponible
        </FieldDescription>
      );
    case "taken":
      return (
        <FieldDescription className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="size-3.5" /> Ya está tomada, probá con otra
        </FieldDescription>
      );
    case "invalid":
      return <FieldDescription className="text-destructive">{status.message}</FieldDescription>;
    default:
      return (
        <FieldDescription>
          {PUBLIC_SITE_DOMAIN}/{slug}
        </FieldDescription>
      );
  }
}
