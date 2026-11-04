import { Router } from "express";
import * as repo from "../db/repo.js";
import { dbState } from "../config/db.js";
import { requireUser } from "../middleware/auth.js";
import { defaultInputSecurityValidator } from "../../../shared/security-policy.js";

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
  const cleanPayload = defaultInputSecurityValidator.validateWardrobeOutfitPayload(req.body);
  const item = await repo.createOutfit(req.userId, cleanPayload);
  res.status(201).json({ item });
}));
