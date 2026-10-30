import { Router } from 'express';
import { products as s, storage } from '../product.js';
import * as repo from '../db/repo.js';
import { requireUser,destroySession } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { metaClient,capabilities } from '../../../shared/meta-client.js';
import { decodePhoto } from '../../../shared/personal-service.js';
import { normalizePhoto } from '../images.js';
import { fail } from '../../../shared/product-domain.js';
export const productRoutes=Router();
const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const r=productRoutes;r.use(requireUser);
r.use((req,res,next)=>s.user(req.sessionUser).then(()=>next(),next));
r.get('/profile',handle(async(req,res)=>res.json({profile:await s.profile(req.sessionUser)})));
r.patch('/profile',handle(async(req,res)=>res.json(await s.updateProfile(req.sessionUser,req.body))));
r.post('/personal/analysis-jobs',aiLimiter,handle(async(req,res)=>{const j=await s.requestAnalysis(req.sessionUser,req.body||{},req.get('Idempotency-Key'));res.status(202).json({id:j._id,state:j.state});}));
r.get('/jobs/:id',handle(async(req,res)=>{const j=await s.job(req.sessionUser,req.params.id);res.json({id:j._id,state:j.state,result:j.result,error:j.error});}));
r.get('/garments',handle(async(req,res)=>res.json({items:await s.garments(req.sessionUser)})));
r.post('/garments',handle(async(req,res)=>res.status(201).json({item:await s.saveGarment(req.sessionUser,req.body)})));
r.patch('/garments/:id',handle(async(req,res)=>res.json({item:await s.saveGarment(req.sessionUser,req.body,req.params.id)})));
r.delete('/garments/:id',handle(async(req,res)=>{await s.deleteGarment(req.sessionUser,req.params.id);res.json({ok:true});}));
r.get('/outfit-plans',handle(async(req,res)=>res.json({plans:await s.plans(req.sessionUser,req.query.from,req.query.to)})));
r.post('/outfit-plans',handle(async(req,res)=>res.json(await s.generatePlans(req.sessionUser,req.body))));
r.patch('/outfit-plans/:date',handle(async(req,res)=>{if(!['accepted','worn','discarded'].includes(req.body?.status))fail('Estado no válido.');const item=await repo.setPlanStatus(req.sessionUser,req.params.date,req.body.status);if(!item)fail('Plan no encontrado.','NOT_FOUND',404);res.json({item});}));
r.get('/products',handle(async(req,res)=>res.json({items:await s.catalog(req.query.q||'')})));
r.post('/scans',aiLimiter,handle(async(req,res)=>{
 const body=req.body||{};
 if(body.image) {
  if(!capabilities(process.env).configured||capabilities(process.env).provider==='mock')return res.json({state:'manual_required',candidates:[],message:'Reconocimiento visual no configurado. Busca por marca y tono o código.'});
  const image=await normalizePhoto(decodePhoto(body.image));
  const candidates=await s.catalog('');
  const result=await metaClient(process.env).identify('data:'+image.mime+';base64,'+image.bytes.toString('base64'),candidates.map(v=>({id:v._id,brand:v.product?.brand,name:v.product?.name,shade:v.shade})));
  const known=candidates.filter(v=>result.ids.includes(v._id));
  return res.json({state:known.length?'confirm_variant':'unknown',candidates:known,message:'Confirma en el envase la variante y su mercado. La imagen no se conserva.'});
 }
 res.json(await s.scan(req.sessionUser,body));
}));
r.post('/purchase-recommendations',handle(async(req,res)=>res.json(await s.recommend(req.sessionUser,req.body?.variantId))));
r.post('/recommendation-feedback',handle(async(req,res)=>res.json(await s.feedback(req.sessionUser,req.body))));
r.get('/owned-cosmetics',handle(async(req,res)=>res.json({items:await repo.listOwned(req.sessionUser)})));
r.post('/owned-cosmetics',handle(async(req,res)=>res.json(await s.feedback(req.sessionUser,{variantId:req.body?.variantId,action:'owned'}))));
r.delete('/owned-cosmetics/:variantId',handle(async(req,res)=>{await repo.deleteOwned(req.sessionUser,req.params.variantId);res.json({ok:true});}));
r.get('/tutorials',handle(async(req,res)=>res.json({items:await s.tutorialList(req.sessionUser)})));
r.get('/tutorial-progress',handle(async(req,res)=>res.json(await s.progress(req.sessionUser,req.query.key))));
r.post('/tutorial-progress',handle(async(req,res)=>res.json(await s.progress(req.sessionUser,req.body?.key,req.body?.completed))));
r.delete('/account',handle(async(req,res)=>{
 if(req.body?.confirmation!=='ELIMINAR')fail('Escribe ELIMINAR para confirmar.');
 const userId=req.sessionUser;
 // Bloquea nuevas escrituras, revoca sesiones y borra la cuenta: las claves
 // foráneas `on delete cascade` arrastran fotos, armario, planes y trabajos.
 // Las claves de Storage se recogen antes del borrado. Reintentar es seguro.
 await repo.markDeleting(userId);
 await repo.deleteSessionsForUser(userId);
 const keys=await repo.deleteAccount(userId);
 await storage.remove(keys).catch(()=>{});
 await destroySession(req,res);
 res.json({ok:true});
}));
