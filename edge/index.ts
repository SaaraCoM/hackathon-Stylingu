import process from 'node:process';
import {Buffer} from 'node:buffer';
globalThis.Buffer??=Buffer;
globalThis.process??=process;
import express from 'express';
import {configureNodeRuntime} from './edge/runtime-config.js';

const functionName='__FUNCTION_NAME__';
const publicOrigin='__PUBLIC_ORIGIN__';
configureNodeRuntime(process,name=>Deno.env.get(name),{publicOrigin,release:'free-edge-v1'});

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
