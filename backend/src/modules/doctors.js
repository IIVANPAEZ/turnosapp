import { Router } from "express";
import { db } from "../data/store.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.doctors);
});

router.get("/:id", (req, res) => {
  const doc = db.doctors.find((d) => d.id === +req.params.id);
  if (!doc) return res.status(404).json({ error: "Doctor no encontrado" });
  res.json(doc);
});

router.post("/", (req, res) => {
  const { nombre, especialidad, horario } = req.body;
  if (!nombre) return res.status(400).json({ error: "nombre es requerido" });

  const doc = {
    id: db.nextDoctorId(),
    nombre,
    especialidad: especialidad || "",
    horario: horario || { start: "09:00", end: "18:00" },
  };
  db.doctors.push(doc);
  res.status(201).json(doc);
});

router.put("/:id", (req, res) => {
  const idx = db.doctors.findIndex((d) => d.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Doctor no encontrado" });

  db.doctors[idx] = { ...db.doctors[idx], ...req.body, id: db.doctors[idx].id };
  res.json(db.doctors[idx]);
});

router.delete("/:id", (req, res) => {
  const idx = db.doctors.findIndex((d) => d.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Doctor no encontrado" });

  db.doctors.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
