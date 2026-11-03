import process from 'node:process';
import {Buffer} from 'node:buffer';
globalThis.Buffer??=Buffer;
globalThis.process??=process;
import express from 'express';

const functionName='__FUNCTION_NAME__';
const publicOrigin='__PUBLIC_ORIGIN__';
process.env.NODE_ENV='production';
process.env.DATABASE_URL=Deno.env.get('SUPABASE_DB_URL')||'';
process.env.SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
process.env.SUPABASE_SERVICE_ROLE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
process.env.META_AI_API_KEY=Deno.env.get('META_AI_API_KEY')||Deno.env.get('MODEL_API_KEY')||'';
process.env.MODEL_API_KEY=process.env.META_AI_API_KEY;
process.env.SMTP_URL=Deno.env.get('SMTP_URL')||'';
process.env.MAIL_FROM=Deno.env.get('MAIL_FROM')||'';
process.env.PUBLIC_ORIGIN=publicOrigin;
process.env.TRUST_PROXY='0';
process.env.PG_POOL_MAX='2';
process.env.AI_PROVIDER='meta';
process.env.RELEASE_VERSION='free-edge-v1';

const {default:api}=await import('./backend/src/index.js');
const {products}=await import('./backend/src/product.js');
const outer=express();outer.disable('x-powered-by');
outer.use((req,res,next)=>{
  const prefix='/'+functionName;
  if(req.url!==prefix&&!req.url.startsWith(prefix+'/'))return res.status(404).json({code:'NOT_FOUND'});
  req.url=req.url.slice(prefix.length)||'/';
  if(req.get('X-Stylingu-Origin')!==publicOrigin)return res.status(403).json({code:'ORIGIN_DENIED',error:'Origen no permitido.'});
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('Origin')&&req.get('Origin')!==publicOrigin)return res.status(403).json({code:'ORIGIN_DENIED',error:'Origen no permitido.'});
  const wake=req.method==='POST'&&req.path==='/api/personal/analysis-jobs'||req.method==='GET'&&req.path.startsWith('/api/jobs/');
  if(wake)res.on('finish',()=>{if(res.statusCode<300)EdgeRuntime.waitUntil(products.runOne().catch(()=>console.error('No se pudo ejecutar la cola de análisis.')));});
  next();
});
outer.use(api);
outer.listen(3000);
