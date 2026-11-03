import {cleanUserMeta} from './ai-contract.js';
import { fail, cleanProfile, nextProfile, cleanGarment, dateKey, planWeek, purchaseDecision, tutorials, text, digest } from './product-domain.js';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUnique = error => error?.code === '23505';

export function productService({repo, personal, env={}}) {
 async function user(id) {const u=await repo.userById(id);if(!u)fail('Cuenta no disponible.','UNAUTHORIZED',401);return u;}
 async function profile(id) {return (await user(id)).profile||{version:0,declared:{}};}
 async function updateProfile(id,raw) {
  const u=await user(id),patch=cleanProfile(raw),previous=u.profile||{},p=nextProfile(previous,patch);
  const updated=await repo.updateProfileVersioned(id,previous.version??0,p);
  if(!updated)fail('El perfil cambió en otra ventana. Recarga antes de guardar.','STALE_PROFILE',409);
  return {profile:updated.profile,analysisStale:(u.analysis?.visualVersion||0)!==(p.visualVersion||0)};
 }
 async function requestAnalysis(id,payload,key) {
  await user(id);if(!/^[a-zA-Z0-9_-]{8,100}$/.test(key||''))fail('Falta clave de idempotencia.','IDEMPOTENCY_REQUIRED');
  const u=await user(id),input=u.photoInput||u.analysis;
  const d=u.profile?.declared||{},prefs=u.preferences||{};
  const declaredMeta={skinType:d.skinType||'No lo sé',allergies:d.restrictions||[],stylePreferences:[d.style,...(prefs.styles||[]),...(prefs.goals||[]).map(g=>({saber_colores:'Priorizar mi paleta',compras:'Comprar con intención',maquillaje:'Priorizar maquillaje'}[g]||''))].filter(Boolean).join('; ').slice(0,500)};
  payload={userMeta:cleanUserMeta({...declaredMeta,...(payload?.userMeta||{})})};
  if(!input?.photos?.face||!input?.photos?.body)fail('Sube las dos fotografías.','PHOTOS_REQUIRED');
  const fingerprint=digest({inputVersion:input.inputVersion,profileVersion:u.profile?.version||0,payload});
  const previous=await repo.jobByKey(id,key);
  if(previous) {if(previous.hash!==fingerprint)fail('Esta clave pertenece a otra solicitud.','IDEMPOTENCY_CONFLICT',409);return previous;}
  const active=await repo.activeJobByHash(id,fingerprint);if(active)return active;
  const day=new Date().toISOString().slice(0,10);
  const quota=await repo.consumeQuota(id,day,Number(env.ANALYSIS_DAILY_LIMIT)||10);
  if(!quota)fail('Has alcanzado la cuota diaria de análisis.','QUOTA_EXHAUSTED',429);
  try {
   return await repo.createJob({userId:id,key,hash:fingerprint,inputVersion:input.inputVersion,profileVersion:u.profile?.version||0,payload});
  } catch(e) {
   await repo.refundQuota(id,day);
   if(!isUnique(e))throw e;
   const existing=await repo.latestJobMatching(id,key,fingerprint);
   if(!existing||existing.hash!==fingerprint)fail('Clave ya utilizada.','IDEMPOTENCY_CONFLICT',409);
   return existing;
  }
 }
 async function job(id,jobId) {if(!UUID_RE.test(jobId||''))fail('Trabajo no encontrado.','NOT_FOUND',404);const j=await repo.jobByIdForUser(jobId,id);if(!j)fail('Trabajo no encontrado.','NOT_FOUND',404);return j;}
 async function runOne() {
  // A crashed request may already have incurred provider costs. Never silently replay it.
  await repo.expireStaleJobs(new Date(Date.now()-5*60000));
  const j=await repo.claimNextJob();
  if(!j)return false;
  try {
   const u=await user(j.userId),input=u.photoInput||u.analysis;
   if(input.inputVersion!==j.inputVersion||(u.profile?.version||0)!==j.profileVersion)fail('Las fotos o el perfil han cambiado.','STALE_INPUT',409);
   const result=await personal.analyze(j.userId,{...j.payload,expectedInputVersion:j.inputVersion,expectedProfileVersion:j.profileVersion},env);
   await repo.finishJob(j._id,{state:'completed',result});
  } catch(e) {await repo.finishJob(j._id,{state:'failed',error:{code:e.code||'ANALYSIS_FAILED',message:e.status?e.message:'No se pudo completar el análisis.'}});}
  return true;
 }
 async function garments(id) {return repo.listGarments(id);}
 async function saveGarment(id,raw,garmentId) {
  await user(id);const clean=cleanGarment(raw);
  if(garmentId) {if(!UUID_RE.test(garmentId))fail('Prenda no encontrada.','NOT_FOUND',404);const item=await repo.updateGarment(id,garmentId,clean);if(!item)fail('Prenda no encontrada.','NOT_FOUND',404);return item;}
  if(await repo.countGarments(id)>=200)fail('Límite de 200 prendas.','INVENTORY_LIMIT',409);
  return repo.createGarment(id,clean);
 }
 async function deleteGarment(id,garmentId) {if(!UUID_RE.test(garmentId))fail('Prenda no encontrada.','NOT_FOUND',404);const ok=await repo.deleteGarment(id,garmentId);if(!ok)fail('Prenda no encontrada.','NOT_FOUND',404);await repo.markPlansUnavailable(id,garmentId);}
 async function plans(id,from,to) {dateKey(from);dateKey(to);if(to<from||Date.parse(to)-Date.parse(from)>93*86400000)fail('Consulta como máximo 93 días.');return repo.listPlans(id,from,to);}
 async function generatePlans(id,body) {
  const p=await profile(id),result=planWeek(await garments(id),{...body,profileVersion:p.version||0});
  const end=new Date(Date.parse(body.from+'T12:00:00Z')+6*86400000).toISOString().slice(0,10);
  const existing=await plans(id,body.from,end),signatures=new Set(existing.map(p=>p.signature));
  // Preserve each existing day. Only assign unused combinations to missing dates.
  const available=result.plans.filter(p=>!signatures.has(p.signature));
  for(let i=0;i<7;i++) {
   const date=new Date(Date.parse(body.from+'T12:00:00Z')+i*86400000).toISOString().slice(0,10);
   if(existing.some(p=>p.date===date))continue;
   const next=available.shift();if(!next)break;
   await repo.upsertPlan(id,{...next,date});
  }
  const items=await plans(id,body.from,end);
  return {...result,plans:items,complete:items.length===7};
 }
 async function catalog(query='') {
  const q=text(query,120).toLocaleLowerCase();
  const products=await repo.listProducts(),variants=await repo.listVariants();
  return variants.map(v=>({...v,product:products.find(p=>p._id===v.productId)})).filter(v=>!q||[v.shade,v.product?.brand,v.product?.name,...v.barcodes].join(' ').toLowerCase().includes(q));
 }
 async function scan(id,body) {
  await user(id);
  if(body.variantId) {const variant=await repo.variantById(text(body.variantId));if(!variant) return {state:'unknown',candidates:[]};return {state:'identified',variant};}
  if(body.barcode) {const barcode=text(body.barcode,30);if(!/^\d{8,14}$/.test(barcode))fail('Código de barras no válido.');const candidates=await repo.variantsByBarcode(barcode);return {state:candidates.length===1?'identified':candidates.length?'ambiguous':'unknown',variant:candidates.length===1?candidates[0]:undefined,candidates};}
  const candidates=await catalog(body.query||'');return {state:candidates.length?'confirm_variant':'unknown',candidates};
 }
 async function recommend(id,variantId) {
  const u=await user(id),variant=await repo.variantById(text(variantId));
  const product=variant?await repo.productById(variant.productId):null;
  const offer=variant?await repo.latestOfferForVariant(variant._id):null;
  const owned=await repo.listOwned(id),feedback=await repo.listFeedback(id);
  const p=u.profile||{},current=(u.analysis?.visualVersion||0)===(p.visualVersion||0);
  return {...purchaseDecision({variant,product,offer,profile:{...p,palette:current?u.analysis?.colorimetry?.palette:[]},owned,feedback}),variant,product,offer};
 }
 async function feedback(id,body) {
  await user(id);const variantId=text(body.variantId),action=text(body.action);
  if(!['like','dislike','bought','owned'].includes(action))fail('Valoración no válida.');
  if(!await repo.variantExists(variantId))fail('Variante no encontrada.','NOT_FOUND',404);
  await repo.upsertFeedback(id,variantId,action);
  if(['bought','owned'].includes(action))await repo.upsertOwned(id,variantId);
  return {saved:true,effect:['bought','owned'].includes(action)?'Se tendrá en cuenta como producto propio.':action==='dislike'?'Se reducirá la prioridad de esta variante.':'Preferencia guardada para ordenar tu catálogo.'};
 }
 async function tutorialList(id) {const u=await user(id);return tutorials(u.analysis,u.profile);}
 async function progress(id,key,completed) {
  const ts=await tutorialList(id),t=ts.find(t=>`${t.id}:${t.analysisId}:${t.profileVersion}`===key);if(!t)fail('Tutorial desactualizado.','STALE_TUTORIAL',409);
  if(completed!==undefined) {if(!Array.isArray(completed)||completed.length>t.steps.length||completed.some(i=>!Number.isInteger(i)||i<0||i>=t.steps.length))fail('Progreso no válido.');await repo.setProgress(id,key,[...new Set(completed)]);}
  return repo.getProgress(id,key);
 }
 return {user,profile,updateProfile,requestAnalysis,job,runOne,garments,saveGarment,deleteGarment,plans,generatePlans,catalog,scan,recommend,feedback,tutorialList,progress};
}
