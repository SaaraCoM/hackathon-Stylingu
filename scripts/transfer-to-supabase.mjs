// Por defecto solo inventaría. --apply copia a la producción confirmada.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import pg from '../backend/node_modules/pg/lib/index.js';
import {tables,transferData} from './transfer-data.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const sourceEnv=parseEnv(await fs.readFile(path.join(root,'backend/.env'),'utf8'));
const targetEnv=parseEnv(await fs.readFile(path.join(root,'.env.production'),'utf8'));
const apply=process.argv.includes('--apply');
const photoRoot=path.join(root,'backend/.photos');
const source=new pg.Client({connectionString:sourceEnv.DATABASE_URL,connectionTimeoutMillis:8000});
let target;
try{
  if(!sourceEnv.DATABASE_URL)throw new Error('SOURCE_DATABASE_URL_REQUIRED');
  if(sourceEnv.SUPABASE_URL||sourceEnv.SUPABASE_SERVICE_ROLE_KEY)throw new Error('SOURCE_MUST_USE_LOCAL_PHOTOS');
  await source.connect();
  if(!apply){
    const counts=[];
    for(const table of tables){const {rows:[r]}=await source.query(`select count(*)::int as count from public."${table}"`);counts.push({table,count:r.count});}
    console.log(JSON.stringify({mode:'plan',source:counts,targetConfigured:!!targetEnv.DATABASE_URL,storageConfigured:!!targetEnv.SUPABASE_SERVICE_ROLE_KEY}));
  }else{
    for(const key of ['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])if(!targetEnv[key])throw new Error('TARGET_CONFIG_REQUIRED:'+key);
    const origin=new URL(targetEnv.SUPABASE_URL);
    if(origin.origin!=='https://zbfxwbuuuzjzmsrraxkf.supabase.co')throw new Error('UNEXPECTED_SUPABASE_PROJECT');
    const database=new URL(targetEnv.DATABASE_URL);
    const username=decodeURIComponent(database.username);
    if(!(database.hostname==='db.zbfxwbuuuzjzmsrraxkf.supabase.co'||(database.hostname.endsWith('.pooler.supabase.com')&&username.endsWith('.zbfxwbuuuzjzmsrraxkf'))))throw new Error('UNEXPECTED_TARGET_DATABASE');
    target=new pg.Client({connectionString:targetEnv.DATABASE_URL,connectionTimeoutMillis:8000});await target.connect();
    const headers={apikey:targetEnv.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+targetEnv.SUPABASE_SERVICE_ROLE_KEY};
    const bucket=targetEnv.SUPABASE_STORAGE_BUCKET||'stylingu-photos';
    const bucketCheck=await target.query('select public from storage.buckets where id=$1',[bucket]);
    if(bucketCheck.rows.length!==1||bucketCheck.rows[0].public)throw new Error('PRIVATE_BUCKET_REQUIRED');
    const objectUrl=key=>{
      if(!/^[a-z0-9/_-]{8,200}$/i.test(key)||key.includes('..'))throw new Error('INVALID_PHOTO_KEY');
      return origin.origin+'/storage/v1/object/'+encodeURIComponent(bucket)+'/'+key.split('/').map(encodeURIComponent).join('/');
    };
    const request=(url,options={})=>fetch(url,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(30000)});
    const photos={
      async readSource(key){
        objectUrl(key);const file=path.resolve(photoRoot,key);const relative=path.relative(photoRoot,file);
        if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('INVALID_PHOTO_KEY');
        return fs.readFile(file);
      },
      async putIfAbsent(key,bytes,mime){
        const r=await request(objectUrl(key),{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false'},body:bytes});
        if(r.ok)return true;
        if(r.status===409)return false;
        if(r.status===400){const data=await r.json().catch(()=>({}));if(/already exists|duplicate/i.test(data.message||data.error||''))return false;}
        throw new Error('STORAGE_UPLOAD_FAILED:'+r.status);
      },
      async readTarget(key){const r=await request(objectUrl(key));if(!r.ok)throw new Error('STORAGE_READ_FAILED:'+r.status);return Buffer.from(await r.arrayBuffer());},
      async removeTarget(key){const r=await request(origin.origin+'/storage/v1/object/'+encodeURIComponent(bucket),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[key]})});if(!r.ok)throw new Error('STORAGE_CLEANUP_FAILED:'+r.status);}
    };
    console.log(JSON.stringify(await transferData({source,target,photos})));
  }
}catch(error){
  // No imprimir errores del driver: pueden contener consultas o datos privados.
  console.error('Transferencia detenida: '+(/^[A-Z_]+(?::[a-zA-Z0-9_]+)?$/.test(error.message)?error.message:'CHECK_CONFIGURATION_OR_SOURCE'));
  process.exitCode=1;
}finally{await target?.end().catch(()=>{});await source.end().catch(()=>{});}
