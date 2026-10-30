/* Wardrobe tab: own garments and dated plans come from the account.
   The old example rotation is gone; AI outfits are shown only as external proposals. */
let planIndex=-1;
function outfitRows(o) {return [['Arriba',o.top,o.topDesc],['Abajo',o.bottom,o.bottomDesc],['Abrigo',o.jacket,o.jacketDesc],['Accesorio',o.acc,o.accDesc]].filter(row=>row[1]);}
function externalOutfits(){return Array.isArray(D.externalOutfits)?D.externalOutfits:[];}
function currentPlan(){
 const plans=store.getPlans();
 if(!plans.length){planIndex=-1;return null;}
 if(planIndex<0||planIndex>=plans.length){
  const today=plans.findIndex(p=>p.date===localDateKey());
  planIndex=today>=0?today:0;
 }
 return plans[planIndex]||null;
}
function renderEstilismos() {
 const box=document.getElementById('estilismosGrid');box.replaceChildren();
 const proposals=externalOutfits();
 for(const o of proposals){
  const card=node('article',null,'card');
  card.append(node('span','Propuesta externa · no implica que poseas estas prendas','pill'),node('h3',o.top+' · '+o.bottom));
  for(const [label,name,desc] of outfitRows(o))card.append(node('p',label+': '+name+' · '+(desc||'')));
  box.append(card);
 }
 if(!proposals.length)box.append(node('p','Sin propuestas externas. Tu calendario usa solo las prendas de tu inventario.'));
}
function renderSilhouette(){const box=document.getElementById('silhouetteGrid');box.replaceChildren();for(const s of D.silhouette){const card=node('div',null,'card');card.append(node('strong',s.name),node('p',s.note));box.append(card);}}
function renderOutfit(){
 const box=document.getElementById('outfitList');box.replaceChildren();
 const plans=store.getPlans(),plan=currentPlan();
 if(plan){
  box.append(node('li','Fecha: '+plan.date));
  for(const label of plan.labels||[])box.append(node('li',label));
  if(plan.colors?.length)box.append(node('li','Colores: '+plan.colors.join(', ')));
  box.append(node('li','Prendas propias · '+plan.status+' · perfil v'+(plan.profileVersion||0)));
  if(plan.explanation)box.append(node('li',plan.explanation));
 }
 document.getElementById('outfitCounter').textContent=plan
  ?'Conjunto del '+plan.date+' · '+plan.status+' · '+(planIndex+1)+' de '+plans.length
  :'Sin conjuntos para hoy. Genera tu semana con las prendas de tu inventario.';
 const save=document.getElementById('saveOutfitBtn'),shuffle=document.getElementById('shuffleBtn');
 save.disabled=!plan||['accepted','unavailable'].includes(plan.status);
 shuffle.disabled=plans.length<2;
 save.textContent=plan?.status==='accepted'?'Conjunto aceptado':'Aceptar conjunto';
 shuffle.textContent='Ver otro día';
}
function renderSaved(){
 const saved=store.getOutfits();
 document.getElementById('savedCount').textContent='Conjuntos guardados: '+saved.length;
 const list=document.getElementById('savedList');list.replaceChildren();
 for(const s of saved.slice(-3).reverse())list.append(node('li',[s.date,s.top,s.bottom,s.jacket].filter(Boolean).join(' · ')));
 document.getElementById('savedEmpty').hidden=saved.length>0;
}
renderSilhouette();renderEstilismos();renderOutfit();renderSaved();
document.getElementById('shuffleBtn').addEventListener('click',()=>{
 const plans=store.getPlans();if(plans.length<2)return;
 planIndex=planIndex<0?0:(planIndex+1)%plans.length;renderOutfit();
});
document.getElementById('saveOutfitBtn').addEventListener('click',async()=>{
 const plan=currentPlan();if(!plan)return;
 const button=document.getElementById('saveOutfitBtn');button.disabled=true;
 try{
  await api('/outfit-plans/'+plan.date,{method:'PATCH',body:JSON.stringify({status:'accepted'})});
  plan.status='accepted';
  store.addOutfit({date:plan.date,top:plan.labels?.[0]||'',bottom:plan.labels?.[1]||'',jacket:plan.labels?.[2]||'',note:plan.explanation});
  renderOutfit();renderSaved();toast('Conjunto aceptado para el '+plan.date+'.');
 }catch(e){toast(e.message);button.disabled=false;}
});
document.getElementById('saveFirstBtn').addEventListener('click',()=>document.getElementById('saveOutfitBtn').click());
document.getElementById('mirrorLooksBtn').addEventListener('click',()=>document.getElementById('estilismosGrid').scrollIntoView?.({behavior:'smooth'}));
document.getElementById('capsuleAddBtn').addEventListener('click',()=>document.getElementById('garmentName')?.focus());
window.addEventListener('stylingu:plans',()=>{planIndex=-1;renderOutfit();});
window.addEventListener('stylingu:account',()=>{planIndex=-1;renderEstilismos();renderOutfit();renderSaved();});
