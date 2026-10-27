import bcrypt from "bcryptjs";
import { dbState } from "./db.js";
import { User } from "./models.js";

// TEMPORAL: aislar el cuelgue de registro/login. Se borra tras el diagnóstico.
export function mountDebug(app) {
  app.get("/api/debug/state", (c) => c.json({ db: dbState() }));

  app.get("/api/debug/db", async (c) => {
    const t0 = Date.now();
    try {
      const doc = await User.findOne({ email: "no-existe@x.com" }).lean();
      return c.json({ ok: true, ms: Date.now() - t0, doc });
    } catch (e) {
      return c.json({ ok: false, ms: Date.now() - t0, err: String(e && e.message || e) });
    }
  });

  app.get("/api/debug/bcrypt", async (c) => {
    const t0 = Date.now();
    try {
      const h = await bcrypt.hash("secreta01", 12);
      const t1 = Date.now();
      const ok = await bcrypt.compare("secreta01", h);
      return c.json({ ok, hashMs: t1 - t0, cmpMs: Date.now() - t1 });
    } catch (e) {
      return c.json({ err: String(e && e.message || e), ms: Date.now() - t0 });
    }
  });

  app.get("/api/debug/registro", async (c) => {
    const t0 = Date.now();
    try {
      const exists = await User.findOne({ email: "worker.a@test.local" }).lean();
      const t1 = Date.now();
      const h = await bcrypt.hash("secreta01", 12);
      const t2 = Date.now();
      return c.json({ exists: !!exists, findMs: t1 - t0, hashMs: t2 - t1 });
    } catch (e) {
      return c.json({ err: String(e && e.message || e), ms: Date.now() - t0 });
    }
  });
}
