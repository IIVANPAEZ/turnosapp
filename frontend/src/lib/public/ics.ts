import { zonedToUtc } from "@/lib/time/zone";

/**
 * Archivo .ics ("Agregar a mi calendario"): lo abren Google Calendar,
 * el calendario del iPhone y Outlook sin pedir permisos ni cuentas.
 */
type IcsEvent = {
  uid: string;
  date: string; // "YYYY-MM-DD" en la zona del negocio
  time: string; // "HH:mm"
  durationMinutes: number;
  timeZone: string;
  title: string;
  location?: string | null;
  description?: string | null;
};

/** Date → "20261123T133000Z" */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapa comas, punto y coma, barras y saltos de línea (RFC 5545). */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(e: IcsEvent): string {
  const start = zonedToUtc(e.date, e.time, e.timeZone);
  const end = new Date(start.getTime() + e.durationMinutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TurnoPy//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@turnopy`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    e.location ? `LOCATION:${esc(e.location)}` : null,
    e.description ? `DESCRIPTION:${esc(e.description)}` : null,
    // Aviso una hora antes.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT1H",
    `DESCRIPTION:${esc(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n") + "\r\n";
}

/** Descarga el .ics en el navegador. */
export function downloadIcs(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
