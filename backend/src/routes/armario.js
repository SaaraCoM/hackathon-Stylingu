import { Router } from "express";
import * as repo from "../db/repo.js";
import { dbState } from "../config/db.js";
import { requireUser } from "../middleware/auth.js";

export const armario = Router();
const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);

// Sin base: 503 y el frontend guarda en localStorage (fallback visible).
// Todo aquí exige sesión: cada usuario solo ve y guarda lo suyo
// (requireUser pone req.userId desde la cookie, nunca del cliente).
armario.use(requireUser);

armario.get("/", handle(async (req, res) => {
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: uso local." });
  }
  const items = await repo.listOutfits(req.userId);
  res.json({ items });
}));

armario.post("/", handle(async (req, res) => {
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: uso local." });
  }
  const { top, topDesc, bottom, bottomDesc, jacket, jacketDesc, acc, accDesc, note } = req.body ?? {};
  if (!top || !bottom || !jacket) {
    return res.status(400).json({ error: "top, bottom y jacket son requeridos." });
  }
  const item = await repo.createOutfit(req.userId, {
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
  res.status(201).json({ item });
}));
