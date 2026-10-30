// Postgres local para desarrollo, sin Docker ni cuenta en la nube.
// Uso: node scripts/dev-db.mjs  →  deja el clúster en backend/.pgdata
// Producción usa Supabase cambiando DATABASE_URL en backend/.env.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import path from 'node:path';
import EmbeddedPostgres from '../backend/node_modules/embedded-postgres/dist/index.js';
import pg from '../backend/node_modules/pg/lib/index.js';

const port = Number(process.env.PG_PORT) || 5433;
const url = `postgresql://postgres:postgres@127.0.0.1:${port}/stylingu`;

function portOpen() {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = value => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), ms);
      timer.unref?.();
    })
  ]);
}

// Distingue "mi clúster ya está arrancado" de "otro proceso ocupa el puerto".
async function alreadyRunning() {
  if (!(await portOpen())) return false;
  const client = new pg.Client({
    connectionString: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`,
    connectionTimeoutMillis: 3000
  });
  try {
    await withTimeout(client.connect(), 3000);
    await withTimeout(client.query('select 1'), 3000);
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

function reportRunning() {
  console.log(`Postgres local ya está en marcha en 127.0.0.1:${port} (base: stylingu).`);
  console.log(`DATABASE_URL=${url}`);
  console.log('No hay nada que hacer: puedes arrancar el servidor con npm start.');
}

if (await alreadyRunning()) {
  reportRunning();
  process.exit(0);
}
if (await portOpen()) {
  console.error(`El puerto ${port} está ocupado por otro proceso que no es este Postgres.`);
  console.error(`Libéralo o usa otro puerto: PG_PORT=${port + 1} npm run dev:db`);
  process.exit(1);
}

const dir = fileURLToPath(new URL(port === 5433 ? '../backend/.pgdata/' : `../backend/.pgdata-${port}/`, import.meta.url));
mkdirSync(dir, { recursive: true });
const db = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'postgres',
  password: 'postgres',
  port,
  persistent: true,
  onLog() {},
  onError() {}
});

if (!existsSync(path.join(dir, 'PG_VERSION'))) await db.initialise();
try {
  await db.start();
} catch (error) {
  // Carrera: otro proceso lo arrancó entre la comprobación y el start.
  if (await alreadyRunning()) {
    reportRunning();
    process.exit(0);
  }
  console.error('No se pudo arrancar el Postgres local: ' + (error?.message || error || 'error desconocido'));
  process.exit(1);
}

try {
  await db.createDatabase('stylingu');
} catch (error) {
  if (!/already exists/i.test(String(error?.message))) throw error;
}

const client = db.getPgClient('stylingu');
await client.connect();
try {
  const migrations = fileURLToPath(new URL('../db/migrations/', import.meta.url));
  await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const { rows } = await client.query('select name from schema_migrations');
  const done = new Set(rows.map(row => row.name));
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) {
    if (done.has(file)) continue;
    await client.query('begin');
    try {
      await client.query(readFileSync(migrations + file, 'utf8'));
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('Aplicada: ' + file);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
} finally {
  await client.end();
}

console.log(`Postgres local listo en 127.0.0.1:${port} (base: stylingu).`);
console.log(`DATABASE_URL=${url}`);
console.log('Ctrl+C para detenerlo.');

const stop = async () => {
  await db.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
await new Promise(() => {});
