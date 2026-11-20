import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { slugProblem } from "./slug";

type BusinessCategory = Database["public"]["Enums"]["business_category"];

/** Rubros en el orden y con los textos que ve el usuario. */
export const BUSINESS_CATEGORIES = [
  { value: "beauty", label: "Belleza", hint: "Peluquería, uñas, estética, barbería" },
  { value: "health", label: "Salud", hint: "Odontología, kinesiología, nutrición" },
  { value: "other", label: "Otro", hint: "Cualquier servicio con turnos" },
] as const satisfies ReadonlyArray<{ value: BusinessCategory; label: string; hint: string }>;

const categoryValues = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategory, ...BusinessCategory[]];

const optionalText = (max: number) =>
  z.string().trim().max(max, { error: `Máximo ${max} caracteres` });

export const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Ingresá el nombre del negocio" })
    .max(80, { error: "Máximo 80 caracteres" }),
  category: z.enum(categoryValues, { error: "Elegí un rubro" }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .superRefine((value, ctx) => {
      const problem = slugProblem(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
  whatsapp: optionalText(30).regex(/^[0-9+\s()-]*$/, {
    error: "Solo números, espacios y + ( ) -",
  }),
  city: optionalText(80),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
