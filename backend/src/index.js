import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { apiLimiter, aiLimiter } from "./middleware/rateLimit.js";
import { connectDB, dbState } from "./config/db.js";
import { armario } from "./routes/armario.js";
import { auth } from "./routes/auth.js";
import { authLimiter } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:8080").split(","), credentials: true }));

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

const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test") {
  try {
    await connectDB(process.env.MONGODB_URI);
  } catch (err) {
    console.error("[db] no se pudo conectar, sirvo sin base:", err.message);
  }
  app.listen(port, () => console.log(`stylingu-backend en :${port}`));
}
export default app;
