"use client";

import type { FieldError as RHFFieldError, UseFormRegisterReturn } from "react-hook-form";
import { Briefcase, Sparkles, Stethoscope } from "lucide-react";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/lib/business/schemas";

const CATEGORY_ICONS = { beauty: Sparkles, health: Stethoscope, other: Briefcase } as const;

type CategoryPickerProps = {
  /** Valor actual (de useWatch) para marcar la tarjeta elegida. */
  value?: BusinessCategory;
  /** Resultado de register("category"). */
  inputProps: UseFormRegisterReturn;
  error?: RHFFieldError;
  disabled?: boolean;
};

/** Rubro del negocio como 3 tarjetas grandes (cómodas para tocar en el celular). */
export function CategoryPicker({ value, inputProps, error, disabled }: CategoryPickerProps) {
  return (
    <FieldSet data-invalid={!!error}>
      <FieldLegend variant="label">Rubro</FieldLegend>
      <div className="grid gap-2 sm:grid-cols-3">
        {BUSINESS_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          const selected = value === c.value;
          return (
            <label
              key={c.value}
              className={cn(
                "flex cursor-pointer flex-col gap-2.5 rounded-xl border bg-inset p-3.5 transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                "has-disabled:cursor-not-allowed has-disabled:opacity-60",
                selected ? "border-primary/70 bg-primary-soft" : "hover:border-line-strong hover:bg-card",
              )}
            >
              <input type="radio" value={c.value} className="sr-only" disabled={disabled} {...inputProps} />
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-raised text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{c.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <FieldError errors={[error]} />
    </FieldSet>
  );
}
