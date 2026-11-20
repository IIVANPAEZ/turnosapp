"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import { DURATION_MAX, DURATION_MIN, DURATION_PRESETS } from "@/lib/services/schemas";

type DurationPickerProps = {
  value: number | undefined;
  onChange: (minutes: number) => void;
  invalid?: boolean;
  id?: string;
};

/** Etiqueta corta para los botones: 15 min · 1 h · 1 h 30 · 2 h */
function presetLabel(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60}` : `${h} h`;
}

/** Duración en minutos: botones rápidos + "Otra" con −5 / +5. */
export function DurationPicker({ value, onChange, invalid, id }: DurationPickerProps) {
  const isPreset = value !== undefined && (DURATION_PRESETS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(value !== undefined && !isPreset);
  const current = value ?? 60;

  const step = (delta: number) =>
    onChange(Math.min(DURATION_MAX, Math.max(DURATION_MIN, current + delta)));

  return (
    <div className="flex flex-col gap-2.5" id={id}>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Duración">
        {DURATION_PRESETS.map((m) => {
          const selected = !custom && value === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setCustom(false);
                onChange(m);
              }}
              className={cn(
                "h-9 rounded-lg border font-mono text-[13px] transition-colors tabular",
                selected
                  ? "border-primary/70 bg-primary-soft text-primary"
                  : "bg-inset text-muted-foreground hover:border-line-strong hover:text-foreground",
                invalid && !selected && "border-destructive/50",
              )}
            >
              {presetLabel(m)}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => setCustom(true)}
          className={cn(
            "h-9 rounded-lg border text-[13px] transition-colors",
            custom
              ? "border-primary/70 bg-primary-soft text-primary"
              : "bg-inset text-muted-foreground hover:border-line-strong hover:text-foreground",
          )}
        >
          Otra
        </button>
      </div>

      {custom && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => step(-5)} aria-label="Restar 5 minutos">
            <Minus />
          </Button>
          <div className="flex h-9 min-w-32 flex-1 items-center justify-center rounded-lg border bg-inset font-mono text-sm tabular">
            {formatDuration(current)}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => step(5)} aria-label="Sumar 5 minutos">
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
}
