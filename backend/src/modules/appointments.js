import { Router } from "express";
import { addMinutes, parse, format, startOfDay, isBefore, isEqual } from "date-fns";
import { db } from "../data/store.js";
import { sendReminder } from "../utils/reminders.js";

const router = Router();

// --- Helpers ---

function hasOverlap(doctorId, newStart, newEnd, excludeId = null) {
  return db.appointments.some((a) => {
    if (a.doctorId !== doctorId) return false;
    if (a.status === "cancelled") return false;
    if (excludeId && a.id === excludeId) return false;
    return a.start < newEnd && a.end > newStart;
  });
}

// Genera slots disponibles para un doctor + servicio en una fecha
function getAvailableSlots(doctorId, serviceId, dateStr) {
  const doctor = db.doctors.find((d) => d.id === doctorId);
  const service = db.services.find((s) => s.id === serviceId);
  if (!doctor || !service) return [];

  const day = startOfDay(new Date(dateStr + "T00:00:00"));
  const dayStart = parse(doctor.horario.start, "HH:mm", day);
  const dayEnd = parse(doctor.horario.end, "HH:mm", day);

  const slots = [];
  let cursor = dayStart;

  while (isBefore(addMinutes(cursor, service.duracion), dayEnd) || isEqual(addMinutes(cursor, service.duracion), dayEnd)) {
    const slotStart = cursor.toISOString();
    const slotEnd = addMinutes(cursor, service.duracion).toISOString();

    if (!hasOverlap(doctorId, slotStart, slotEnd)) {
      slots.push({
        start: slotStart,
        end: slotEnd,
        label: format(cursor, "HH:mm") + " - " + format(addMinutes(cursor, service.duracion), "HH:mm"),
      });
    }
    cursor = addMinutes(cursor, service.duracion);
  }

  return slots;
}

// --- Rutas ---

// Listar turnos (opcionalmente filtrar por fecha y/o doctor)
router.get("/", (req, res) => {
  let results = db.appointments;
  if (req.query.doctorId) results = results.filter((a) => a.doctorId === +req.query.doctorId);
  if (req.query.date) {
    const dayStr = req.query.date; // YYYY-MM-DD
    results = results.filter((a) => a.start.startsWith(dayStr));
  }
  if (req.query.from && req.query.to) {
    results = results.filter((a) => a.start >= req.query.from && a.start < req.query.to);
  }
  res.json(results);
});

router.get("/:id", (req, res) => {
  const apt = db.appointments.find((a) => a.id === +req.params.id);
  if (!apt) return res.status(404).json({ error: "Turno no encontrado" });
  res.json(apt);
});

// Crear turno
router.post("/", (req, res) => {
  const { patientId, doctorId, serviceId, start } = req.body;
  if (!patientId || !doctorId || !serviceId || !start) {
    return res.status(400).json({ error: "patientId, doctorId, serviceId y start son requeridos" });
  }

  const service = db.services.find((s) => s.id === +serviceId);
  if (!service) return res.status(404).json({ error: "Servicio no encontrado" });

  const startISO = new Date(start).toISOString();
  const endISO = addMinutes(new Date(start), service.duracion).toISOString();

  if (hasOverlap(+doctorId, startISO, endISO)) {
    return res.status(409).json({ error: "Conflicto de horario — el doctor ya tiene un turno en ese rango" });
  }

  const apt = {
    id: db.nextAppointmentId(),
    patientId: +patientId,
    doctorId: +doctorId,
    serviceId: +serviceId,
    start: startISO,
    end: endISO,
    status: "pending",
  };

  db.appointments.push(apt);
  res.status(201).json(apt);
});

// Editar turno
router.put("/:id", (req, res) => {
  const idx = db.appointments.findIndex((a) => a.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Turno no encontrado" });

  const current = db.appointments[idx];
  const updated = { ...current, ...req.body, id: current.id };

  // Recalcular end si cambian start o serviceId
  if (req.body.start || req.body.serviceId) {
    const service = db.services.find((s) => s.id === (updated.serviceId));
    if (service) {
      updated.end = addMinutes(new Date(updated.start), service.duracion).toISOString();
      updated.start = new Date(updated.start).toISOString();
    }
  }

  if (updated.status !== "cancelled" && hasOverlap(updated.doctorId, updated.start, updated.end, updated.id)) {
    return res.status(409).json({ error: "Conflicto de horario" });
  }

  db.appointments[idx] = updated;
  res.json(updated);
});

// Cancelar turno
router.delete("/:id", (req, res) => {
  const idx = db.appointments.findIndex((a) => a.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Turno no encontrado" });

  db.appointments[idx].status = "cancelled";
  res.json(db.appointments[idx]);
});

// Enviar recordatorio por WhatsApp
router.post("/:id/remind", async (req, res) => {
  const apt = db.appointments.find((a) => a.id === +req.params.id);
  if (!apt) return res.status(404).json({ error: "Turno no encontrado" });

  try {
    await sendReminder(apt);
    res.json({ ok: true, message: "Recordatorio enviado" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Disponibilidad ---
router.get("/availability/:doctorId/:serviceId/:date", (req, res) => {
  const slots = getAvailableSlots(+req.params.doctorId, +req.params.serviceId, req.params.date);
  res.json(slots);
});

export default router;
