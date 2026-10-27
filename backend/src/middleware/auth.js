import crypto from "node:crypto";
import { Session } from "../models/Session.js";

export const SESSION_COOKIE = "stylingu_sid";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS)
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/"
  });
}

export async function destroySession(req, res) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

// requireUser: única puerta a datos propios. Sin sesión válida → 401,
// nunca filtra por userId del cliente.
export async function requireUser(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: "Sesión requerida." });
    const session = await Session.findOne({ tokenHash: hashToken(token) }).lean();
    if (!session || session.expiresAt < new Date()) {
      if (session) await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ error: "Sesión caducada." });
    }
    req.userId = String(session.userId);
    next();
  } catch {
    return res.status(503).json({ error: "Sin base de datos." });
  }
}
