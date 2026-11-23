import express from "express";
import cors from "cors";
import { seed } from "./src/data/store.js";
import patientsRouter from "./src/modules/patients.js";
import doctorsRouter from "./src/modules/doctors.js";
import servicesRouter from "./src/modules/services.js";
import appointmentsRouter from "./src/modules/appointments.js";
import whatsappRouter from "./src/modules/whatsapp.js";

const app = express();
const PORT = 3050;

app.use(cors());
app.use(express.json());

// Rutas
app.use("/patients", patientsRouter);
app.use("/doctors", doctorsRouter);
app.use("/services", servicesRouter);
app.use("/appointments", appointmentsRouter);
app.use("/whatsapp", whatsappRouter);
// La ruta de availability está montada dentro de appointments:
// GET /appointments/availability/:doctorId/:serviceId/:date

// Seed datos de ejemplo
seed();

app.listen(PORT, () => {
  console.log(`TurnoPy API corriendo en http://localhost:${PORT}`);
});
