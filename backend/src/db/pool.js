import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
const { Pool, types } = pg;
types.setTypeParser(1082, value => value);
types.setTypeParser(1700, value => value === null ? null : Number(value));
const identities = new AsyncLocalStorage();
const transactions = new AsyncLocalStorage();
export const currentIdentity = () => identities.getStore();
export const runAsUser = (userId, fn, extra = {}) => identities.run({ userId, ...extra }, fn);
let pool, connecting, failed = false;
export const databaseUrl = () => process.env.DATABASE_URL || '';
export function connectionOptions(value = databaseUrl()) {
  let url;try {url=new URL(value);}catch{throw new Error('Invalid PostgreSQL connection configuration.');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Invalid PostgreSQL connection protocol.');
  const local = ['localhost', '127.0.0.1', 'db', 'host.docker.internal'].includes(url.hostname);
  const secure = process.env.NODE_ENV === 'production' || !local;
  // URL parameters must not silently override certificate validation.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return { connectionString: url.href, ...(secure ? { ssl: { rejectUnauthorized: true, ...(process.env.PG_SSL_CA ? { ca: process.env.PG_SSL_CA } : {}) } } : {}) };
}
export async function connectDB() {
  if (pool) return pool;
  if (connecting) return connecting;
  if (!databaseUrl()) throw new Error('DATABASE_URL no configurada');
  const created = new Pool({ ...connectionOptions(), max: Number(process.env.PG_POOL_MAX) || 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 });
  created.on('error', () => { failed = true; });
  connecting = (async () => {
    try {
      const { rows: [role] } = await created.query('select rolsuper, rolbypassrls from pg_roles where rolname=current_user');
      if (process.env.NODE_ENV === 'production' && (role.rolsuper || role.rolbypassrls || !['stylingu_api', 'stylingu_jobs'].includes(process.env.DB_ROLE))) throw new Error('Postgres runtime requiere un rol restringido y DB_ROLE explícito.');
      pool = created; failed = false; return pool;
    } catch (error) { failed = true; await created.end(); throw error; }
    finally { connecting = null; }
  })();
  return connecting;
}
export const dbState = () => failed ? 'error' : pool ? 'conectado' : 'desconectado';
export async function withTransaction(fn) {
  const existing = transactions.getStore();
  if (existing) return fn(existing);
  const client = await (await connectDB()).connect();
  try {
    await client.query('begin');
    const role = process.env.DB_ROLE;
    if (role) {
      if (!['stylingu_api', 'stylingu_jobs'].includes(role)) throw new Error('DB_ROLE no admitido.');
      await client.query('set local role ' + role);
    }
    const identity = currentIdentity();
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: identity?.userId || null, session_id: identity?.sessionId || null, job_id: identity?.jobId || null, role: 'authenticated' })]);
    const value = await transactions.run(client, () => fn(client));
    await client.query('commit');
    failed = false;
    return value;
  } catch (error) { await client.query('rollback').catch(() => {}); throw error; }
  finally { client.release(); }
}
export const query = (text, params) => withTransaction(client => client.query(text, params));
export async function closeDB() {
  const active = pool; pool = null;
  if (active) await active.end();
}
export const isUniqueViolation = error => error?.code === '23505';
