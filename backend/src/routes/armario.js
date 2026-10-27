import { Router } from "express";
import { Outfit } from "../models/Outfit.js";
import { dbState } from "../config/db.js";

export const armario = Router();

// Sin base: 503 y el frontend guarda en localStorage (fallback visible).
armario.get("/", async (_req, res) => {
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: uso local." });
  }
  const items = await Outfit.find().sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items });
});

armario.post("/", async (req, res) => {
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: uso local." });
  }
  const { top, topDesc, bottom, bottomDesc, jacket, jacketDesc, acc, accDesc, note } = req.body ?? {};
  if (!top || !bottom || !jacket) {
    return res.status(400).json({ error: "top, bottom y jacket son requeridos." });
  }
  const doc = await Outfit.create({
    top: String(top).slice(0, 120),
    topDesc: String(topDesc ?? "").slice(0, 300),
    bottom: String(bottom).slice(0, 120),
    bottomDesc: String(bottomDesc ?? "").slice(0, 300),
    jacket: String(jacket).slice(0, 120),
    jacketDesc: String(jacketDesc ?? "").slice(0, 300),
    acc: String(acc ?? "").slice(0, 120),
    accDesc: String(accDesc ?? "").slice(0, 300),
    note: String(note ?? "").slice(0, 500)
  });
  res.status(201).json({ item: doc });
});
