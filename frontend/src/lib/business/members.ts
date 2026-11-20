import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";

type MemberRole = Database["public"]["Enums"]["member_role"];

/** Textos de los roles para mostrar en pantalla. */
export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Dueño",
  admin: "Administrador",
  staff: "Profesional",
};

/**
 * Colores de agenda. Tonos con buen contraste para texto blanco.
 * El primero es el default de la base (business_members.color).
 */
export const MEMBER_COLORS = [
  { value: "#6366f1", label: "Índigo" },
  { value: "#7c3aed", label: "Violeta" },
  { value: "#db2777", label: "Rosa" },
  { value: "#e11d48", label: "Frambuesa" },
  { value: "#ea580c", label: "Naranja" },
  { value: "#d97706", label: "Ámbar" },
  { value: "#059669", label: "Verde" },
  { value: "#0891b2", label: "Celeste" },
] as const;

export const updateMemberSchema = z.object({
  memberId: z.uuid(),
  displayName: z
    .string()
    .trim()
    .min(1, { error: "Ingresá un nombre" })
    .max(80, { error: "Máximo 80 caracteres" }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, { error: "Elegí un color" }),
});

export type UpdateMemberInput = z.input<typeof updateMemberSchema>;
