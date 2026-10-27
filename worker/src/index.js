import { Hono } from "hono";
import { api } from "./routes.js";
import { mountDebug } from "./debug.js"; // TEMPORAL: diagnóstico de cuelgue

const app = new Hono();

mountDebug(app); // TEMPORAL

// Misma API que el backend Express (rutas y respuestas idénticas).
app.route("/api", api);

// El frontend publicado: un solo origen, sin CORS. Si no hay asset,
// se responde el index (la app es una sola página).
app.all("*", async (c) => {
  if (c.req.path.startsWith("/api")) {
    return c.json({ error: "ruta no encontrada" }, 404);
  }
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404 && c.req.method === "GET") {
    return c.env.ASSETS.fetch(new Request(new URL("/index.html", c.req.url)));
  }
  return res;
});

export default app;
