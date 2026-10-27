import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { dbState } from "../config/db.js";
import { createSession, destroySession, requireUser } from "../middleware/auth.js";

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
  return requireUser(req, res, async () => {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  });
});

// Dossier (objetivos · joyería · estilos): el onboarding lo recoge y aquí
// viaja con la cuenta. Whitelist de valores: nunca se persiste basura.
const GOALS = new Set(["saber_colores", "compras", "maquillaje"]);
const JEWELRY = new Set(["dorado", "plateado", "ambos"]);
const STYLES = new Set(["Elegante", "Minimalista", "Natural"]);

function cleanPrefs(body) {
  const { goals, jewelry, styles } = body ?? {};
  return {
    goals: Array.isArray(goals)
      ? [...new Set(goals.filter((g) => GOALS.has(String(g))))].slice(0, 6)
      : [],
    jewelry: JEWELRY.has(String(jewelry)) ? String(jewelry) : "",
    styles: Array.isArray(styles)
      ? [...new Set(styles.filter((s) => STYLES.has(String(s))))].slice(0, 6)
      : []
  };
}

auth.get("/perfil", async (req, res) => {
  if (needDB(req, res)) return;
  return requireUser(req, res, async () => {
    try {
      const user = await User.findById(req.userId).select("preferences").lean();
      if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
      res.json({ preferences: user.preferences ?? { goals: [], jewelry: "", styles: [] } });
    } catch {
      res.status(500).json({ error: "No se pudo leer el dossier." });
    }
  });
});

auth.put("/perfil", async (req, res) => {
  if (needDB(req, res)) return;
  return requireUser(req, res, async () => {
    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { preferences: cleanPrefs(req.body) },
        { new: true }
      )
        .select("preferences")
        .lean();
      if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
      res.json({ preferences: user.preferences });
    } catch {
      res.status(500).json({ error: "No se pudo guardar el dossier." });
    }
  });
});
