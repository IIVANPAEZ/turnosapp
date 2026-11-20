"use client";

import { formatThousands } from "@/lib/format";
import { PRICE_MAX } from "@/lib/services/schemas";

type PriceInputProps = {
  id?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  invalid?: boolean;
};

/** Precio en guaraníes con "₲" adelante y puntos de miles mientras se escribe. */
export function PriceInput({ id, value, onChange, onBlur, invalid }: PriceInputProps) {
  return (
    <div
      className="flex h-10 items-center rounded-lg border border-input bg-inset transition-colors hover:border-line-strong focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25 aria-invalid:border-destructive/60"
      aria-invalid={invalid}
    >
      <span className="pl-3 font-mono text-sm text-faint select-none">₲</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-invalid={invalid}
        className="h-full w-full min-w-0 bg-transparent px-2 font-mono text-base tabular outline-none placeholder:text-faint md:text-sm"
        value={value === undefined ? "" : formatThousands(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          if (digits === "") return onChange(undefined);
          onChange(Math.min(Number(digits), PRICE_MAX));
        }}
        onBlur={onBlur}
      />
    </div>
  );
}
