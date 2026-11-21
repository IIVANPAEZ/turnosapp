import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { slugProblem } from "./slug";

export type BusinessCategory = Database["public"]["Enums"]["business_category"];

/** Rubros en el orden y con los textos que ve el usuario. */
export const BUSINESS_CATEGORIES = [
  { value: "beauty", label: "Belleza y estética", hint: "Peluquería, barbería, uñas, estética" },
  { value: "health", label: "Salud", hint: "Odontología, kinesiología, nutrición" },
  { value: "wellness", label: "Bienestar y deporte", hint: "Masajes, yoga, entrenador personal" },
  { value: "education", label: "Clases y educación", hint: "Profesor particular, idiomas, música" },
  { value: "professional", label: "Servicios profesionales", hint: "Abogado, contador, psicólogo, asesor" },
  { value: "pets", label: "Mascotas", hint: "Peluquería canina, veterinaria" },
  { value: "automotive", label: "Autos y técnicos", hint: "Lavadero, mecánica, service técnico" },
  { value: "tattoo", label: "Tatuajes y arte", hint: "Tatuajes, piercing, maquillaje artístico" },
  { value: "other", label: "Otro", hint: "Cualquier negocio con turnos" },
] as const satisfies ReadonlyArray<{ value: BusinessCategory; label: string; hint: string }>;

const categoryValues = BUSINESS_CATEGORIES.map((c) => c.value) as [BusinessCategory, ...BusinessCategory[]];

export const DESCRIPTION_MAX = 300;

const optionalText = (max: number) =>
  z.string().trim().max(max, { error: `Máximo ${max} caracteres` });

// --- Campos reutilizables (onboarding y configuración) ---

const nameField = z
  .string()
  .trim()
  .min(2, { error: "Ingresá el nombre del negocio" })
  .max(80, { error: "Máximo 80 caracteres" });

const categoryField = z.enum(categoryValues, { error: "Elegí un rubro" });

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((value, ctx) => {
    const problem = slugProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const whatsappField = optionalText(30).regex(/^[0-9+\s()-]*$/, {
  error: "Solo números, espacios y + ( ) -",
});

// --- Formularios ---

export const onboardingSchema = z.object({
  name: nameField,
  category: categoryField,
  slug: slugField,
  whatsapp: whatsappField,
  city: optionalText(80),
});

export const businessSettingsSchema = z.object({
  name: nameField,
  category: categoryField,
  slug: slugField,
  description: optionalText(DESCRIPTION_MAX),
  whatsapp: whatsappField,
  address: optionalText(160),
  city: optionalText(80),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type BusinessSettingsInput = z.input<typeof businessSettingsSchema>;
