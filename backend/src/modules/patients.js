import { Router } from "express";
import { db } from "../data/store.js";

const router = Router();

// Listar pacientes
router.get("/", (_req, res) => {
  res.json(db.patients);
});

// Obtener paciente por ID
router.get("/:id", (req, res) => {
  const patient = db.patients.find((p) => p.id === +req.params.id);
  if (!patient) return res.status(404).json({ error: "Paciente no encontrado" });
  res.json(patient);
});

// Crear paciente
router.post("/", (req, res) => {
  const { nombre, telefono, notas } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: "nombre y telefono son requeridos" });

  const patient = { id: db.nextPatientId(), nombre, telefono, notas: notas || "" };
  db.patients.push(patient);
  res.status(201).json(patient);
});

// Editar paciente
router.put("/:id", (req, res) => {
  const idx = db.patients.findIndex((p) => p.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Paciente no encontrado" });

  db.patients[idx] = { ...db.patients[idx], ...req.body, id: db.patients[idx].id };
  res.json(db.patients[idx]);
});

// Eliminar paciente
router.delete("/:id", (req, res) => {
  const idx = db.patients.findIndex((p) => p.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Paciente no encontrado" });

  db.patients.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
