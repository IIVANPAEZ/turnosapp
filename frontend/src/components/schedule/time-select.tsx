"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TIME_OPTIONS } from "@/lib/schedule/constants";

type TimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Selector de hora cada 15 minutos. Usa el <select> nativo a propósito:
 * en el celular abre la ruedita del sistema, que es lo más cómodo para elegir horas.
 */
export function TimeSelect({ value, onChange, invalid, disabled, className, ...aria }: TimeSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={aria["aria-label"]}
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-lg border border-input bg-inset pr-7 pl-2.5 font-mono text-sm tabular transition-colors outline-none",
          "hover:border-line-strong focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-destructive/60",
        )}
      >
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t} className="bg-popover">
            {t}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-faint" />
    </div>
  );
}
