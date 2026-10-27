import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { apiLimiter, aiLimiter } from "./middleware/rateLimit.js";
import { connectDB, dbState } from "./config/db.js";
import { armario } from "./routes/armario.js";
import { auth } from "./routes/auth.js";
import { authLimiter } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// CORS: la lista de .env manda en producción; en desarrollo se acepta
// cualquier origen local (y "null" para file://) para que la API
// "funcione" sin tocar configuración al cambiar de puerto.
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://localhost:8080").split(",").map((s) => s.trim())
);
const localOrigin = /^(null|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
app.use(
  cors({
    origin(origin, cb) {
      const ok =
        !origin ||
        allowedOrigins.has(origin) ||
        (process.env.NODE_ENV !== "production" && localOrigin.test(origin));
      cb(null, ok);
    },
    credentials: true
  })
);

app.get("/api/health", (_req, res) =>
  res.json({ ok: true, service: "stylingu-backend", db: dbState() })
);

app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter, auth);
app.use("/api/armario", armario);
app.post("/api/ai/analyze-colorimetry", aiLimiter, (req, res) => {
  // Placeholder: la IA real (Meta AI) se integra aquí con cuota y fallback local.
  if (!req.body || !req.body.imageUrl) {
    return res.status(400).json({ error: "imageUrl es requerido" });
  }
  return res.status(501).json({ error: "IA no configurada: define META_AI_API_KEY en .env" });
});

// Ojo: un PORT=0 ambient (p. ej. en la shell) no debe elegir puerto
// aleatorio — dotenv no pisa env ya definida, así que 0 → 3000.
// El backend sirve también el frontend: un solo origen (cookies y API
// sin CORS) → http://localhost:3000 es toda la app.
const FRONTEND_DIR = fileURLToPath(new URL("../../frontend/public", import.meta.url));
app.use(express.static(FRONTEND_DIR));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "ruta no encontrada" });
  }
  res.sendFile("index.html", { root: FRONTEND_DIR });
});

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== "test") {
  try {
    await connectDB(process.env.MONGODB_URI);
  } catch (err) {
    console.error("[db] no se pudo conectar, sirvo sin base:", err.message);
  }
  app.listen(port, () => console.log(`stylingu-backend en :${port}`));
}
export default app;
