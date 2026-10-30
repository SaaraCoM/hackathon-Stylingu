// auth.js — auth de StylingU: registro, login, logout, perfil y flujo de personalización.
import express from "express";
import bcrypt from "bcryptjs";
import { connectDB, dbState } from "../config/db.js";
import * as repo from "../db/repo.js";
import { createSession, destroySession, requireUser } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { ageFromBirthDate, MIN_AGE } from "../age.js";

import { cleanPrefs, analysisForProfile } from '../../../shared/personal-service.js';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const router = express.Router();
router.use(async (req, res, next) => {
  if (req.path === '/yo' && !req.headers.cookie?.includes('stylingu_sid=')) return res.json({ user: null });
  try { await connectDB(); next(); } catch { res.status(503).json({ error: 'Sin base de datos.' }); }
});
// Express 4 no propaga rechazos de handlers async automáticamente.
for (const method of ['get', 'post', 'put']) {
  const original = router[method].bind(router);
  router[method] = (path, ...handlers) => original(path, ...handlers.map(fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)));
}
router.use('/registro', authLimiter);
router.use('/login', authLimiter);
router.get('/yo', async (req, res, next) => {
  if (!req.headers.cookie?.includes('stylingu_sid=')) return res.json({ user: null });
  return requireUser(req, res, async () => {
    try {
      const user = await repo.userById(req.sessionUser);
      res.json({ user: user ? { id: user._id, name: user.name, email: user.email } : null });
    } catch (err) { next(err); }
  });
});

// Registro básico
router.post("/registro", async (req, res) => {
  await connectDB();
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: el registro llegará con tu cuenta." });
  }
  const { name, email, password, birthDate, analysis } = req.body ?? {};
  const emailStr = String(email ?? "").toLowerCase().trim();
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email y password son requeridos." });
  }
  if (!EMAIL_RE.test(emailStr)) return res.status(400).json({ error: "Email no válido." });
  if (String(password).length < 8 || Buffer.byteLength(String(password)) > 72) {
    return res.status(400).json({ error: "La contraseña necesita 8+ caracteres y un máximo de 72 bytes." });
  }
  if (birthDate == null || birthDate === "") {
    return res.status(400).json({ code: "BIRTH_DATE_REQUIRED", error: "Indica tu fecha de nacimiento para crear la cuenta." });
  }
  const age = ageFromBirthDate(birthDate);
  if (age === null) {
    return res.status(400).json({ code: "INVALID_BIRTH_DATE", error: "La fecha de nacimiento no es válida. Usa el formato AAAA-MM-DD." });
  }
  if (age < MIN_AGE) {
    return res.status(403).json({ code: "UNDERAGE", error: `Debes tener al menos ${MIN_AGE} años para crear una cuenta.` });
  }
  if (analysis != null) return res.status(400).json({ error: 'Crea la cuenta y después finaliza el análisis con tus fotos.' });

  const exists = await repo.userByEmail(emailStr);
  if (exists) return res.status(409).json({ error: "Ese email ya tiene cuenta." });

  const user = await repo.createUser({
    name: String(name).slice(0, 60),
    email: emailStr,
    passwordHash: await bcrypt.hash(String(password), 12),
    birthDate
  });
  await createSession(req, res, user._id);
  return res.status(201).json({ user: { id: user._id, name: user.name, email: user.email } });
});

// Login básico
router.post("/login", async (req, res) => {
  await connectDB();
  if (dbState() !== "conectado") {
    return res.status(503).json({ error: "Sin base de datos: el login llegará con tu cuenta." });
  }
  const { email, password } = req.body ?? {};
  const emailStr = String(email ?? "").toLowerCase().trim();
  if (!email || !password) {
    return res.status(400).json({ error: "email y password son requeridos." });
  }
  const user = await repo.credentialsByEmail(emailStr);
  if (!user || user.deleting || !(await bcrypt.compare(String(password), user.passwordHash ?? ''))) {
    return res.status(401).json({ error: "Email o contraseña incorrectos." });
  }
  await createSession(req, res, user._id);
  return res.json({ user: { id: user._id, name: user.name, email: user.email } });
});

// Logout
router.post("/logout", async (req, res) => {
  await destroySession(req, res);
  return res.json({ ok: true });
});

// Perfil: preferencias + análisis persistidos.
router.get("/perfil", requireUser, async (req, res) => {
  await connectDB();
  const user = await repo.userById(req.sessionUser);
  if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
  return res.json({
    preferences: user.preferences ?? { goals: [], jewelry: "", styles: [] },
    analysis: user.analysis ?? null
  });
});

router.put("/perfil", requireUser, async (req, res) => {
  await connectDB();
  const body = req.body ?? {};
  const user = await repo.userById(req.sessionUser);
  if (!user) return res.status(401).json({ error: "Sesión sin cuenta." });
  const patch = {};
  if (['goals', 'jewelry', 'styles'].some(key => key in body)) patch.preferences = cleanPrefs(body);
  if ('analysis' in body) patch.analysis = analysisForProfile(user, body.analysis);
  const saved = await repo.saveUser(req.sessionUser, patch);
  if (!saved) return res.status(401).json({ error: "Sesión sin cuenta." });
  return res.json({ preferences: saved.preferences, analysis: saved.analysis ?? null });
});


export { router as authRoutes };

export default router;
