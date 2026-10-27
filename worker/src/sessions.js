import crypto from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Session } from "./models.js";

export const SESSION_COOKIE = "stylingu_sid";
const SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 días (setCookie maxAge va en segundos)

const hashToken = (token) =>
  crypto.createHash("sha256").update(token, "utf8").digest("hex");

export async function createSession(c, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await Session.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_S * 1000)
  });
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: new URL(c.req.url).protocol === "https:",
    maxAge: SESSION_TTL_S,
    path: "/"
  });
}

export async function destroySession(c) {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await Session.deleteOne({ tokenHash: hashToken(token) });
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

// requireUser: única puerta a datos propios. Sin sesión válida → 401,
// nunca filtra por userId del cliente.
export async function requireUser(c, next) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "Sesión requerida." }, 401);
  let session;
  try {
    session = await Session.findOne({ tokenHash: hashToken(token) }).lean();
  } catch {
    return c.json({ error: "Sin base de datos." }, 503);
  }
  if (!session || session.expiresAt < new Date()) {
    if (session) await Session.deleteOne({ _id: session._id });
    return c.json({ error: "Sesión caducada." }, 401);
  }
  c.set("userId", String(session.userId));
  await next();
}
