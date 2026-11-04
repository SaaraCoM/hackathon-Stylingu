/* Official references; screen swatches remain explicitly approximate. */
let makeupCatalog=[],makeupCatalogState='loading';
const MAKEUP_GROUPS=[
 ['lipList',['labial','labios','lip']],
 ['blushList',['colorete','rubor','blush']],
 ['eyesQuad',['sombra','ojo','delineador','eye']]
];
function makeupLab(hex){
 if(!/^#[a-f0-9]{6}$/i.test(hex||''))return null;
 const [r,g,b]=[1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
 const [x,y,z]=[(r*0.4124564+g*0.3575761+b*0.1804375)/0.95047,r*0.2126729+g*0.7151522+b*0.072175,(r*0.0193339+g*0.119192+b*0.9503041)/1.08883].map(v=>v>216/24389?Math.cbrt(v):(24389/27*v+16)/116);
 return [116*y-16,500*(x-y),200*(y-z)];
}
function makeupDistance(a,b){const x=makeupLab(a),y=makeupLab(b);return x&&y?Math.hypot(...x.map((v,i)=>v-y[i])):Infinity;}
function makeupColor(v){return v.colorVerified&&makeupLab(v.hex)?v.hex:makeupLab(v.previewHex)?v.previewHex:'';}
function rankMakeupVariants(items,category){
 const a=store.getAnalysis();
 const target=category==='labial'?a?.makeup?.lipHex:category==='colorete'?a?.makeup?.blushHex:null;
 const targets=(makeupLab(target)?[target]:a?.colorimetry?.palette||[]).filter(h=>makeupLab(h));
 return items.map(v=>{
  const color=makeupColor(v);
  const closest=targets.slice().sort((x,y)=>makeupDistance(color,x)-makeupDistance(color,y))[0];
  const distance=makeupDistance(color,closest);
  const avoided=(a?.colorimetry?.avoid||[]).some(c=>makeupDistance(color,c.hex)<12);
  return {...v,matchHex:Number.isFinite(distance)?closest:'',distance:distance+(avoided?40:0),avoided};
 }).sort((a,b)=>a.distance-b.distance||String(a._id).localeCompare(String(b._id)));
}
function catalogVariants(categories){
 const items=new Map(makeupCatalog.map(v=>[v._id,v]));
 for(const v of store.getCatalog())items.set(v._id,{...items.get(v._id),...v});
 return rankMakeupVariants([...items.values()].filter(v=>categories.includes(String(v.product?.category||'').toLowerCase())),categories[0]).slice(0,3);
}
function variantRow(v,category,index){
 const row=node('div',null,'prod-row');
 row.dataset.variantId=v._id;
 const swatch=node('span',null,'prod-dot');
 swatch.style.backgroundColor=makeupColor(v)||'#E8E0DA';
 swatch.setAttribute('aria-hidden','true');
 const name=node('strong',(v.product?.brand?v.product.brand+' · ':'')+(v.product?.name||v.shade));
 const meta=node('span',[v.shade,v.description,v.finish,v.market?'mercado '+v.market:'',v.colorVerified?'color verificado':v.previewHex?'color de pantalla aproximado':'color no verificado'].filter(Boolean).join(' · '));
 row.append(swatch,name,meta);
 if(v.matchHex)row.append(node('span',(index===0?'Primera opción · ':'')+(v.avoided?'Revisa este tono: próximo a un color a evitar.':'Comparado con '+v.matchHex+' de tu '+(category==='labial'?'guía de labios':category==='colorete'?'guía de colorete':'paleta')),'makeup-match'));
 if(/^https:\/\//i.test(v.source||'')){const link=node('a','Ficha de '+(v.product?.brand||'la marca'));link.href=v.source;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}
 if(makeupColor(v)){
  const button=node('button','Probar '+v.shade,'btn makeup-try');button.type='button';
  button.addEventListener('click',()=>{setTryonTone(category,makeupColor(v),v.shade+(v.colorVerified?'':' · aproximación'));document.getElementById('tryonTitle').scrollIntoView?.({block:'center',behavior:'instant'});document.getElementById('tryonZone').focus({preventScroll:true});});
  row.append(button);
 }
 return row;
}
function renderProducts(){
 for(const [id,categories] of MAKEUP_GROUPS){
  const box=document.getElementById(id);box.replaceChildren();
  const items=catalogVariants(categories);
  if(!items.length){
   box.append(node('p',makeupCatalogState==='loading'?'Cargando referencias de las marcas…':'No hay referencias disponibles para esta categoría.'));
   if(makeupCatalogState==='error'){const retry=node('button','Reintentar cargar catálogo','btn');retry.type='button';retry.addEventListener('click',loadMakeupCatalog);box.append(retry);}
   continue;
  }
  box.append(node('p',store.getAnalysis()?'Selección por cercanía de color con tu análisis. Las muestras aproximadas orientan la elección; confirma el tono en la ficha.':'Completa tu análisis para ordenar estos tonos según los colores de tu rostro.','fine'));
  items.forEach((v,i)=>box.append(variantRow(v,categories[0],i)));
 }
}
async function loadMakeupCatalog(){
 makeupCatalogState='loading';renderProducts();
 try{
  const response=await fetch('./makeup-catalog.json',{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('catalog');
  const catalog=await response.json();if(!Array.isArray(catalog.products))throw new Error('catalog');
  makeupCatalog=catalog.products.flatMap(p=>(p.shades||[]).map(t=>({_id:p._id+'-'+t.shade.toLowerCase(),product:p,shade:t.shade,description:t.description,previewHex:makeupLab(t.previewHex)?t.previewHex:'',finish:t.finish||p.finish,source:p.source,market:p.market,checkedAt:catalog.checkedAt,colorVerified:false,hex:''})));
  makeupCatalogState='ready';
 }catch{makeupCatalogState='error';}
 renderProducts();
}
function tutorialFor(key){return store.getTutorials().find(t=>t.id===key)||null;}
function renderLooks(){
 const box=document.getElementById('looksGrid');box.replaceChildren();
 const items=store.getTutorials();
 if(!items.length){
  const fallback=D.looks?.diario;
  box.append(node('p',fallback?'Completa tu análisis para recibir los tres tutoriales.':'Sin tutoriales todavía. El análisis genera diario, noche y ocasión especial.'));
  return;
 }
 for(const t of items){
  const card=node('article',null,'card');
  const btn=node('button',t.intensity,'btn');btn.type='button';btn.dataset.look=t.id;
  btn.addEventListener('click',()=>selectLook(t.id,btn));
  card.append(btn,node('h3',t.title),node('p',t.duration+' min · '+t.difficulty+' · '+t.steps.length+' pasos'));
  card.append(node('p','Productos: '+(t.categories||[]).join(', ')));
  box.append(card);
 }
}
function selectLook(key,btn){
 const t=tutorialFor(key),fallback=D.looks?.[key];
 const badge=t?t.intensity:fallback?.badge;
 const title=t?t.title:fallback?.title;
 const desc=t?`${t.duration} min · ${t.difficulty} · ${t.steps.length} pasos · ${(t.categories||[]).join(', ')}`:fallback?.desc;
 for(const [id,value] of [['lookBadge',badge],['lookTitle',title],['lookDesc',desc]]){const el=document.getElementById(id);if(el)el.textContent=value||'';}
 document.querySelectorAll('[data-look]').forEach(b=>{b.classList.toggle('primary',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
 /* Selecting a look loads its own products, intensity and ordered steps. */
 if(t&&typeof showTutorial==='function')showTutorial(t).catch(()=>{});
}
renderProducts();renderLooks();selectLook('diario',document.querySelector('[data-look="diario"]'));
loadMakeupCatalog();
window.addEventListener('stylingu:catalog',()=>renderProducts());
window.addEventListener('stylingu:tutorials',()=>{renderLooks();selectLook('diario',document.querySelector('[data-look="diario"]'));});
window.addEventListener('stylingu:account',()=>{renderProducts();renderLooks();});
