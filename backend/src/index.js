import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiLimiter, aiLimiter } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:8080").split(",") }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "stylingu-backend" }));

app.use("/api/", apiLimiter);
app.post("/api/ai/analyze-colorimetry", aiLimiter, (req, res) => {
  // Placeholder: la IA real (Meta AI) se integra aquí con cuota y fallback local.
  if (!req.body || !req.body.imageUrl) {
    return res.status(400).json({ error: "imageUrl es requerido" });
  }
  return res.status(501).json({ error: "IA no configurada: define META_AI_API_KEY en .env" });
});

const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`stylingu-backend en :${port}`));
}
export default app;
