import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 180,
  message: {code:"RATE_LIMITED",error:"Demasiadas solicitudes. Espera un minuto."},
  standardHeaders: true,
  legacyHeaders: false
});

// Auth: 10 intentos/minuto por IP (fuerza bruta contenida sin castigar typos).
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Espera un minuto." }
});

// Endpoint pesado de IA: 5 peticiones/minuto por IP, según documento de contexto.
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes IA. Reintenta en un minuto." }
});
