import { addDays, WEEKDAYS_LONG, weekdayOf } from "@/lib/time/zone";

/**
 * Links de WhatsApp con mensaje listo. Se abren en el WhatsApp del profesional:
 * él revisa (y puede editar) el texto antes de enviarlo.
 */

/** "0981 123 456" / "+595 981 123456" / "981123456" → "595981123456" (o null si no parece un celular). */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("595")) return digits.length >= 11 ? digits : null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  // Celular paraguayo sin prefijo: 9 dígitos que empiezan con 9.
  if (digits.length === 9 && digits.startsWith("9")) return `595${digits}`;
  // Otros números: se usan tal cual si parecen internacionales.
  return digits.length >= 10 ? digits : null;
}

export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null;
}

/** "hoy" · "mañana" · "el sábado 21" */
export function relativeDay(date: string, today: string): string {
  if (date === today) return "hoy";
  if (date === addDays(today, 1)) return "mañana";
  return `el ${WEEKDAYS_LONG[weekdayOf(date)].toLowerCase()} ${Number(date.slice(8, 10))}`;
}

type MessageData = {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName: string;
  today: string;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/** "a" + "el lunes 23" → "al lunes 23" · "de" + "el lunes 23" → "del lunes 23" · "a" + "mañana" → "a mañana" */
function withPreposition(prep: "a" | "de", day: string) {
  return day.startsWith("el ") ? `${prep === "a" ? "al" : "del"} ${day.slice(3)}` : `${prep} ${day}`;
}

export const messages = {
  confirmation: (d: MessageData) =>
    `Hola ${firstName(d.clientName)}, te confirmo tu turno de ${d.serviceName} ${relativeDay(d.date, d.today)} a las ${d.time} en ${d.businessName}. ¡Te esperamos!`,
  reminder: (d: MessageData) =>
    `Hola ${firstName(d.clientName)}, te recuerdo tu turno de ${d.serviceName} ${relativeDay(d.date, d.today)} a las ${d.time} en ${d.businessName}.`,
  rescheduled: (d: MessageData) =>
    `Hola ${firstName(d.clientName)}, tu turno de ${d.serviceName} pasó ${withPreposition("a", relativeDay(d.date, d.today))} a las ${d.time}. Cualquier cosa avisame. ${d.businessName}`,
  cancelled: (d: MessageData) =>
    `Hola ${firstName(d.clientName)}, tu turno de ${d.serviceName} ${withPreposition("de", relativeDay(d.date, d.today))} a las ${d.time} quedó cancelado. Cuando quieras coordinamos otro. ${d.businessName}`,
};
