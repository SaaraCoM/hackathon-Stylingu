/* Only this module owns device storage. Personal data is scoped to a session identity. */
const exampleData=structuredClone(window.STYLINGU_DATA);
const D=window.STYLINGU_DATA;
const STORE_KEYS={profile:'profile',palette:'palette',outfits:'outfits'};
let storeOwner='guest',accountEpoch=0,accountAnalysis=null;
/* Remote personal state. Examples stay in `exampleData` and are never merged here. */
const personalState={profile:null,analysis:null,plans:[],tutorials:[],catalog:[],scanner:null};
const API=window.STYLINGU_API_BASE||'';
/* The provider is allowed 120 s server-side (shared/meta-client.js). The client must not
   give up first, or a slow but valid analysis is reported as a network failure. */
const LONG_REQUEST=/\/(personal\/(analyze|photos|preview|segment)|jobs\/|scans|preview|purchase-recommendations)(\/|$|\?)/;
const CLIENT_TIMEOUT={long:125000,short:20000};
const storageKey=key=>'stylingu:v2:'+storeOwner+':'+key;
function readJSON(key,fallback) {try{const raw=localStorage.getItem(storageKey(key));if(!raw)return fallback;const value=JSON.parse(raw);return Array.isArray(fallback)&&!Array.isArray(value)?fallback:value;}catch{return fallback;}}
function writeJSON(key,value) {try{localStorage.setItem(storageKey(key),JSON.stringify(value));}catch{toast('No se pudo guardar en este dispositivo.');}}
function node(tag,value,className) {const e=document.createElement(tag);if(value!=null)e.textContent=String(value);if(className)e.className=className;return e;}
function safeHex(value) {return typeof value==='string'&&/^#[a-f0-9]{6}$/i.test(value)?value:'#F5EFEB';}
function originLabel(a) {return a?.source==='mock'?'Simulación':a?.source==='meta'?'Análisis IA':'Sin análisis';}
function localDateKey(date=new Date()) {const d=new Date(date);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function clearPersonalData() {
 for(const key of ['palette','avoid','silhouette','lipsticks','blush','eyes','outfits','externalOutfits','skinComparator','compraDiagnostico','compraFeed'])D[key]=[];
 D.looks={};
}
function clearPersonalState() {
 personalState.profile=null;personalState.analysis=null;personalState.plans=[];
 personalState.tutorials=[];personalState.catalog=[];personalState.scanner=null;
}
clearPersonalData();
function requestTimeout(path) {return LONG_REQUEST.test(path)?CLIENT_TIMEOUT.long:CLIENT_TIMEOUT.short;}
async function apiFetch(path,opts={}) {
 const epoch=accountEpoch;
 const response=await fetch(API+'/api'+path,{credentials:'include',...opts,headers:{...opts.headers,'X-Stylingu-Request':'1'},signal:opts.signal||AbortSignal.timeout(requestTimeout(path))});
 if(epoch!==accountEpoch)throw new Error('La cuenta cambió durante la solicitud.');
 return response;
}
function hasCompleteAnalysis(a) {
 return !!(a?.analyzedAt&&Number.isFinite(Date.parse(a.analyzedAt))&&a.photos?.face&&a.photos?.body&&a.colorimetry?.season&&Array.isArray(a.colorimetry.palette)&&a.colorimetry.palette.length&&a.colorimetry.palette.every(h=>/^#[a-f0-9]{6}$/i.test(h))&&Array.isArray(a.colorimetry.avoid)&&['faceShape','eyeShape','eyelinerType','shadowPlacement','blushPlacement'].every(k=>typeof a.makeup?.[k]==='string'&&a.makeup[k])&&a.outfit?.style&&a.outfit?.silhouette);
}
function applyAnalysis(a) {
 accountAnalysis=hasCompleteAnalysis(a)?a:null;clearPersonalData();personalState.analysis=accountAnalysis;
 document.getElementById('appShell').hidden=true;
 if(accountAnalysis) {
  const {colorimetry:c,makeup:m,outfit:o}=a;
  D.palette=c.palette.map(hex=>({hex,name:hex,harmony:c.harmony,desc:'Tono propuesto · '+originLabel(a)}));D.avoid=c.avoid;
  D.silhouette=[{name:o.style,note:o.silhouette}];
  /* AI outfits are external proposals. They never imply the person owns these garments. */
  D.externalOutfits=Array.isArray(a.outfits)?a.outfits:[];D.outfits=D.externalOutfits;
  D.lipsticks=[{name:m.look||'Labial sugerido',hex:m.lipHex,finish:'Orientación de color',use:o.style}];
  D.blush=[{name:m.blushPlacement,hex:m.blushHex,texture:'Orientación de aplicación'}];
  D.eyes=c.palette.slice(0,4).map(hex=>({hex,name:hex,role:m.shadowPlacement}));
  D.looks={diario:{badge:'Guía del análisis',title:m.look||'Tu maquillaje',desc:m.shadowPlacement+' · '+m.blushPlacement,steps:m.applicationSteps||[]}};
 }
 renderPalette();renderAvoid();renderSilhouette();renderEstilismos();renderOutfit();renderSaved();renderProducts();renderLooks();renderCompras();renderInspiracion();renderComparator();
 selectLook('diario',document.querySelector('[data-look="diario"]'));
 const c=accountAnalysis?.colorimetry;
 document.getElementById('analysisSummary').textContent=c?c.season+' · '+originLabel(a):'Sin análisis';
 document.getElementById('seasonSummary').textContent=c?c.season+' · '+c.palette.length+' tonos':'Completa tu análisis';
 document.getElementById('outfitSummary').textContent=accountAnalysis?a.outfit.style+' · '+a.outfit.silhouette:'Sin propuestas';
 document.getElementById('colorSummary').textContent=c?'Subtono: '+c.temperature+' · Contraste: '+c.contrast+' · Croma: '+c.chroma:'';
 document.querySelectorAll('[data-analysis-source]').forEach(e=>e.textContent=originLabel(accountAnalysis));
 const limitations=document.getElementById('analysisLimitations');if(limitations)limitations.textContent=accountAnalysis?[...(a.notes||[]),...(a.observed?.uncertain||[])].join(' '):'';
 if(typeof renderDesign==='function')renderDesign();renderAccess();
 window.dispatchEvent(new Event('stylingu:analysis'));
}
async function saveOutfitRemote(outfit) {const response=await apiFetch('/armario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(outfit)});if(!response.ok)throw new Error('No se pudo guardar.');return response.json();}
const store={
 getAnalysis:()=>accountAnalysis,applyAnalysis,
 setUser:user=>{accountEpoch++;storeOwner=user?.id||'guest';accountAnalysis=null;clearPersonalData();clearPersonalState();window.dispatchEvent(new Event('stylingu:account'));},
 getProfile:()=>readJSON(STORE_KEYS.profile,null),saveProfile:p=>writeJSON(STORE_KEYS.profile,p),
 getPalette:()=>readJSON(STORE_KEYS.palette,null),savePalette:()=>writeJSON(STORE_KEYS.palette,D.palette),
 getOutfits:()=>readJSON(STORE_KEYS.outfits,[]),addOutfit:o=>{const all=readJSON(STORE_KEYS.outfits,[]);all.push(o);writeJSON(STORE_KEYS.outfits,all);return all;},
 getJob:()=>readJSON('analysis-job',null),saveJob:j=>writeJSON('analysis-job',j),
 /* Remote slices. Each section reads its own slice instead of guessing from examples. */
 setProfile:p=>{personalState.profile=p;window.dispatchEvent(new Event('stylingu:profile'));},
 getPersonalProfile:()=>personalState.profile,
 setPlans:plans=>{personalState.plans=Array.isArray(plans)?plans:[];window.dispatchEvent(new Event('stylingu:plans'));},
 getPlans:()=>personalState.plans,
 getTodayPlan:()=>personalState.plans.find(p=>p.date===localDateKey())||null,
 getPlanByDate:date=>personalState.plans.find(p=>p.date===date)||null,
 setTutorials:items=>{personalState.tutorials=Array.isArray(items)?items:[];window.dispatchEvent(new Event('stylingu:tutorials'));},
 getTutorials:()=>personalState.tutorials,
 setCatalog:items=>{personalState.catalog=Array.isArray(items)?items:[];window.dispatchEvent(new Event('stylingu:catalog'));},
 getCatalog:()=>personalState.catalog,
 setScanner:value=>{personalState.scanner=value;window.dispatchEvent(new Event('stylingu:scanner'));},
 getScanner:()=>personalState.scanner,
 requestTimeout
};
