import {environmentTarget,assertDatabaseTarget} from '../environment.mjs';
import {createHash} from 'node:crypto';
import pg from '../../backend/node_modules/pg/lib/index.js';
import {connectionOptions} from '../../backend/src/db/pool.js';
import {advanceRotation} from './rotation-machine.mjs';
import {cloudflareAPI,jsonRequest,putStoreSecret,setGitHubSecret,operation} from './platform-api.mjs';
const env=process.env, kind=process.argv[2];
if(!['supabase','cloudflare'].includes(kind)||!['staging','production'].includes(env.DEPLOY_ENV))throw new Error('Usage: rotate.mjs supabase|cloudflare; DEPLOY_ENV required');
for(const name of ['ROTATION_DATABASE_URL','PUBLIC_ORIGIN','OPS_TOKEN','CF_ROTATION_TOKEN','CLOUDFLARE_ACCOUNT_ID','CF_SECRET_STORE_ID'])if(!env[name])throw new Error('Missing '+name);
const db=new pg.Client(connectionOptions(env.ROTATION_DATABASE_URL));assertDatabaseTarget(env.ROTATION_DATABASE_URL || env.MIGRATION_DATABASE_URL,environmentTarget(env));await db.connect();
const cf=cloudflareAPI(env);
const sb=(path,opts)=>jsonRequest('https://api.supabase.com/v1/projects/'+env.SUPABASE_PROJECT_REF+path,env.SUPABASE_ROTATION_TOKEN,opts);
const save=state=>db.query('insert into private.credential_rotations(environment,provider,state)values($1,$2,$3)on conflict(environment,provider)do update set state=excluded.state,updated_at=now()',[env.DEPLOY_ENV,kind,state]);
try{
 await db.query("select pg_advisory_lock(hashtext($1))",['stylingu-rotation-'+env.DEPLOY_ENV]);
 let state=(await db.query('select state from private.credential_rotations where environment=$1 and provider=$2',[env.DEPLOY_ENV,kind])).rows[0]?.state;
 if(!state){
  const id=env[kind==='supabase'?'SUPABASE_CURRENT_KEY_ID':'CF_CURRENT_TOKEN_ID'];
  if(!id)throw new Error('Register the current credential id before rotation');
  state={phase:'active',currentId:id,createdAt:Date.now()};await save(state);
 }
 const provider=kind==='supabase'?{
  async prepare(s){
   if((await sb('/api-keys/'+s.currentId)).type!=='secret')throw new Error('Migrate legacy keys before enabling independent key rotation');
   const status=await operation(env,'status');
   const slot=status.active==='blue'?'green':'blue';
   const name='stylingu_'+env.DEPLOY_ENV+'_'+new Date().toISOString().slice(0,10).replaceAll('-','');
   const keys=await sb('/api-keys');
   let key=keys.find(k=>k.name===name&&k.id!==s.currentId);
   if(key)key=await sb('/api-keys/'+key.id+'?reveal=true');else key=await sb('/api-keys',{method:'POST',body:{type:'secret',name}});
   if(!key.api_key)throw new Error('Management API did not return a usable candidate key');
   await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+slot+'-supabase-secret',key.api_key);
   await operation(env,'restart',{slot});
   return {id:key.id,slot,revision:status.revision,release:status.release,image:status.image,fingerprint:createHash('sha256').update(key.api_key).digest('hex')};
  },
  async verifyCandidate(s){const check=await operation(env,'check',{slot:s.candidate.slot});return check.healthy===true&&check.keyFingerprint===s.candidate.fingerprint;},
  async promote(s){const current=await operation(env,'status');if(current.active===s.candidate.slot)return;await operation(env,'promote',{slot:s.candidate.slot,revision:s.candidate.revision,release:s.candidate.release,image:s.candidate.image});},
  async consumersReady(s){
   const current=await operation(env,'status');if(current.active!==s.candidate.slot)return false;
   const old=s.candidate.slot==='blue'?'green':'blue';
   const key=await sb('/api-keys/'+s.candidate.id+'?reveal=true');
   if(!key.api_key)return false;
   await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+old+'-supabase-secret',key.api_key);
   await operation(env,'restart',{slot:old});
   const checks=await Promise.all([old,s.candidate.slot].map(slot=>operation(env,'check',{slot})));
   if(checks.some(check=>check.keyFingerprint!==s.candidate.fingerprint))return false;
   const busy=await db.query("select 1 from public.analysis_jobs where state='processing' limit 1");
   return !busy.rowCount;
  },
  revoke:id=>sb('/api-keys/'+id,{method:'DELETE'})
 }:{
  async prepare(){
   for(const k of ['CF_DEPLOY_TOKEN_POLICY_JSON','ROTATION_GITHUB_TOKEN','GITHUB_REPOSITORY'])if(!env[k])throw new Error('Missing '+k);
   const policy=JSON.parse(env.CF_DEPLOY_TOKEN_POLICY_JSON);
   const token=await cf('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/tokens',{method:'POST',body:{name:'stylingu_'+env.DEPLOY_ENV+'_'+Date.now(),policies:policy,expires_on:new Date(Date.now()+120*86400000).toISOString()}});
   const verify=await jsonRequest('https://api.cloudflare.com/client/v4/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/tokens/verify',token.value);
   if(!verify.success)throw new Error('Candidate token invalid');
   await setGitHubSecret(env,'CLOUDFLARE_API_TOKEN',token.value);
   return {id:token.id};
  },
  async verifyCandidate(s){return (await cf('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/tokens/'+s.candidate.id)).status==='active';},
  async promote(){},
  async consumersReady(s){
   const runs=await jsonRequest('https://api.github.com/repos/'+env.GITHUB_REPOSITORY+'/actions/runs?per_page=100',env.ROTATION_GITHUB_TOKEN);
   if(runs.total_count>100&&runs.workflow_runs.at(-1)?.created_at>new Date(s.preparedAt).toISOString())return false;
   return !runs.workflow_runs.some(r=>r.status!=='completed'&&Date.parse(r.created_at)<s.promotedAt);
  },
  revoke:id=>cf('/accounts/'+env.CLOUDFLARE_ACCOUNT_ID+'/tokens/'+id,{method:'DELETE'})
 };
 const next=await advanceRotation({state,save,provider,periodMs:(kind==='supabase'?30:90)*86400000});
 console.log(JSON.stringify({provider:kind,environment:env.DEPLOY_ENV,phase:next.phase,currentId:next.currentId}));
}catch{console.error('Rotation stopped safely; check credential metadata and provider permissions. No current credential was intentionally revoked without convergence.');process.exitCode=1;}
finally{await db.end();}
