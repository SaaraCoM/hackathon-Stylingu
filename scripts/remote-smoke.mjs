import {environmentTarget} from './environment.mjs';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import {jsonRequest} from './security/platform-api.mjs';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
const env=process.env;environmentTarget(env);
for(const key of ['PUBLIC_ORIGIN','DEPLOY_SLOT','OPS_TOKEN','SUPABASE_URL','SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN','SUPABASE_PUBLISHABLE_KEY','SMOKE_FACE_PATH','SMOKE_BODY_PATH'])if(!env[key])throw new Error('Missing '+key+'; remote functional verification may not be skipped');
const management='/v1/projects/'+env.SUPABASE_PROJECT_REF;
const sb=(path,options)=>jsonRequest('https://api.supabase.com'+management+path,env.SUPABASE_ACCESS_TOKEN,options);
const config=await sb('/config/auth');
if(config.mailer_autoconfirm!==false||config.hook_before_user_created_enabled!==true)throw new Error('Email verification and signed signup hook must be configured');
const key=await sb('/api-keys',{method:'POST',body:{type:'secret',name:'smoke_'+Date.now()}});
const admin=createClient(env.SUPABASE_URL,key.api_key,{auth:{persistSession:false,autoRefreshToken:false}});
const users=[];
function agent(){
 const cookies=new Map();
 return async(path,{method='GET',body,expect=200,headers:extraHeaders={}}={})=>{
  const response=await fetch(env.PUBLIC_ORIGIN+'/__ops/candidate/'+env.DEPLOY_SLOT+path,{method,headers:{Authorization:'Bearer '+env.OPS_TOKEN,'X-Stylingu-Request':'1','Content-Type':'application/json',...extraHeaders,Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(160000)});
  for(const value of response.headers.getSetCookie()){const [name,...parts]=value.split(';')[0].split('=');cookies.set(name,parts.join('='));}
  if(response.status!==expect)throw new Error('Remote smoke failed: '+method+' '+path+' HTTP '+response.status);
  return response.json();
 };
}
try{
 const hook=await fetch(env.SUPABASE_URL+'/functions/v1/before-user-created',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 if(hook.status!==401)throw new Error('Unsigned Auth hook was not rejected');
 const invalid=await fetch(env.SUPABASE_URL+'/auth/v1/signup',{method:'POST',headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:'underage-'+randomUUID()+'@example.invalid',password:randomBytes(20).toString('base64url'),data:{name:'Underage test',birth_date:'2020-01-01'}})});
 if(invalid.ok)throw new Error('Direct Auth signup bypassed minimum age');
 const clients=[agent(),agent()];
 for(let i=0;i<2;i++){
  const email='smoke-'+randomUUID()+'@example.invalid',password=randomBytes(24).toString('base64url');
  const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Deployment verification',birth_date:'1990-01-01'}});
  if(error)throw new Error('Cannot create isolated smoke user');users.push(data.user.id);
  await clients[i]('/api/auth/login',{method:'POST',body:{email,password}});
 }
 const garment=await clients[0]('/api/garments',{method:'POST',expect:201,body:{name:'Smoke garment',category:'top',colors:['#FFFFFF']}});
 const other=await clients[1]('/api/garments');if(other.items.length)throw new Error('Cross-account inventory leak');
 await clients[1]('/api/garments/'+garment.item._id,{method:'DELETE',expect:404});
 const face='data:image/jpeg;base64,'+(await readFile(env.SMOKE_FACE_PATH)).toString('base64');
 const body='data:image/jpeg;base64,'+(await readFile(env.SMOKE_BODY_PATH)).toString('base64');
 const saved=await clients[0]('/api/personal/photos',{method:'POST',body:{face,body}});
 await clients[1](saved.photos.face,{expect:404});
 // Photos are actual approved JPEG fixtures, not arbitrary users' images or synthetic AI success.
 const response=await fetch(env.PUBLIC_ORIGIN+'/__ops/candidate/'+env.DEPLOY_SLOT+'/api/personal/analysis-jobs',{method:'POST',headers:{Authorization:'Bearer '+env.OPS_TOKEN,'X-Stylingu-Request':'1','Content-Type':'application/json','Idempotency-Key':randomUUID()},body:'{}'});
 // The analysis job must use the authenticated agent, preserving its cookie jar.
 // The unauthenticated attempt must fail and may never consume provider credits.
 if(response.status!==401)throw new Error('Analysis job accepted without a session');
 const job=await clients[0]('/api/personal/analysis-jobs',{method:'POST',expect:202,headers:{'Idempotency-Key':randomUUID()},body:{}});
 let completed;
 for(let attempt=0;attempt<150;attempt++){
  const state=await clients[0]('/api/jobs/'+job.id);
  if(state.state==='completed'){completed=state;break;}
  if(['failed','uncertain'].includes(state.state))throw new Error('Real provider analysis failed; candidate cannot be promoted');
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 if(!completed||completed.result?.analysis?.source!=='meta')throw new Error('Real analysis did not complete');
 const persisted=await clients[0]('/api/auth/perfil');if(persisted.analysis?.analysisId!==completed.result.analysis.analysisId)throw new Error('Analysis persistence failed');
 await clients[0]('/api/auth/logout',{method:'POST',body:{}});
 await clients[0]('/api/profile',{expect:401});
 console.log(JSON.stringify({remoteSmoke:'passed',checks:['signed-hook','age','auth','inventory-isolation','photo-isolation','real-analysis','persistence','logout']}));
}finally{
 for(const id of users){
  const {data}=await admin.storage.from('stylingu-photos').list(id+'/photos');
  if(data?.length)await admin.storage.from('stylingu-photos').remove(data.map(v=>id+'/photos/'+v.name));
  await admin.auth.admin.deleteUser(id);
 }
 await sb('/api-keys/'+key.id,{method:'DELETE'});
}
