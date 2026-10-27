/* Límite por ventana deslizante, en memoria del isolate. Guardia de
 * abuso para el preview (en Express era express-rate-limit, igual de
 * in-memory por proceso). */
const buckets = new Map();

export function limit({ group, max, windowMs, message }) {
  return async (c, next) => {
    const ip = c.req.header("cf-connecting-ip") || "local";
    const key = `${group}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, n: 0 };
      buckets.set(key, bucket);
    }
    bucket.n += 1;
    if (buckets.size > 10_000) buckets.clear(); // poda simple por tamaño
    if (bucket.n > max) return c.json({ error: message }, 429);
    await next();
  };
}
