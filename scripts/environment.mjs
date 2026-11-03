import {readFileSync} from 'node:fs';
export function environmentTarget(env=process.env) {
 if(!['staging','production'].includes(env.DEPLOY_ENV))throw new Error('Explicit staging or production environment required');
 const targets=JSON.parse(readFileSync(new URL('../infra/environments.json',import.meta.url),'utf8'));
 const target=targets[env.DEPLOY_ENV];
 if(env.PUBLIC_ORIGIN&&env.PUBLIC_ORIGIN!==target.publicOrigin)throw new Error('Public origin does not match the selected environment');
 if(env.SUPABASE_PROJECT_REF&&env.SUPABASE_PROJECT_REF!==target.supabaseProjectRef)throw new Error('Supabase project does not match the selected environment');
 if(env.SUPABASE_URL&&env.SUPABASE_URL!=='https://'+target.supabaseProjectRef+'.supabase.co')throw new Error('Supabase URL does not match the selected environment');
 return target;
}
export function assertDatabaseTarget(value,target){
 let url;try{url=new URL(value);}catch{throw new Error('Invalid database configuration');}
 if(url.hostname==='db.'+target.supabaseProjectRef+'.supabase.co')return;
 if(url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).endsWith('.'+target.supabaseProjectRef))return;
 throw new Error('Database does not belong to the selected environment');
}
