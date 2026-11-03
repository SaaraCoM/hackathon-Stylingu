import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { parse } from 'cookie';
import { authClient, authError } from '../supabase.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireUser, destroySession } from '../middleware/auth.js';
export const recoveryRoutes = Router();
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
recoveryRoutes.post('/forgot-password', authLimiter, handle(async (req, res) => {
  const email = req.body?.email;
  if (typeof email !== 'string' || email.length > 160) return res.status(400).json({ error: 'Email no válido.' });
  const { error } = await authClient(req, res).auth.resetPasswordForEmail(email, { redirectTo: new URL('/api/auth/callback', process.env.PUBLIC_ORIGIN || 'http://localhost:8080').href });
  if (error?.status >= 500) authError(error);
  res.json({ ok: true, message: 'Si existe una cuenta con ese email, recibirás un enlace de recuperación.' });
}));
recoveryRoutes.post('/reset-password', authLimiter, requireUser, handle(async (req, res) => {
  const session = await req.auth.auth.getSession();
  const expected = createHash('sha256').update(session.data.session.access_token).digest('hex');
  const actual = parse(req.headers.cookie || '').stylingu_recovery || '';
  if (actual.length !== expected.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return res.status(403).json({ error: 'Abre un enlace de recuperación válido.' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Contraseña no válida (8 caracteres mínimo, 72 bytes máximo).' });
  const { error } = await req.auth.auth.updateUser({ password });
  authError(error);
  await destroySession(req, res);
  res.json({ ok: true });
}));
