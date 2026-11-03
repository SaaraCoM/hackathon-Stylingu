import {environmentTarget,assertDatabaseTarget} from '../environment.mjs';
// Run in a protected bootstrap environment, never in the application container.
import pg from '../../backend/node_modules/pg/lib/index.js';
import {randomBytes} from 'node:crypto';
import {connectionOptions} from '../../backend/src/db/pool.js';
import {putStoreSecret,setGitHubSecret} from './platform-api.mjs';
const env=process.env;
if(!['staging','production'].includes(env.DEPLOY_ENV)||!env.MIGRATION_DATABASE_URL)throw new Error('Protected bootstrap environment required');
const db=new pg.Client(connectionOptions(env.MIGRATION_DATABASE_URL));assertDatabaseTarget(env.MIGRATION_DATABASE_URL,environmentTarget(env));await db.connect();
try{
 for(const slot of ['blue','green'])for(const [role,suffix] of [['stylingu_api','database-url'],['stylingu_jobs','jobs-database-url']]){
  const login=role+'_'+slot;
  // Do not overwrite a currently deployed login. Explicit rotation uses the inactive slot only.
  const present=(await db.query('select 1 from pg_roles where rolname=$1',[login])).rowCount;
  if(present)throw new Error('Login already exists; use the inactive-slot database rotation procedure');
  const password=randomBytes(48).toString('base64url');
  await db.query('create role '+pg.escapeIdentifier(login)+' login noinherit nosuperuser nobypassrls password '+pg.escapeLiteral(password));
  await db.query('grant '+pg.escapeIdentifier(role)+' to '+pg.escapeIdentifier(login));
  const url=new URL(env.MIGRATION_DATABASE_URL);url.username=url.hostname.endsWith('.pooler.supabase.com')?login+'.'+env.SUPABASE_PROJECT_REF:login;url.password=password;
  await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+slot+'-'+suffix,url.href);
 }
 const rotationLogin='stylingu_rotation_login',rotationPassword=randomBytes(48).toString('base64url');
 await db.query('create role '+pg.escapeIdentifier(rotationLogin)+' login inherit nosuperuser nobypassrls password '+pg.escapeLiteral(rotationPassword));
 await db.query('grant stylingu_rotation to '+pg.escapeIdentifier(rotationLogin));
 const rotationUrl=new URL(env.MIGRATION_DATABASE_URL);rotationUrl.username=rotationUrl.hostname.endsWith('.pooler.supabase.com')?rotationLogin+'.'+env.SUPABASE_PROJECT_REF:rotationLogin;rotationUrl.password=rotationPassword;
 await setGitHubSecret({...env,DEPLOY_ENV:env.DEPLOY_ENV+'-rotation'},'ROTATION_DATABASE_URL',rotationUrl.href);
 console.log('Runtime logins provisioned; credentials stored remotely.');
}catch{console.error('Provisioning interrupted; inspect role/Secret Store metadata before retrying.');process.exitCode=1;}
finally{await db.end();}
