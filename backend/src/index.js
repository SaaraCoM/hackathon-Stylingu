import express from 'express';
import { fileURLToPath } from 'node:url';
import { connectDB,dbState,query } from './config/db.js';
import authRoutes from './routes/auth.js';
import { armario } from './routes/armario.js';
import { mountPersonal } from './personal.js';
import { productRoutes } from './routes/product.js';
import { recoveryRoutes } from './routes/recovery.js';
import { securityHeaders, csrfGuard } from './middleware/security.js';
import { workerHealthy } from './worker-health.js';
import { apiLimiter } from './middleware/rateLimit.js';
import * as photoStorage from '../../shared/storage.js';
import sharp from 'sharp';
import {randomUUID,createHash} from 'node:crypto';
const app=express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use(securityHeaders);
app.use('/api', csrfGuard);
app.use(express.json({limit:'12mb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'stylingu',version:process.env.RELEASE_VERSION||'development'}));
app.get('/api/ready',async(_req,res)=>{try{await query('select 1');if(dbState()!=='conectado')throw new Error();if(!workerHealthy())throw new Error();res.json({ready:true});}catch{res.status(503).json({ready:false});}});
// Reachable through private service bindings only; the public router denies /internal/*.
app.post('/internal/ready',async(_req,res)=>{
 if(_req.get('X-Stylingu-Internal')!=='1'||_req.get('Origin'))return res.status(404).end();
 const key='healthchecks/'+randomUUID();
 try {
  const bytes=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).jpeg().toBuffer();
  await photoStorage.put(key,bytes,'image/jpeg');
  const read=await photoStorage.get(key);
  if(!read?.equals(bytes))throw new Error();
  await photoStorage.remove([key]);res.json({storage:true,keyFingerprint:createHash('sha256').update(process.env.SUPABASE_SECRET_KEY||'').digest('hex')});
 }catch{await photoStorage.remove([key]).catch(()=>{});res.status(503).json({storage:false});}
});
app.use('/api',apiLimiter);
app.use('/api/auth',authRoutes);
app.use('/api/auth',recoveryRoutes);
app.use('/api',productRoutes);
mountPersonal(app);
app.use('/api/armario',armario);
app.use('/api',(_req,res)=>res.status(404).json({code:'NOT_FOUND',error:'Ruta no encontrada.'}));
app.use(express.static(fileURLToPath(new URL('../../frontend/public',import.meta.url))));
app.get('/favicon.ico',(_req,res)=>res.status(204).end());
app.use((err,_req,res,_next)=>{
 // 23505 (unique_violation) es el equivalente Postgres del 11000 de Mongo.
 const unique=err.code==='23505';
 const status=err.type==='entity.too.large'?413:err.type==='entity.parse.failed'?400:unique?409:err.status||500;
 const code=typeof err.code==='string'&&!/^\d+$/.test(err.code)?err.code:status===409?'CONFLICT':status===500?'INTERNAL_ERROR':'INVALID_INPUT';
 res.status(status).json({code,error:status===413?'Las fotos superan el tamaño permitido.':err.status?err.message:status===500?'Error interno del servidor.':'Solicitud no válida.'});
});
export default app;
