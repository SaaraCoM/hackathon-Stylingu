import process from 'node:process';
import {Buffer} from 'node:buffer';
globalThis.Buffer??=Buffer;globalThis.process??=process;
import express from 'express';
import {configureNodeRuntime} from './edge/runtime-config.js';
import {verifyProxy} from './shared/proxy-auth.js';
import proxyPublicKey from './edge/proxy-key.js';
const functionName='__FUNCTION_NAME__',publicOrigin='__PUBLIC_ORIGIN__';
configureNodeRuntime(process,name=>Deno.env.get(name),{publicOrigin,release:'free-edge-v1'});
const {default:api}=await import('./backend/src/index.js');
const {products}=await import('./backend/src/product.js');
const outer=express();outer.disable('x-powered-by');
outer.use(express.raw({type:()=>true,limit:'6mb'}));
outer.use(async(req,res,next)=>{
 try{
  const prefix='/'+functionName;if(req.url!==prefix&&!req.url.startsWith(prefix+'/'))return res.status(404).json({code:'NOT_FOUND'});
  const body=Buffer.isBuffer(req.body)?req.body:Buffer.alloc(0);
  const origin=req.get('X-Stylingu-Origin'),ip=req.get('X-Stylingu-IP');
  // Supabase retira /functions/v1 antes de entregar la ruta a Express.
  const valid=origin===publicOrigin&&ip&&await verifyProxy({method:req.method,path:'/functions/v1'+req.originalUrl,origin,ip,time:req.get('X-Stylingu-Time'),body,cookie:req.get('Cookie')||'',contentType:req.get('Content-Type')||''},req.get('X-Stylingu-Signature'),proxyPublicKey);
  if(!valid)return res.status(403).set('Cache-Control','no-store').json({code:'PROXY_DENIED',error:'Acceso no permitido.'});
  req.verifiedClientIp=ip;req.url=req.url.slice(prefix.length)||'/';
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('Origin')!==publicOrigin)return res.status(403).json({code:'ORIGIN_DENIED'});
  try{req.body=body.length?JSON.parse(body.toString('utf8')):{};}catch{return res.status(400).json({code:'INVALID_JSON'});}req._body=true;
  const wake=req.method==='POST'&&req.path==='/api/personal/analysis-jobs'||req.method==='GET'&&req.path.startsWith('/api/jobs/');
  if(wake)res.on('finish',()=>{if(res.statusCode<300)EdgeRuntime.waitUntil(products.runOne().catch(()=>console.error('No se pudo ejecutar la cola de análisis.')));});
  next();
 }catch{res.status(503).json({code:'SECURITY_UNAVAILABLE'});}
});
outer.use(api);
outer.use((err,req,res,next)=>res.status(err.type==='entity.too.large'?413:500).json({code:err.type==='entity.too.large'?'BODY_TOO_LARGE':'INTERNAL_ERROR'}));
outer.listen(3000);
