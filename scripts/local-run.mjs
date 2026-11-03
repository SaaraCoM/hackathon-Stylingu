// In-memory environment launcher. The caller supplies the complete, visible Docker Compose command.
import {spawn,spawnSync} from 'node:child_process';
import pg from '../backend/node_modules/pg/lib/index.js';
import {randomBytes} from 'node:crypto';
const command=process.argv.slice(2);
if(command[0]!=='docker'||command[1]!=='compose')throw new Error('Usage: node scripts/local-run.mjs docker compose --profile development up --build --force-recreate');
const status=spawnSync('supabase',['status','--output','json'],{encoding:'utf8'});
if(status.status!==0)throw new Error('Start the local Supabase stack first; no CLI is installed automatically.');
const config=JSON.parse(status.stdout);
const adminUrl=config.DB_URL;
if(!adminUrl||!['localhost','127.0.0.1'].includes(new URL(adminUrl).hostname))throw new Error('Only the local Supabase database is allowed');
const migration=spawnSync(process.execPath,['scripts/migrate.mjs'],{stdio:'inherit',env:{...process.env,NODE_ENV:'development',DEPLOY_ENV:'local',DATABASE_URL:adminUrl}});
if(migration.status!==0)throw new Error('Local migration failed');
const db=new pg.Client({connectionString:adminUrl});await db.connect();
const runtime={};
try{
 for(const [role,key]of [['stylingu_api','DATABASE_URL'],['stylingu_jobs','JOBS_DATABASE_URL']]){
  const login=role+'_local',password=randomBytes(48).toString('base64url');
  const exists=(await db.query('select 1 from pg_roles where rolname=$1',[login])).rowCount;
  await db.query((exists?'alter':'create')+' role '+pg.escapeIdentifier(login)+' login noinherit nosuperuser nobypassrls password '+pg.escapeLiteral(password));
  await db.query('grant '+pg.escapeIdentifier(role)+' to '+pg.escapeIdentifier(login));
  const url=new URL(adminUrl);url.hostname='host.docker.internal';url.username=login;url.password=password;runtime[key]=url.href;
 }
}finally{await db.end();}
const child=spawn(command[0],command.slice(1),{stdio:'inherit',env:{...process.env,...runtime,RELEASE_VERSION:'local-'+Date.now(),SUPABASE_URL:'http://host.docker.internal:54321',SUPABASE_PUBLISHABLE_KEY:config.PUBLISHABLE_KEY||config.ANON_KEY,SUPABASE_SECRET_KEY:config.SECRET_KEY||config.SERVICE_ROLE_KEY}});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
