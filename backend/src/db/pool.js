// Conexión Postgres (Supabase) con `pg` directo.
// Un único pool por proceso; `connectDB` es idempotente y nunca lanza dos
// conexiones en paralelo aunque lleguen peticiones simultáneas al arrancar.
import pg from 'pg';

const { Pool, types } = pg;

// `date` debe llegar como 'YYYY-MM-DD', no como Date a medianoche local:
// el frontend compara fechas de plan con cadenas y una Date las rompe.
types.setTypeParser(1082, value => value);
// `numeric` (precio) como número: purchaseDecision compara con el presupuesto.
types.setTypeParser(1700, value => (value === null ? null : Number(value)));

let pool = null;
let connecting = null;
let failed = false;

export function databaseUrl() {
  return process.env.DATABASE_URL || '';
}

export async function connectDB() {
  if (pool) return pool;
  if (connecting) return connecting;
  const connectionString = databaseUrl();
  if (!connectionString) {
    failed = true;
    throw new Error('DATABASE_URL no configurada');
  }
  const created = new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000
  });
  // Un error de socket en un cliente idle no debe tumbar el proceso.
  created.on('error', () => { failed = true; });
  connecting = created
    .query('select 1')
    .then(() => {
      pool = created;
      failed = false;
      return pool;
    })
    .catch(error => {
      failed = true;
      created.end().catch(() => {});
      throw error;
    })
    .finally(() => {
      connecting = null;
    });
  return connecting;
}

export function dbState() {
  if (pool) return 'conectado';
  return failed ? 'error' : 'desconectado';
}

export async function query(text, params) {
  const active = await connectDB();
  return active.query(text, params);
}

export async function withTransaction(fn) {
  const active = await connectDB();
  const client = await active.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDB() {
  if (!pool) return;
  const active = pool;
  pool = null;
  await active.end().catch(() => {});
}

// 23505 = unique_violation, el equivalente al código 11000 de Mongo.
export const isUniqueViolation = error => error?.code === '23505';
