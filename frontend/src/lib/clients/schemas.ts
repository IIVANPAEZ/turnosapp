import { z } from "zod";

export const CLIENT_NOTES_MAX = 500;

/** Datos editables del cliente (ficha). */
export const clientSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2, "Escribí nombre y apellido.").max(80, "Máximo 80 caracteres."),
  phone: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres.")
    .refine((p) => p === "" || p.replace(/\D/g, "").length >= 6, "Revisá el número de celular."),
  notes: z.string().trim().max(CLIENT_NOTES_MAX, `Máximo ${CLIENT_NOTES_MAX} caracteres.`),
});

export type ClientInput = z.input<typeof clientSchema>;

export type PaymentMethod = "cash" | "transfer";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

/** Etiquetas automáticas de la lista. */
export type ClientTag = "new" | "frequent" | "lost";

export const CLIENT_TAG_LABELS: Record<ClientTag, string> = {
  new: "Nuevo",
  frequent: "Frecuente",
  lost: "No volvió",
};

/** Días sin venir para marcarlo como "No volvió". */
export const LOST_AFTER_DAYS = 60;
/** Visitas para ser "Frecuente". */
export const FREQUENT_VISITS = 4;
/** Días desde el alta en que sigue siendo "Nuevo". */
export const NEW_FOR_DAYS = 30;
