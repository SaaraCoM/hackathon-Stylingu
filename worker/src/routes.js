/* routes.js — API espejo de backend/src/routes para el runtime Workers.
 * Mismas rutas, validaciones y formas de respuesta que Express para que
 * el frontend funcione igual contra ambos orígenes. */
import { Hono } from "hono";
import bcrypt from "bcryptjs";
import { Outfit, User } from "./models.js";
import { connectDB, dbState } from "./db.js";
import { createSession, destroySession, requireUser } from "./sessions.js";
import { limit } from "./rateLimit.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

// Conexión perezosa al Atlas antes de tocar la base; si no hay, 503 y el
// frontend cae a localStorage (mismo contrato que Express).
async function guardDB(c) {
  if (dbState() !== "conectado") {
    try {
      await connectDB(c.env.MONGODB_URI);
    } catch { /* informa 503 abajo */ }
  }
  if (dbState() === "conectado") return null;
  return c.json({ error: "Sin base de datos: el login llegará con tu cuenta." }, 503);
}

export const api = new Hono();

// health sin límite (como en Express), luego límites por grupo.
api.get("/health", async (c) => {
  if (dbState() !== "conectado") {
    try {
      await connectDB(c.env.MONGODB_URI);
    } catch { /* dbState() lo dirá */ }
  }
  return c.json({ ok: true, service: "stylingu-backend", db: dbState() });
});

api.use("*", limit({ group: "api", max: 60, windowMs: 60_000, message: "Demasiadas peticiones. Espera un minuto." }));
api.use("/auth/*", limit({ group: "auth", max: 10, windowMs: 60_000, message: "Demasiados intentos. Espera un minuto." }));
api.use("/ai/*", limit({ group: "ai", max: 5, windowMs: 60_000, message: "Demasiadas solicitudes IA. Reintenta en un minuto." }));

api.post("/auth/registro", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  const { name, email, password } = await c.req.json().catch(() => ({}));
  if (!name || !email || !password) {
    return c.json({ error: "name, email y password son requeridos." }, 400);
  }
  if (!EMAIL_RE.test(String(email))) return c.json({ error: "Email no válido." }, 400);
  if (String(password).length < 8) {
    return c.json({ error: "La contraseña necesita 8+ caracteres." }, 400);
  }
  const exists = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (exists) return c.json({ error: "Ese email ya tiene cuenta." }, 409);
  const user = await User.create({
    name: String(name).slice(0, 60),
    email: String(email).toLowerCase().trim(),
    passwordHash: await bcrypt.hash(String(password), 12)
  });
  await createSession(c, user._id);
  return c.json({ user: { id: user._id, name: user.name, email: user.email } }, 201);
});

api.post("/auth/login", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  const { email, password } = await c.req.json().catch(() => ({}));
  if (!email || !password) {
    return c.json({ error: "email y password son requeridos." }, 400);
  }
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return c.json({ error: "Email o contraseña incorrectos." }, 401);
  }
  await createSession(c, user._id);
  return c.json({ user: { id: user._id, name: user.name, email: user.email } });
});

api.post("/auth/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

api.get("/auth/yo", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  return requireUser(c, async () => {
    const user = await User.findById(c.get("userId")).lean();
    if (!user) return c.json({ error: "Sesión sin cuenta." }, 401);
    return c.json({ user: { id: user._id, name: user.name, email: user.email } });
  });
});

// Dossier: mismos endpoints que Express (whitelist de valores).
api.get("/auth/perfil", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  return requireUser(c, async () => {
    try {
      const user = await User.findById(c.get("userId")).select("preferences").lean();
      if (!user) return c.json({ error: "Sesión sin cuenta." }, 401);
      return c.json({
        preferences: user.preferences ?? { goals: [], jewelry: "", styles: [] }
      });
    } catch {
      return c.json({ error: "No se pudo leer el dossier." }, 500);
    }
  });
});

api.put("/auth/perfil", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  return requireUser(c, async () => {
    try {
      const body = await c.req.json().catch(() => ({}));
      const user = await User.findByIdAndUpdate(
        c.get("userId"),
        { preferences: cleanPrefs(body) },
        { new: true }
      )
        .select("preferences")
        .lean();
      if (!user) return c.json({ error: "Sesión sin cuenta." }, 401);
      return c.json({ preferences: user.preferences });
    } catch {
      return c.json({ error: "No se pudo guardar el dossier." }, 500);
    }
  });
});

const armario = new Hono();

armario.use("*", requireUser);

armario.get("/", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  const items = await Outfit.find({ userId: c.get("userId") })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return c.json({ items });
});

armario.post("/", async (c) => {
  const down = await guardDB(c);
  if (down) return down;
  const b = await c.req.json().catch(() => ({}));
  const { top, topDesc, bottom, bottomDesc, jacket, jacketDesc, acc, accDesc, note } = b ?? {};
  if (!top || !bottom || !jacket) {
    return c.json({ error: "top, bottom y jacket son requeridos." }, 400);
  }
  const doc = await Outfit.create({
    userId: c.get("userId"),
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
  return c.json({ item: doc }, 201);
});

api.route("/armario", armario);

// Placeholder de IA (mismo contrato que Express).
api.post("/ai/analyze-colorimetry", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.imageUrl) {
    return c.json({ error: "imageUrl es requerido" }, 400);
  }
  return c.json({ error: "IA no configurada: define META_AI_API_KEY en .env" }, 501);
});
