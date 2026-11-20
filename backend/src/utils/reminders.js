import { format } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "../data/store.js";
import { client, getIsReady } from "../services/whatsappClient.js";
import { toWhatsAppId } from "./phoneFormatter.js";

export async function sendReminder(appointment) {
  const patient = db.patients.find((p) => p.id === appointment.patientId);
  const doctor = db.doctors.find((d) => d.id === appointment.doctorId);
  const service = db.services.find((s) => s.id === appointment.serviceId);

  if (!patient?.telefono) {
    throw new Error("El paciente no tiene teléfono registrado");
  }

  if (!getIsReady()) {
    throw new Error("WhatsApp no está conectado");
  }

  const hora = format(new Date(appointment.start), "HH:mm");
  const fecha = format(new Date(appointment.start), "EEEE d 'de' MMMM", { locale: es });

  const msg = `Hola ${patient.nombre}, te recordamos que tenés turno con ${doctor?.nombre} (${service?.nombre}) el ${fecha} a las ${hora}hs.`;

  const chatId = toWhatsAppId(patient.telefono);
  await client.sendMessage(chatId, msg);
  console.log(`[WhatsApp] Recordatorio enviado a ${patient.telefono}`);
}
