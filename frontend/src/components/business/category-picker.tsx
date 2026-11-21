"use client";

import type { FieldError as RHFFieldError, UseFormRegisterReturn } from "react-hook-form";
import {
  Briefcase,
  Car,
  Dumbbell,
  GraduationCap,
  Paintbrush,
  PawPrint,
  Shapes,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@/lib/business/schemas";

const CATEGORY_ICONS: Record<BusinessCategory, LucideIcon> = {
  beauty: Sparkles,
  health: Stethoscope,
  wellness: Dumbbell,
  education: GraduationCap,
  professional: Briefcase,
  pets: PawPrint,
  automotive: Car,
  tattoo: Paintbrush,
  other: Shapes,
};

type CategoryPickerProps = {
  /** Valor actual (de useWatch) para marcar la tarjeta elegida. */
  value?: BusinessCategory;
  /** Resultado de register("category"). */
  inputProps: UseFormRegisterReturn;
  error?: RHFFieldError;
  disabled?: boolean;
};

/**
 * Rubro del negocio como tarjetas compactas (ícono + nombre + ejemplos).
 * Las columnas se adaptan al ancho disponible (container queries): 1 · 2 · 3.
 */
export function CategoryPicker({ value, inputProps, error, disabled }: CategoryPickerProps) {
  return (
    <FieldSet data-invalid={!!error} className="@container">
      <FieldLegend variant="label">Rubro</FieldLegend>
      <div className="grid gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
        {BUSINESS_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICONS[c.value];
          const selected = value === c.value;
          return (
            <label
              key={c.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border bg-inset p-3 transition-colors",
                "has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                "has-disabled:cursor-not-allowed has-disabled:opacity-60",
                selected ? "border-primary/70 bg-primary-soft" : "hover:border-line-strong hover:bg-card",
              )}
            >
              <input type="radio" value={c.value} className="sr-only" disabled={disabled} {...inputProps} />
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                  selected ? "bg-primary text-primary-foreground" : "bg-raised text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{c.label}</span>
                <span className="block text-xs leading-snug text-muted-foreground">{c.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <FieldError errors={[error]} />
    </FieldSet>
  );
}
