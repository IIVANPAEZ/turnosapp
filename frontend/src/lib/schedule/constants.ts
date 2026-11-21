/** 1 = lunes … 7 = domingo (igual que la columna working_hours.weekday). */
export const WEEKDAYS = [
  { value: 1, short: "Lun", label: "Lunes" },
  { value: 2, short: "Mar", label: "Martes" },
  { value: 3, short: "Mié", label: "Miércoles" },
  { value: 4, short: "Jue", label: "Jueves" },
  { value: 5, short: "Vie", label: "Viernes" },
  { value: 6, short: "Sáb", label: "Sábado" },
  { value: 7, short: "Dom", label: "Domingo" },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]["value"];

/** Franja abierta en hora local "HH:mm". */
export type TimeRange = { start: string; end: string };

/** Semana completa: franjas por día (día sin franjas = cerrado). */
export type WeekHours = Record<Weekday, TimeRange[]>;

export const STEP_MINUTES = 15;

/** "00:00", "00:15", … "23:45" */
export const TIME_OPTIONS: string[] = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const minutes = i * STEP_MINUTES;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export function emptyWeek(): WeekHours {
  return { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
}

const r = (start: string, end: string): TimeRange => ({ start, end });

/** Plantillas para arrancar cuando todavía no hay horario cargado. */
export const WEEK_TEMPLATES: { key: string; label: string; hint: string; week: WeekHours }[] = [
  {
    key: "lv-corrido",
    label: "Lun a Vie · 08:00–18:00",
    hint: "Horario corrido",
    week: { 1: [r("08:00", "18:00")], 2: [r("08:00", "18:00")], 3: [r("08:00", "18:00")], 4: [r("08:00", "18:00")], 5: [r("08:00", "18:00")], 6: [], 7: [] },
  },
  {
    key: "lv-cortado-sab",
    label: "Lun a Vie · 08–12 / 14–18 + Sáb 08–12",
    hint: "Con pausa al mediodía",
    week: {
      1: [r("08:00", "12:00"), r("14:00", "18:00")],
      2: [r("08:00", "12:00"), r("14:00", "18:00")],
      3: [r("08:00", "12:00"), r("14:00", "18:00")],
      4: [r("08:00", "12:00"), r("14:00", "18:00")],
      5: [r("08:00", "12:00"), r("14:00", "18:00")],
      6: [r("08:00", "12:00")],
      7: [],
    },
  },
  {
    key: "ls-corrido",
    label: "Lun a Sáb · 09:00–19:00",
    hint: "Incluye sábados",
    week: { 1: [r("09:00", "19:00")], 2: [r("09:00", "19:00")], 3: [r("09:00", "19:00")], 4: [r("09:00", "19:00")], 5: [r("09:00", "19:00")], 6: [r("09:00", "19:00")], 7: [] },
  },
];
