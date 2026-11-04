/* Photo overlays stay in the browser. Each point can be aligned by pointer or keyboard. */
const tryonPhoto=document.getElementById('tryonPhoto');
const tryonOverlay=document.getElementById('tryonOverlay');
const tryonZone=document.getElementById('tryonZone');
const tryonAnchor=document.getElementById('tryonAnchor');
const tryonDefaults={lips:{x:50,y:73},leftCheek:{x:34,y:59},rightCheek:{x:66,y:59},leftEye:{x:35,y:41},rightEye:{x:65,y:41}};
let tryonPoints={},tryonColors={},tryonLabels={},tryonOriginal=false;
function tryonReady(){return !!(store.getAnalysis()&&tryonPhoto.getAttribute('src')&&tryonPhoto.complete&&tryonPhoto.naturalWidth);}
function tryonAnchorControls(){
 const point=tryonPoints[tryonAnchor.value];
 for(const [id,value] of [['tryonX',point.x],['tryonY',point.y],['tryonSize',point.size],['tryonAngle',point.angle]])document.getElementById(id).value=value;
}
function renderTryon(){
 const ready=tryonReady();
 document.getElementById('tryonControls').disabled=!ready;
 tryonOverlay.toggleAttribute('hidden',!ready||tryonOriginal);
 document.getElementById('tryonCompare').setAttribute('aria-pressed',String(tryonOriginal));
 document.getElementById('tryonCompare').textContent=tryonOriginal?'Ver prueba':'Ver original';
 for(const shape of tryonOverlay.querySelectorAll('[data-anchor]')){
  const p=tryonPoints[shape.dataset.anchor];shape.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.angle}) scale(${p.size/100})`);
 }
 const lips=tryonPoints.lips;
 document.getElementById('tryonLips').setAttribute('transform',`translate(${lips.x} ${lips.y}) rotate(${lips.angle}) scale(${lips.size/100})`);
 for(const [id,zone,opacity] of [['tryonLips','labial',Number(document.getElementById('sliderOpacidad').value)/100*0.8],['tryonBlush','colorete',Number(document.getElementById('tryonBlushOpacity').value)/100*0.65],['tryonEyes','sombra',Number(document.getElementById('sliderSombra').value)/100*0.8]]){
  const el=document.getElementById(id);el.setAttribute('fill',tryonColors[zone]);el.setAttribute('opacity',opacity);
 }
 document.getElementById('tryonLips').style.filter=`brightness(${0.7+Number(document.getElementById('sliderBrillo').value)/100*0.8})`;
 document.getElementById('tryonColor').value=tryonColors[tryonZone.value];
 document.getElementById('tryonSelected').textContent=(tryonLabels[tryonZone.value]||'Color personalizado')+' · '+tryonColors[tryonZone.value];
 document.getElementById('lookColorPreview').style.backgroundColor=tryonColors.labial;
 document.getElementById('lookBlushPreview').style.backgroundColor=tryonColors.colorete;
 document.querySelectorAll('#tryonPalette button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hex.toLowerCase()===tryonColors[tryonZone.value].toLowerCase())));
 document.getElementById('tryonStatus').textContent=ready?(tryonOriginal?'Foto original. Pulsa «Ver prueba» para recuperar los colores.':'Prueba orientativa activa. Ajusta las zonas para que coincidan con tu rostro.'):store.getAnalysis()?'Cargando tu foto del análisis…':'Completa tu análisis para probar colores sobre tu foto.';
}
function setTryonTone(zone,hex,label='Color personalizado'){
 if(!['labial','colorete','sombra'].includes(zone)||!makeupLab(hex))return;
 tryonZone.value=zone;tryonColors[zone]=hex;tryonLabels[zone]=label;tryonOriginal=false;
 tryonAnchor.value=zone==='labial'?'lips':zone==='colorete'?'leftCheek':'leftEye';
 tryonAnchorControls();renderTryon();
}
function resetTryon(){
 const a=store.getAnalysis();
 tryonPoints=Object.fromEntries(Object.entries(tryonDefaults).map(([key,p])=>[key,{...p,size:100,angle:0}]));
 tryonColors={labial:safeHex(a?.makeup?.lipHex),colorete:safeHex(a?.makeup?.blushHex),sombra:safeHex(a?.colorimetry?.palette?.[0])};
 tryonLabels={labial:'Labial del análisis',colorete:'Colorete del análisis',sombra:'Paleta del análisis'};
 tryonOriginal=false;tryonZone.value='labial';tryonAnchor.value='lips';
 for(const [id,value] of [['sliderBrillo',50],['sliderOpacidad',80],['sliderSombra',35],['tryonBlushOpacity',40]])document.getElementById(id).value=value;
 const palette=document.getElementById('tryonPalette');palette.replaceChildren();
 const colors=[...new Set([a?.makeup?.lipHex,a?.makeup?.blushHex,...a?.colorimetry?.palette||[]].filter(h=>makeupLab(h)))];
 for(const hex of colors){
  const b=node('button',null,'tryon-color');b.type='button';b.dataset.hex=hex;b.style.backgroundColor=hex;
  b.setAttribute('aria-label','Probar '+hex);b.title=hex;
  b.addEventListener('click',()=>setTryonTone(tryonZone.value,hex,'Paleta del análisis'));palette.append(b);
 }
 tryonAnchorControls();renderTryon();
}
tryonPhoto.addEventListener('load',renderTryon);
tryonPhoto.addEventListener('error',()=>{
 document.getElementById('tryonControls').disabled=true;tryonOverlay.setAttribute('hidden','');
 document.getElementById('tryonStatus').textContent='No se pudo cargar tu foto. Actualiza el análisis para volver a probar.';
});
tryonZone.addEventListener('change',()=>{tryonAnchor.value=tryonZone.value==='labial'?'lips':tryonZone.value==='colorete'?'leftCheek':'leftEye';tryonAnchorControls();renderTryon();});
document.getElementById('tryonColor').addEventListener('input',e=>setTryonTone(tryonZone.value,e.target.value));
for(const id of ['sliderBrillo','sliderOpacidad','sliderSombra','tryonBlushOpacity'])document.getElementById(id).addEventListener('input',renderTryon);
tryonAnchor.addEventListener('change',tryonAnchorControls);
for(const [id,key] of [['tryonX','x'],['tryonY','y'],['tryonSize','size'],['tryonAngle','angle']])document.getElementById(id).addEventListener('input',e=>{tryonPoints[tryonAnchor.value][key]=Number(e.target.value);renderTryon();});
document.getElementById('tryonStage').addEventListener('click',e=>{
 if(!tryonReady()||tryonOriginal||!document.querySelector('.tryon-alignment').open)return;
 const bounds=tryonPhoto.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
 const point=tryonPoints[tryonAnchor.value];
 point.x=Math.max(0,Math.min(100,(e.clientX-bounds.left)/bounds.width*100));
 point.y=Math.max(0,Math.min(100,(e.clientY-bounds.top)/bounds.height*100));
 tryonAnchorControls();renderTryon();
});
document.getElementById('tryonCompare').addEventListener('click',()=>{tryonOriginal=!tryonOriginal;renderTryon();});
document.getElementById('tryonReset').addEventListener('click',resetTryon);
window.addEventListener('stylingu:analysis',resetTryon);
window.addEventListener('stylingu:account',()=>{tryonPhoto.removeAttribute('src');resetTryon();});
resetTryon();
