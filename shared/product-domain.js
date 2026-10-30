import { createHash } from 'node:crypto';
import { PersonalError } from './personal-error.js';
export const fail = (message, code='INVALID_INPUT', status=400) => { throw new PersonalError(message,status,code); };
export const text = (v,max=160) => { if(typeof v!=='string'||v.length>max||/[<>\u0000]/.test(v)) fail('Revisa los campos de texto.'); return v.trim(); };
export const list = (v,max=20) => { if(!Array.isArray(v)||v.length>max) fail('Lista no válida.'); return [...new Set(v.map(x=>text(x,100)).filter(Boolean))]; };
export function record(v) { if(!v||typeof v!=='object'||Array.isArray(v)) fail('Objeto JSON requerido.'); return v; }
export const hex = v => { if(typeof v!=='string'||!/^#[a-f0-9]{6}$/i.test(v)) fail('Color no válido.'); return v.toUpperCase(); };
export const digest = v => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const PROFILE_FIELDS=['hairColor','dyedHair','eyeColor','eyelid','style','finish','intensity','brands','budget','currency','restrictions','skinType'];
export const VISUAL_FIELDS=['hairColor','dyedHair','eyeColor','eyelid','style','intensity'];
export function cleanProfile(raw) {
 record(raw); if(Object.keys(raw).some(k=>!PROFILE_FIELDS.includes(k))) fail('Campo de perfil no admitido.');
 const out={};
 for(const [k,v] of Object.entries(raw)) {
  if(['brands','restrictions'].includes(k)) out[k]=list(v,15);
  else if(k==='dyedHair') { if(![true,false,null].includes(v)) fail('Indica si el cabello está teñido.'); out[k]=v; }
  else if(k==='budget') { if(v!==null&&(!Number.isFinite(v)||v<0||v>100000)) fail('Presupuesto no válido.');out[k]=v; }
  else { out[k]=text(v,k==='style'?500:100); }
 }
 if(out.currency&&!/^[A-Z]{3}$/.test(out.currency)) fail('Usa un código de moneda de tres letras.');
 if(out.intensity&&!['suave','media','intensa','no determinado'].includes(out.intensity)) fail('Intensidad no válida.');
 if(out.skinType&&!['No lo sé','Seca','Grasa','Mixta','Normal'].includes(out.skinType)) fail('Tipo de piel no válido.');
 return out;
}
export function nextProfile(current={},patch) {
 const changes=Object.keys(patch).filter(k=>JSON.stringify(current.declared?.[k])!==JSON.stringify(patch[k]));
 if(!changes.length) return current;
 const now=new Date().toISOString();
 return {version:(current.version||0)+1,visualVersion:(current.visualVersion||0)+(changes.some(k=>VISUAL_FIELDS.includes(k))?1:0),declared:{...current.declared,...patch},updatedAt:now,corrections:[...(current.corrections||[]),{at:now,fields:changes,source:'declared'}].slice(-100)};
}
export function cleanGarment(raw) {
 record(raw); const category=text(raw.category||'');
 if(!['top','bottom','dress','outerwear','shoes','accessory'].includes(category)) fail('Categoría de prenda no válida.');
 const name=text(raw.name||'',120); if(!name) fail('Escribe un nombre.');
 const colors=list(raw.colors||[],8).map(hex);
 return {name,category,colors,season:list(raw.season||[],4),occasions:list(raw.occasions||[],10),excludes:list(raw.excludes||[],20),available:raw.available!==false};
}
export function dateKey(s) { if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T12:00:00Z'))||new Date(s+'T12:00:00Z').toISOString().slice(0,10)!==s) fail('Fecha no válida.');return s; }
export function planWeek(garments,{from,timeZone,profileVersion=0,occasion='',season=''}={}) {
 dateKey(from);try{new Intl.DateTimeFormat('es',{timeZone}).format();}catch{fail('Zona horaria no válida.');}
 const available=garments.filter(g=>g.available&&(!occasion||!g.occasions.length||g.occasions.includes(occasion))&&(!season||!g.season.length||g.season.includes(season)));
 const by=category=>available.filter(g=>g.category===category);
 const bases=[...by('dress').map(g=>[g]),...by('top').flatMap(t=>by('bottom').map(b=>[t,b]))];
 const combinations=[];
 for(const base of bases) for(const shoe of [null,...by('shoes')]) for(const outer of [null,...by('outerwear')]) {
  const selected=[...base,shoe,outer].filter(Boolean);
  const ids=selected.map(g=>String(g._id)).sort();
  if(selected.some(g=>(g.excludes||[]).some(id=>ids.includes(id)))) continue;
  const signature=ids.join(':');
  if(!combinations.some(c=>c.signature===signature)) combinations.push({garmentIds:ids,signature,labels:selected.map(g=>g.name),colors:[...new Set(selected.flatMap(g=>g.colors))],origin:'owned'});
  if(combinations.length>=1000) break;
 }
 const plans=combinations.slice(0,7).map((c,i)=>({...c,date:new Date(Date.parse(from+'T12:00:00Z')+i*86400000).toISOString().slice(0,10),timeZone,profileVersion,status:'proposed',explanation:'Combinación de prendas disponibles; respeta las exclusiones y la ocasión indicadas.'}));
 return {plans,complete:plans.length===7,code:plans.length===7?'OK':'INSUFFICIENT_GARMENTS',message:plans.length===7?'Semana preparada.':`Tu inventario permite ${plans.length} combinaciones distintas. Añade prendas o revisa su disponibilidad.`};
}
export function purchaseDecision({variant,product,offer,profile={},owned=[],feedback=[]}) {
 if(!variant) return {state:'confirm_variant',label:'Confirma el tono',reasons:['No se ha identificado una variante exacta.']};
 const d=profile.declared||{},reasons=[],missing=[];
 if(d.restrictions?.length) return {state:'insufficient',label:'No puedo valorarlo todavía',reasons:['Tienes restricciones declaradas. Esta ficha no acredita su cumplimiento; revisa la composición del envase.'],profileVersion:profile.version||0};
 if(owned.some(o=>o.variantId===String(variant._id))) return {state:'low_priority',label:'No lo priorizaría',reasons:['Ya tienes esta misma variante.'],profileVersion:profile.version||0};
 if(feedback.some(f=>f.variantId===String(variant._id)&&f.action==='dislike')) reasons.push('Has indicado que esta variante no te gusta.');
 if(d.finish&&variant.finish&&d.finish!==variant.finish) reasons.push('El acabado no coincide con tu preferencia.');
 const fresh=offer?.checkedAt&&Date.now()-Date.parse(offer.checkedAt)<30*86400000;
 if(d.budget!=null) {
  if(!fresh||offer.currency!==d.currency) missing.push('Falta un precio reciente en tu moneda.');
  else if(offer.price>d.budget) reasons.push('Supera tu presupuesto declarado.');
 }
 if(reasons.length) return {state:'unfavorable',label:'Buscaría otra opción',reasons:reasons.slice(0,3),profileVersion:profile.version||0};
 // A commercial shade name alone is not a calibrated colour measurement.
 if(!variant.colorVerified||!variant.hex) missing.push('No disponemos de color verificado para comparar este tono con tu paleta.');
 if(!profile.palette?.length) missing.push('Falta una paleta personal vigente.');
 if(missing.length) return {state:'insufficient',label:'No puedo valorarlo todavía',reasons:missing.slice(0,3),profileVersion:profile.version||0};
 const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
 const distance=Math.min(...profile.palette.map(h=>Math.sqrt(rgb(h).reduce((sum,n,i)=>sum+(n-rgb(variant.hex)[i])**2,0))));
 return {state:distance<=100?'favorable':'unfavorable',label:distance<=100?'Buena compra para ti':'Buscaría otra opción',reasons:[distance<=100?'El tono está próximo a tu paleta según nuestra regla de distancia RGB.':'El tono se aleja de tu paleta según nuestra regla de distancia RGB.','Afinidad orientativa del sistema; no es una probabilidad científica.'],profileVersion:profile.version||0};
}
export function tutorials(analysis,profile={}) {
 if(!analysis?.analyzedAt) return [];
 const m=analysis.makeup,version=profile.version||0;
 const base=(m.applicationSteps||[]).filter(Boolean);
 return [
  {id:'diario',title:'Diario suave',goal:'Look rápido para el día a día',occasion:'diario',zone:'rostro completo',duration:8,difficulty:'inicial',intensity:'suave',materials:['brocha suave','labial o brillo'],categories:['colorete','labial'],steps:[...base,`Aplica una capa ligera del tono ${m.lipHex}; retira el exceso.`,'Difumina los bordes y comprueba el resultado con luz natural.'],alternative:'Si falta el labial, usa el colorete difuminado en labios; si falta la brocha, aplica con los dedos limpios.'},
  {id:'noche',title:'Noche con contraste',goal:'Más contraste para luz artificial',occasion:'noche',zone:'ojos y labios',duration:15,difficulty:'intermedio',intensity:'intensa',materials:['pincel de ojos','brocha','labial'],categories:['sombra','delineador','labial'],steps:[m.shadowPlacement,`Refuerza gradualmente el delineado: ${m.eyelinerType}.`,'Trabaja la sombra en capas pequeñas y difumina entre aplicaciones.',...base,`Aplica el labial ${m.lipHex} en dos capas finas.`],alternative:'Si falta el delineador, intensifica la sombra en la línea de pestañas; no uses productos no indicados para ojos.'},
  {id:'especial',title:'Ocasión especial',goal:'Acabado cuidado para una ocasión especial',occasion:'ocasión especial',zone:'rostro, ojos y labios',duration:20,difficulty:'avanzado',intensity:'media',materials:['pincel de precisión','brocha','espejo'],categories:['sombra satinada','colorete','labial'],steps:[`Marca primero el delineado: ${m.eyelinerType}.`,'Añade un punto de sombra satinada y suaviza el borde.',m.blushPlacement,...base,'Aplica el labial y revisa la simetría con luz natural.'],alternative:'Si falta la sombra satinada, usa un toque de iluminador facial en el lagrimal; si falta el colorete, omite ese paso.'}
 ].map(t=>({...t,difficulty:t.difficulty,profileVersion:version,analysisId:analysis.analysisId||analysis.inputVersion,adaptations:`Rostro: ${m.faceShape}. Ojos: ${profile.declared?.eyeColor||m.eyeShape}. Párpado: ${profile.declared?.eyelid||m.eyelid||'no determinado'}.`,steps:t.steps.filter(Boolean)}));
}
