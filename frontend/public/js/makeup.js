/* Makeup tab: real catalogue references and the personalized tutorial.
   The sliders stay a colour sample, never a live try-on. */
const MAKEUP_GROUPS=[
 ['lipList',['labial','labios','lip']],
 ['blushList',['colorete','rubor','blush']],
 ['eyesQuad',['sombra','ojo','delineador','eye']]
];
function catalogVariants(categories){
 const items=store.getCatalog();
 return items.filter(v=>categories.includes(String(v.product?.category||'').toLowerCase()));
}
function variantRow(v){
 const row=node('div',null,'prod-row');
 const swatch=node('span',null,'prod-dot');
 swatch.style.backgroundColor=v.colorVerified&&v.hex?safeHex(v.hex):'#E8E0DA';
 swatch.setAttribute('aria-hidden','true');
 const name=node('strong',(v.product?.brand?v.product.brand+' · ':'')+(v.product?.name||v.shade));
 const meta=node('span',[v.shade,v.finish,v.colorVerified?'':'color no verificado'].filter(Boolean).join(' · '));
 row.append(swatch,name,meta);
 if(v.source){const link=node('a','Ficha');link.href=v.source;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}
 return row;
}
function renderProducts(){
 for(const [id,categories] of MAKEUP_GROUPS){
  const box=document.getElementById(id);box.replaceChildren();
  const items=catalogVariants(categories);
  if(!items.length){box.append(node('p','Sin referencias verificadas en el catálogo para esta categoría. No inventamos marcas ni tonos.'));continue;}
  for(const v of items)box.append(variantRow(v));
 }
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
function updatePreviewFx(){const el=document.getElementById('lookColorPreview');if(!el)return;const b=Number(document.getElementById('sliderBrillo').value)||0,o=Number(document.getElementById('sliderOpacidad').value)||0,s=Number(document.getElementById('sliderSombra').value)||0;el.style.filter=`brightness(${0.7+b/160}) saturate(${1+s/200})`;el.style.opacity=String(0.35+o/155);}
renderProducts();renderLooks();selectLook('diario',document.querySelector('[data-look="diario"]'));
for(const id of ['sliderBrillo','sliderOpacidad','sliderSombra'])document.getElementById(id).addEventListener('input',updatePreviewFx);
updatePreviewFx();
window.addEventListener('stylingu:catalog',()=>renderProducts());
window.addEventListener('stylingu:tutorials',()=>{renderLooks();selectLook('diario',document.querySelector('[data-look="diario"]'));});
window.addEventListener('stylingu:account',()=>{renderProducts();renderLooks();});
