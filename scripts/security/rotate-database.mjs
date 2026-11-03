import {environmentTarget,assertDatabaseTarget} from '../environment.mjs';
import pg from '../../backend/node_modules/pg/lib/index.js';
import {randomBytes} from 'node:crypto';
import {connectionOptions} from '../../backend/src/db/pool.js';
import {putStoreSecret,operation} from './platform-api.mjs';
const env=process.env;
if(!['staging','production'].includes(env.DEPLOY_ENV)||!env.ROTATION_DATABASE_URL)throw new Error('Protected rotation environment required');
const db=new pg.Client(connectionOptions(env.ROTATION_DATABASE_URL));assertDatabaseTarget(env.ROTATION_DATABASE_URL || env.MIGRATION_DATABASE_URL,environmentTarget(env));await db.connect();
try{
 await db.query("select pg_advisory_lock(hashtext($1))",['stylingu-rotation-'+env.DEPLOY_ENV]);
 const status=await operation(env,'status'),slot=status.active==='blue'?'green':'blue';
 const current=(await db.query("select state from private.credential_rotations where environment=$1 and provider='database'",[env.DEPLOY_ENV])).rows[0]?.state;
 if(current?.phase==='promoted') {
  if(Date.now()-current.promotedAt<86400000){console.log('Database rotation: grace period active.');process.exitCode=0;}
  else {
   if((await db.query("select 1 from public.analysis_jobs where state='processing' limit 1")).rowCount)throw new Error('Jobs still draining');
   const old=current.slot==='blue'?'green':'blue';
   for(const [role,suffix]of [['stylingu_api','database-url'],['stylingu_jobs','jobs-database-url']]){
    const login=role+'_'+old,password=randomBytes(48).toString('base64url');
    await db.query('select private.rotate_runtime_password($1,$2)',[login,password]);
    const url=new URL(env.ROTATION_DATABASE_URL);url.username=url.hostname.endsWith('.pooler.supabase.com')?login+'.'+env.SUPABASE_PROJECT_REF:login;url.password=password;
    await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+old+'-'+suffix,url.href);
   }
   await operation(env,'restart',{slot:old});await operation(env,'check',{slot:old});
   await db.query("update private.credential_rotations set state=$2,updated_at=now() where environment=$1 and provider='database'",[env.DEPLOY_ENV,{phase:'active',createdAt:Date.now()}]);
   console.log('Previous database passwords retired and inactive slot verified.');
  }
 } else if(current&&Date.now()-current.createdAt<90*86400000){console.log('Database credentials not due for rotation.');}
 else {
 // Never change the active login or the global postgres password. The old slot remains valid.
 for(const [role,suffix]of [['stylingu_api','database-url'],['stylingu_jobs','jobs-database-url']]){
  const login=role+'_'+slot,password=randomBytes(48).toString('base64url');
  await db.query('select private.rotate_runtime_password($1,$2)',[login,password]);
  const url=new URL(env.ROTATION_DATABASE_URL);url.username=url.hostname.endsWith('.pooler.supabase.com')?login+'.'+env.SUPABASE_PROJECT_REF:login;url.password=password;
  await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+slot+'-'+suffix,url.href);
 }
 await operation(env,'restart',{slot});await operation(env,'check',{slot});
 await operation(env,'promote',{slot,revision:status.revision,release:status.release,image:status.image});
 await db.query("insert into private.credential_rotations values($1,'database',$2,now())on conflict(environment,provider)do update set state=excluded.state,updated_at=now()",[env.DEPLOY_ENV,{phase:'promoted',slot,promotedAt:Date.now()}]);
 console.log(JSON.stringify({provider:'database',phase:'promoted',slot}));
 }
}catch{console.error('Database rotation stopped; active login retained. Inspect inactive slot before retry.');process.exitCode=1;}
finally{await db.end();}
