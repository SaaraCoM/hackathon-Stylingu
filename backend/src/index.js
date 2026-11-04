import express from 'express';
import { fileURLToPath } from 'node:url';
import { connectDB,dbState } from './config/db.js';
import authRoutes from './routes/auth.js';
import { armario } from './routes/armario.js';
import { mountPersonal } from './personal.js';
import { productRoutes } from './routes/product.js';
import { recoveryRoutes } from './routes/recovery.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { verifyTurnstile } from './middleware/turnstile.js';
import { defaultSecurityHeadersPolicy, defaultCorsAndOriginPolicy } from '../../shared/security-policy.js';
const app=express();
app.disable('x-powered-by');
if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
app.use((req,res,next)=>{
 defaultSecurityHeadersPolicy.applyToExpressResponse(res);
 if(req.path.startsWith('/api/'))res.set('Cache-Control','private, no-store');
 if(defaultCorsAndOriginPolicy.hasForbiddenClientCredentialHeaders(function(name){return req.get(name);})) {
  return res.status(400).json({code:'CLIENT_API_KEY_FORBIDDEN',error:'La clave de Meta AI se gestiona exclusivamente en el servidor.'});
 }
 const origin=req.get('Origin');
 const expected=process.env.PUBLIC_ORIGIN||req.protocol+'://'+req.get('host');
 if(origin) {
  const trusted=defaultCorsAndOriginPolicy.isOriginTrusted(origin,expected,process.env.ALLOWED_ORIGINS);
  if(trusted) {
   const corsHeaders=defaultCorsAndOriginPolicy.buildCorsHeaders(origin,expected,process.env.ALLOWED_ORIGINS);
   for(const [k,v] of Object.entries(corsHeaders))res.set(k,v);
   if(req.method==='OPTIONS'&&req.path.startsWith('/api/'))return res.status(204).end();
  } else if(!['GET','HEAD'].includes(req.method)||req.path.startsWith('/api/personal')||req.path.startsWith('/api/scans')) {
   return res.status(403).json({code:'ORIGIN_DENIED',error:'Origen no permitido.'});
  }
 }
 next();
});
app.use('/api',apiLimiter);
app.use(express.json({limit:'6mb'}));
app.get('/api/public-config',(_req,res)=>res.json({turnstileRequired:process.env.NODE_ENV==='production',sitekey:process.env.TURNSTILE_SITE_KEY||undefined}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'stylingu',version:process.env.RELEASE_VERSION||'development'}));
app.get('/api/ready',async(_req,res)=>{try{await connectDB();if(dbState()!=='conectado')throw new Error();res.json({ready:true});}catch{res.status(503).json({ready:false});}});
// The Edge deployment verifies at its proxy; the standalone server verifies here.
app.use('/api/auth',(req,res,next)=>{
 if(!app.locals.standaloneProduction)return next();
 verifyTurnstile(req,process.env).then(()=>next(),next);
});
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
 const safeMessage=status===413?'Las fotos superan el tamaño permitido.':status===500?'Error interno del servidor.':err.status?err.message:'Solicitud no válida.';
 res.status(status).json({code,error:safeMessage});
});
export default app;
