// Base de datos efímera para tests: un clúster Postgres embebido por proceso y
// una base aislada por archivo de test. Sin Docker y sin servicios externos.
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from '../backend/node_modules/embedded-postgres/dist/index.js';
import pg from '../backend/node_modules/pg/lib/index.js';
import { closeDB } from '../backend/src/db/pool.js';

let cluster = null;
let port = 0;

async function startCluster() {
  if (cluster) return;
  port = 55000 + Math.floor(Math.random() * 2000);
  const dir = path.join(tmpdir(), `stylingu-pg-${process.pid}-${port}`);
  mkdirSync(dir, { recursive: true });
  cluster = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
    onLog() {},
    onError() {}
  });
  await cluster.initialise();
  await cluster.start();
}

export async function testDatabase(name = 'stylingu') {
  await startCluster();
  const database = `${name}_${process.pid}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  try {
    await cluster.createDatabase(database);
  } catch (error) {
    if (!/already exists/i.test(String(error?.message))) throw error;
  }
  const url = `postgresql://postgres:postgres@127.0.0.1:${port}/${database}`;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(readFileSync(new URL('./fixtures/supabase-platform.sql', import.meta.url), 'utf8'));
    const dir = fileURLToPath(new URL('../db/migrations/', import.meta.url));
    for (const file of readdirSync(dir).filter(f => f.endsWith('.sql')).sort()) {
      await client.query(readFileSync(dir + file, 'utf8'));
      await client.query('insert into schema_migrations(name)values($1) on conflict do nothing',[file]);
    }
  } finally {
    await client.end();
  }
  process.env.DATABASE_URL = url;
  // Un archivo de test distinto puede reutilizar el proceso: el pool anterior
  // apuntaría a la base equivocada.
  await closeDB();
  return url;
}

export async function stopCluster() {
  if (!cluster) return;
  const active = cluster;
  cluster = null;
  await active.stop().catch(() => {});
}
