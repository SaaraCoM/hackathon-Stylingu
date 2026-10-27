import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { dbState } from "../config/db.js";
import { createSession, destroySession } from "../middleware/auth.js";

export const auth = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function needDB(_req, res) {
  if (dbState() !== "conectado") {
    res.status(503).json({ error: "Sin base de datos: el login llegará con tu cuenta." });
    return true;
  }
  return false;
}

auth.post("/registro", async (req, res) => {
  if (needDB(req, res)) return;
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email y password son requeridos." });
  }
  if (!EMAIL_RE.test(String(email))) {
    return res.status(400).json({ error: "Email no válido." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "La contraseña necesita 8+ caracteres." });
  }
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (exists) return res.status(409).json({ error: "Ese email ya tiene cuenta." });
  const user = await User.create({
    name: String(name).slice(0, 60),
    email: String(email).toLowerCase().trim(),
    passwordHash: await bcrypt.hash(String(password), 12)
  });
  await createSession(res, user._id);
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
});

auth.post("/login", async (req, res) => {
  if (needDB(req, res)) return;
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos." });
  }
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  await createSession(res, user._id);
  res.json({ user: { id: user._id, name: user.name, email: user.email } });
});

auth.post("/logout", async (req, res) => {
  await destroySession(req, res);
  res.json({ ok: true });
});

auth.get("/yo", async (req, res) => {
  if (needDB(req, res)) return;
  const { requireUser } = await import("../middleware/auth.js");
  return requireUser(req, res, async () => {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  });
});
