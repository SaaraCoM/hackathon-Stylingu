import {parse} from 'cookie';
import { authClient, authError } from '../supabase.js';
import { runAsUser } from '../db/pool.js';

export async function destroySession(req, res) {
  const client = req.auth || authClient(req, res);
  const { error } = await client.auth.signOut({ scope: 'global' });
  res.clearCookie('stylingu_recovery', { path: '/' });
  authError(error, 'No se pudo revocar la sesión. Reintenta.');
}
export async function requireUser(req, res, next) {
  try {
    if(parse(req.headers.cookie || '').stylingu_recovery && req.originalUrl.split('?')[0] !== '/api/auth/reset-password')return res.status(401).json({error:'Finaliza la recuperación de contraseña antes de continuar.'});
    const client = req.auth || authClient(req, res);
    const { data, error } = await client.auth.getUser();
    if (error || !data.user || !data.user.email_confirmed_at) return res.status(401).json({ error: 'Sesión verificada requerida.' });
    // getSession is used only after the server has verified this user's token with Auth.
    const session = await client.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return res.status(401).json({ error: 'Sesión no válida.' });
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (claims.sub !== data.user.id || !claims.session_id) return res.status(401).json({ error: 'Sesión no válida.' });
    req.auth = client;
    req.authUser = data.user;
    req.sessionUser = req.userId = data.user.id;
    req.authSessionId = claims.session_id;
    return runAsUser(data.user.id, next, { accessToken: token, sessionId: claims.session_id });
  } catch (error) { next(error); }
}
