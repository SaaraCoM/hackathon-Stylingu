import { Router } from 'express';
import { createHash } from 'node:crypto';
import { authClient, authError } from '../supabase.js';
import { destroySession, requireUser } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { ageFromBirthDate, MIN_AGE } from '../age.js';
import * as repo from '../db/repo.js';
import { cleanPrefs, analysisForProfile } from '../../../shared/personal-service.js';
const router = Router();
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const publicUser = u => ({ id: u._id, name: u.name, email: u.email });
const passwordValid = v => typeof v === 'string' && v.length >= 8 && Buffer.byteLength(v) <= 72;
router.post('/registro', authLimiter, handle(async (req, res) => {
  const { name, email, password, birthDate, analysis } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordValid(password)) return res.status(400).json({ error: 'Revisa nombre, email y contraseña (8 caracteres mínimo, 72 bytes máximo).' });
  if (!birthDate) return res.status(400).json({ code: 'BIRTH_DATE_REQUIRED', error: 'Indica tu fecha de nacimiento.' });
  const age = ageFromBirthDate(birthDate);
  if (age === null) return res.status(400).json({ code: 'INVALID_BIRTH_DATE', error: 'Fecha no válida.' });
  if (age < MIN_AGE) return res.status(403).json({ code: 'UNDERAGE', error: 'Debes tener al menos 16 años para crear una cuenta.' });
  if (analysis != null) return res.status(400).json({ error: 'Completa el análisis después de crear la cuenta.' });
  const client = authClient(req, res);
  const { data, error } = await client.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: name.trim().slice(0, 60), birth_date: birthDate }, emailRedirectTo: new URL('/api/auth/callback', process.env.PUBLIC_ORIGIN || 'http://localhost:8080').href } });
  authError(error, 'No se pudo registrar la cuenta. Revisa los datos o intenta entrar.');
  if (data.session) await client.auth.signOut({ scope: 'local' });
  // Always require email confirmation; a misconfigured Auth server must not open the app.
  res.status(201).json({ user: null, confirmationRequired: true, message: 'Revisa tu correo y confirma tu cuenta antes de entrar.' });
}));
router.post('/login', authLimiter, handle(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  req.auth = authClient(req, res);
  const { data, error } = await req.auth.auth.signInWithPassword({ email, password });
  authError(error, 'Email o contraseña incorrectos.');
  if (!data.user?.email_confirmed_at) return res.status(401).json({ code: 'EMAIL_NOT_CONFIRMED', error: 'Confirma tu correo antes de entrar.' });
  return requireUser(req, res, handle(async () => {
    const user = await repo.userById(req.sessionUser);
    if (!user) return res.status(401).json({ error: 'Perfil no disponible.' });
    res.json({ user: publicUser(user) });
  }));
}));
router.get('/yo', handle(async (req, res) => {
  if (!req.headers.cookie?.includes('stylingu_auth')) return res.json({ user: null });
  return requireUser(req, res, handle(async () => {
    const user = await repo.userById(req.sessionUser);
    res.json({ user: user ? publicUser(user) : null });
  }));
}));
router.post('/logout', handle(async (req, res) => { await destroySession(req, res); res.json({ ok: true }); }));
router.get('/callback', authLimiter, handle(async (req, res) => {
  const { token_hash, type, code } = req.query;
  const client = authClient(req, res);
  let result;
  if (typeof code === 'string' && code.length < 2048 && !type) result = await client.auth.exchangeCodeForSession(code);
  else if (typeof token_hash === 'string' && token_hash.length < 2048 && ['email', 'signup', 'recovery'].includes(type)) result = await client.auth.verifyOtp({ token_hash, type });
  else return res.status(400).json({ error: 'Enlace de confirmación no válido.' });
  authError(result.error, 'El enlace ha caducado o ya fue utilizado.');
  res.set('Referrer-Policy', 'no-referrer');
  if (type === 'recovery') {
    const digest = createHash('sha256').update(result.data.session.access_token).digest('hex');
    res.cookie('stylingu_recovery', digest, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600000 });
    return res.redirect('/#reset=supabase');
  }
  // Confirmation verifies the address; password login prevents an unsolicited link from logging a browser into another account.
  await client.auth.signOut({scope:'local'});
  res.redirect('/#auth=confirmed');
}));
router.get('/perfil', requireUser, handle(async (req, res) => {
  const user = await repo.userById(req.sessionUser);
  if (!user) return res.status(401).json({ error: 'Sesión sin cuenta.' });
  res.json({ preferences: user.preferences, analysis: user.analysis ?? null });
}));
router.put('/perfil', requireUser, handle(async (req, res) => {
  const user = await repo.userById(req.sessionUser);
  if (!user) return res.status(401).json({ error: 'Sesión sin cuenta.' });
  const body = req.body || {}, patch = {};
  if (['goals', 'jewelry', 'styles'].some(k => k in body)) patch.preferences = cleanPrefs(body);
  if ('analysis' in body) patch.analysis = analysisForProfile(user, body.analysis);
  const saved = await repo.saveUser(req.sessionUser, patch);
  res.json({ preferences: saved.preferences, analysis: saved.analysis });
}));
export { router as authRoutes };
export default router;
