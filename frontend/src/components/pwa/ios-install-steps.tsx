import { Share, SquarePlus } from "lucide-react";

/** Cómo instalarla en iPhone (Safari no tiene botón de instalar). */
export function IosInstallSteps() {
  return (
    <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-xs">1</span>
        Tocá <Share className="size-4 text-foreground" aria-hidden="true" /> <span className="text-foreground">Compartir</span> abajo
        en Safari.
      </li>
      <li className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-xs">2</span>
        Elegí <SquarePlus className="size-4 text-foreground" aria-hidden="true" />{" "}
        <span className="text-foreground">“Agregar a inicio”</span>.
      </li>
    </ol>
  );
}
