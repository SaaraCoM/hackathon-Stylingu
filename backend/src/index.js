import express from 'express';
import { fileURLToPath } from 'node:url';
import { connectDB,dbState } from './config/db.js';
import authRoutes from './routes/auth.js';
import { armario } from './routes/armario.js';
import { mountPersonal } from './personal.js';
import { productRoutes } from './routes/product.js';
import { recoveryRoutes } from './routes/recovery.js';
import { apiLimiter } from './middleware/rateLimit.js';
const app=express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use((req,res,next)=>{
 res.set('X-Content-Type-Options','nosniff').set('Referrer-Policy','same-origin').set('Permissions-Policy','camera=(self)');
 if(req.path.startsWith('/api/'))res.set('Cache-Control','private, no-store');
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('Origin')) {
  const expected=process.env.PUBLIC_ORIGIN||req.protocol+'://'+req.get('host');
  if(req.get('Origin')!==expected)return res.status(403).json({code:'ORIGIN_DENIED',error:'Origen no permitido.'});
 }
 next();
});
app.use('/api',apiLimiter);
app.use(express.json({limit:'6mb'}));
app.get('/api/public-config',(_req,res)=>res.json({turnstileRequired:process.env.NODE_ENV==='production'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'stylingu',version:process.env.RELEASE_VERSION||'development'}));
app.get('/api/ready',async(_req,res)=>{try{await connectDB();if(dbState()!=='conectado')throw new Error();res.json({ready:true});}catch{res.status(503).json({ready:false});}});
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
