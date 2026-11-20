"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copia un texto al portapapeles y confirma con un tilde por 2 segundos. */
export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: no hacemos nada.
    }
  };

  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? "Copiado" : label}
    </Button>
  );
}
