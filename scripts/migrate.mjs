import {environmentTarget,assertDatabaseTarget} from './environment.mjs';
// Sole application migration history. A pending batch commits atomically, including its RLS policies.
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import pg from '../backend/node_modules/pg/lib/index.js';
import {connectionOptions} from '../backend/src/db/pool.js';
const envFile=fileURLToPath(new URL('../backend/.env',import.meta.url));
if(!process.env.DATABASE_URL&&existsSync(envFile))process.loadEnvFile(envFile);
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must be injected into the migration process.');
if(['staging','production'].includes(process.env.DEPLOY_ENV))assertDatabaseTarget(process.env.DATABASE_URL,environmentTarget());
const client=new pg.Client(connectionOptions());
await client.connect();
let file;
try{
 await client.query("select pg_advisory_lock(hashtext('stylingu-migrations'))");
 await client.query('begin');
 await client.query('create table if not exists public.schema_migrations(name text primary key,applied_at timestamptz not null default now())');
 const done=new Set((await client.query('select name from public.schema_migrations')).rows.map(row=>row.name));
 const dir=fileURLToPath(new URL('../db/migrations/',import.meta.url));
 const pending=readdirSync(dir).filter(name=>name.endsWith('.sql')&&!done.has(name)).sort();
 for(file of pending){
  if(file==='003_supabase_security.sql'&&(await client.query('select 1 from auth.users limit 1')).rowCount)throw new Error('Fresh installation requires an empty Auth project; no users will be imported or removed.');
  await client.query(readFileSync(dir+file,'utf8'));
  await client.query('insert into public.schema_migrations(name)values($1)',[file]);
 }
 await client.query('commit');
 console.log('Migration batch committed: '+pending.length+' file(s).');
}catch(error){await client.query('rollback').catch(()=>{});throw new Error('Migration failed at '+(file||'preflight')+': '+error.message);}
finally{await client.end();}
