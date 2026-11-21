/**
 * Estados del turno (se guardan en la base a partir del Sprint 3).
 * "En curso" no es un estado: se calcula con la hora actual.
 * "Reprogramado" es una marca del turno original que apunta al nuevo.
 */
export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

/** Turno de hoy, tal como lo muestra la tarjeta "Hoy" del inicio. */
export type TodayAppointment = {
  id: string;
  /** "HH:mm" en la zona del negocio */
  start: string;
  end: string;
  clientName: string;
  serviceName: string;
  status: AppointmentStatus;
  /** Si se reprogramó: a dónde se movió (ej. "jue 14:00"). */
  rescheduledTo?: string | null;
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  completed: "Finalizado",
  cancelled: "Cancelado",
  no_show: "No vino",
};

/** Clases del chip de cada estado (tokens del sistema de diseño). */
export const STATUS_STYLES: Record<AppointmentStatus | "rescheduled" | "in_progress", string> = {
  pending: "bg-raised text-muted-foreground",
  confirmed: "bg-primary-soft text-primary",
  completed: "bg-success-soft text-success",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-warning-soft text-warning",
  rescheduled: "bg-[rgb(125_211_252/0.12)] text-now",
  in_progress: "bg-primary text-primary-foreground",
};

/** Un turno "abierto" todavía puede estar en curso o por venir. */
export function isOpenStatus(status: AppointmentStatus) {
  return status === "pending" || status === "confirmed";
}
