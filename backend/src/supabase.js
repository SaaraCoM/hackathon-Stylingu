import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'cookie';
import { PersonalError } from '../../shared/personal-error.js';

let testFetch;
// Dependency injection is available only in the test process; there is no mock auth provider in production.
export function setAuthTransportForTests(fetcher) {
  if (process.env.NODE_ENV !== 'test') throw new Error('Test transport is unavailable.');
  testFetch = fetcher;
}
function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new PersonalError('Autenticación no configurada.', 503, 'AUTH_NOT_CONFIGURED');
  return { url, key };
}
export function authClient(req, res) {
  const { url, key } = config();
  const cookies = parse(req.headers.cookie || '');
  return createServerClient(url, key, {
    global: testFetch ? { fetch: testFetch } : undefined,
    cookieOptions: { name: 'stylingu_auth', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 },
    cookies: {
      getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
      setAll: values => {
        res.set('Cache-Control', 'private, no-store');
        for (const { name, value, options } of values) {
          cookies[name] = value;
          res.cookie(name, value, { ...options, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
        }
      }
    }
  });
}
export function adminClient() {
  const { url } = config();
  if (!process.env.SUPABASE_SECRET_KEY) throw new PersonalError('Operación administrativa no configurada.', 503, 'AUTH_NOT_CONFIGURED');
  return createClient(url, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: testFetch ? { fetch: testFetch } : undefined
  });
}
export function authError(error, fallback = 'No se pudo completar la autenticación.') {
  if (!error) return;
  const code = error.code === 'email_not_confirmed' ? 'EMAIL_NOT_CONFIRMED' : 'AUTH_FAILED';
  const message = code === 'EMAIL_NOT_CONFIRMED' ? 'Confirma tu correo antes de entrar.' : fallback;
  throw new PersonalError(message, error.status >= 500 ? 503 : 401, code);
}
