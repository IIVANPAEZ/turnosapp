/**
 * Estados del turno (se guardan en la base a partir del Sprint 3).
 * "En curso" (in_progress) se guarda al tocar "Iniciar" (Sprint 5).
 * "Reprogramado" es una marca del turno original que apunta al nuevo.
 */
export type AppointmentStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

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
  /** Precio del turno (para precargar el cobro al finalizar). */
  price?: number;
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Por confirmar",
  confirmed: "Confirmado",
  in_progress: "En curso",
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
  rescheduled: "bg-now-soft text-now",
  in_progress: "bg-primary text-primary-foreground",
};

/** Un turno "abierto" todavía no se cerró: por venir o en curso. */
export function isOpenStatus(status: AppointmentStatus) {
  return status === "pending" || status === "confirmed" || status === "in_progress";
}

/** Por venir: todavía no empezó (ni se marcó como iniciado). */
export function isWaitingStatus(status: AppointmentStatus) {
  return status === "pending" || status === "confirmed";
}

/** Minutos antes de la hora en que ya se puede tocar "Iniciar" (el cliente llegó antes). */
export const START_EARLY_MINUTES = 60;
