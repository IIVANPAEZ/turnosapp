import { Router } from "express";
import { db } from "../data/store.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(db.services);
});

router.get("/:id", (req, res) => {
  const svc = db.services.find((s) => s.id === +req.params.id);
  if (!svc) return res.status(404).json({ error: "Servicio no encontrado" });
  res.json(svc);
});

router.post("/", (req, res) => {
  const { nombre, duracion, precio } = req.body;
  if (!nombre || !duracion) return res.status(400).json({ error: "nombre y duracion son requeridos" });

  const svc = { id: db.nextServiceId(), nombre, duracion: +duracion, precio: +(precio || 0) };
  db.services.push(svc);
  res.status(201).json(svc);
});

router.put("/:id", (req, res) => {
  const idx = db.services.findIndex((s) => s.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Servicio no encontrado" });

  db.services[idx] = { ...db.services[idx], ...req.body, id: db.services[idx].id };
  if (db.services[idx].duracion) db.services[idx].duracion = +db.services[idx].duracion;
  if (db.services[idx].precio) db.services[idx].precio = +db.services[idx].precio;
  res.json(db.services[idx]);
});

router.delete("/:id", (req, res) => {
  const idx = db.services.findIndex((s) => s.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Servicio no encontrado" });

  db.services.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
