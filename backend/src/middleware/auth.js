import crypto from 'node:crypto';
import { parse } from 'cookie';
import { connectDB } from '../config/db.js';
import * as repo from '../db/repo.js';

const NAME = 'stylingu_sid';
const TTL = 30 * 24 * 60 * 60 * 1000;
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const tokenFrom = req => parse(req.headers.cookie || '')[NAME];

export async function createSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await repo.createSessionRow({ tokenHash: hash(token), userId, expiresAt: new Date(Date.now() + TTL) });
  res.cookie(NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || process.env.NODE_ENV === 'production',
    maxAge: TTL,
    path: '/'
  });
}

export async function destroySession(req, res) {
  const token = tokenFrom(req);
  if (token) await repo.deleteSessionRow(hash(token));
  res.clearCookie(NAME, { path: '/' });
}

export async function requireUser(req, res, next) {
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ error: 'Sesión requerida.' });
  try {
    await connectDB();
    const session = await repo.sessionByToken(hash(token));
    if (!session) return res.status(401).json({ error: 'Sesión no válida.' });
    req.sessionUser = req.userId = session.userId;
    next();
  } catch {
    res.status(503).json({ error: 'Sin base de datos.' });
  }
}
