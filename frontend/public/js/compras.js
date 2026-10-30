/* Purchases tab: entry to the scanner and honest presentation of analysis data.
   No editorial examples are rendered as personal recommendations. */
function renderCompras(){
 const a=store.getAnalysis();
 document.getElementById('comprasStatus').textContent=a?originLabel(a):'Sin análisis todavía';
 document.getElementById('comprasPrec').textContent=a?'Rostro: '+a.makeup.faceShape:'Lectura facial: pendiente';
 document.getElementById('comprasColor').textContent=a?a.outfit.style+' · '+a.colorimetry.season:'Estilo & color: pendiente';
 renderComprasLooks(a);renderComprasDiagnostico(a);renderComprasFeed();renderComprasFeedback();
}
function renderComprasLooks(a){
 const box=document.getElementById('comprasLooks');box.replaceChildren();
 const proposals=Array.isArray(a?.outfits)?a.outfits:[];
 for(const o of proposals){
  const card=node('article',null,'card');
  card.append(node('span','Propuesta externa · no implica que poseas estas prendas','pill'),node('h3',o.top+' · '+o.bottom));
  card.append(node('p',[o.jacket,o.acc].filter(Boolean).join(' · ')));
  box.append(card);
 }
 if(!proposals.length)box.append(node('p','Tu análisis no incluye propuestas de estilismo. El escáner y tu armario siguen disponibles.'));
}
function renderComprasDiagnostico(a){
 const box=document.getElementById('comprasDiagnostico');box.replaceChildren();
 if(!a){box.append(node('p','Completa tu análisis para ver qué se pudo observar y qué queda pendiente de confirmar.'));return;}
 const observed=a.observed||{};
 for(const [label,value] of [['Cabello observado',observed.hairColor],['Ojos observados',observed.eyeColor],['Párpado',observed.eyelid],['Profundidad',observed.depth]]){
  const card=node('div',null,'card');
  card.append(node('strong',label),node('p',value||'no determinado'));
  box.append(card);
 }
 const limits=[...(a.notes||[]),...(observed.uncertain||[])].filter(Boolean);
 if(limits.length){const card=node('div',null,'card');card.append(node('strong','Limitaciones del análisis'),node('p',limits.join(' ')));box.append(card);}
}
function renderComprasFeed(){
 const box=document.getElementById('comprasFeed');box.replaceChildren();
 box.append(node('p','No hay referencias editoriales verificadas cargadas. No las presentamos como recomendaciones personales.'));
}
function renderComprasFeedback(){
 const scan=store.getScanner(),show=!!scan?.variantId;
 for(const id of ['thumbUpBtn','thumbDownBtn'])document.getElementById(id).hidden=!show;
}
async function sendComprasFeedback(action){
 const scan=store.getScanner();
 if(!scan?.variantId){toast('Escanea o valora un producto para guardar tu opinión.');return;}
 try{const result=await api('/recommendation-feedback',{method:'POST',body:JSON.stringify({variantId:scan.variantId,action})});toast(result.effect);}
 catch(e){toast(e.message);}
}
document.getElementById('comprasShootBtn').addEventListener('click',()=>openScanner(true));
document.getElementById('comprasUploadBtn').addEventListener('click',()=>{openScanner(false);document.getElementById('scanFile').click();});
document.getElementById('comprasFilterBtn').addEventListener('click',()=>{switchTab('tab-color');document.getElementById('profileHair')?.focus();});
document.getElementById('thumbUpBtn').addEventListener('click',()=>sendComprasFeedback('like'));
document.getElementById('thumbDownBtn').addEventListener('click',()=>sendComprasFeedback('dislike'));
window.addEventListener('stylingu:scanner',renderComprasFeedback);
window.addEventListener('stylingu:account',()=>{renderCompras();});
renderCompras();
