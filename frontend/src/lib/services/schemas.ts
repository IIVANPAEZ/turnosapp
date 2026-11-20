import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

// Reglas iguales a las de la tabla public.services (migración 20261120231942_services.sql).

export type PriceType = Database["public"]["Enums"]["price_type"];

export const SERVICE_DESCRIPTION_MAX = 300;
export const DURATION_MIN = 5;
export const DURATION_MAX = 480;
export const PRICE_MAX = 100_000_000;
export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Ingresá el nombre del servicio" })
    .max(80, { error: "Máximo 80 caracteres" }),
  description: z
    .string()
    .trim()
    .max(SERVICE_DESCRIPTION_MAX, { error: `Máximo ${SERVICE_DESCRIPTION_MAX} caracteres` }),
  durationMinutes: z
    .number({ error: "Ingresá la duración" })
    .int()
    .min(DURATION_MIN, { error: `Mínimo ${DURATION_MIN} minutos` })
    .max(DURATION_MAX, { error: "Máximo 8 horas" })
    .refine((v) => v % 5 === 0, { error: "Usá múltiplos de 5 minutos" }),
  price: z
    .number({ error: "Ingresá el precio" })
    .int({ error: "Sin decimales" })
    .min(0, { error: "El precio no puede ser negativo" })
    .max(PRICE_MAX, { error: "Precio demasiado alto" }),
  priceType: z.enum(["fixed", "from"]),
  isActive: z.boolean(),
});

export type ServiceInput = z.input<typeof serviceSchema>;
