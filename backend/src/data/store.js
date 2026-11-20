// Almacenamiento en memoria — reemplazar por queries a DB en producción
// Cada array simula una tabla. Los IDs son autoincrementales.

let patientId = 0;
let doctorId = 0;
let serviceId = 0;
let appointmentId = 0;

export const db = {
  patients: [],
  doctors: [],
  services: [],
  appointments: [],

  nextPatientId: () => ++patientId,
  nextDoctorId: () => ++doctorId,
  nextServiceId: () => ++serviceId,
  nextAppointmentId: () => ++appointmentId,
};

// Datos de ejemplo para arrancar con algo visible
export function seed() {
  const d1 = { id: db.nextDoctorId(), nombre: "Dra. María López", especialidad: "Ortodoncia", horario: { start: "09:00", end: "18:00" } };
  const d2 = { id: db.nextDoctorId(), nombre: "Dr. Carlos Ruiz", especialidad: "Endodoncia", horario: { start: "08:00", end: "16:00" } };
  db.doctors.push(d1, d2);

  const s1 = { id: db.nextServiceId(), nombre: "Limpieza dental", duracion: 30, precio: 50000 };
  const s2 = { id: db.nextServiceId(), nombre: "Ortodoncia consulta", duracion: 60, precio: 120000 };
  const s3 = { id: db.nextServiceId(), nombre: "Extracción simple", duracion: 45, precio: 80000 };
  db.services.push(s1, s2, s3);

  const p1 = { id: db.nextPatientId(), nombre: "Juan Pérez", telefono: "0961123456", notas: "" };
  const p2 = { id: db.nextPatientId(), nombre: "Ana Gómez", telefono: "0971654321", notas: "Alérgica a penicilina" };
  db.patients.push(p1, p2);
}
