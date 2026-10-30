// Aplica las migraciones SQL pendientes y registra cada una en schema_migrations.
// Uso: node scripts/migrate.mjs   (requiere DATABASE_URL)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from '../backend/node_modules/pg/lib/index.js';

const envFile = fileURLToPath(new URL('../backend/.env', import.meta.url));
if (!process.env.DATABASE_URL && existsSync(envFile)) process.loadEnvFile(envFile);
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL. Copia backend/.env.example a backend/.env y rellénala.');
  process.exit(1);
}

const dir = fileURLToPath(new URL('../db/migrations/', import.meta.url));
const files = readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const { rows } = await client.query('select name from schema_migrations');
  const done = new Set(rows.map(row => row.name));
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(dir + file, 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('Aplicada: ' + file);
    } catch (error) {
      await client.query('rollback');
      throw new Error(file + ': ' + error.message);
    }
  }
  console.log('Esquema al día (' + files.length + ' migraciones).');
} finally {
  await client.end();
}
