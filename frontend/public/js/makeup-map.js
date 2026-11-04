/* Account-scoped manual choice takes precedence over the existing AI classification. */
const faceMakeupMap=new FaceMakeupMap(document.getElementById('faceMakeupMap'));
const makeupMapShape=document.getElementById('makeupMapShape');
let manualMakeupMapShape=normalizeFaceShape(store.getMakeupMapSelection());
function syncMakeupMap(){
 const a=store.getAnalysis(),raw=a?.makeup?.faceShape;
 const automatic=normalizeFaceShape(raw),manual=manualMakeupMapShape;
 const selected=manual||automatic;makeupMapShape.value=selected||'';
 faceMakeupMap.setProps({faceShape:selected});
 document.getElementById('makeupMapRestore').disabled=!manual;
 document.getElementById('makeupMapOrigin').textContent=manual?'Has elegido el rostro '+FACE_MAKEUP_MAPS[manual].label+'. Tu selección se mantiene hasta que vuelvas a usar el análisis.':automatic?'Mapa elegido según tu análisis: rostro '+FACE_MAKEUP_MAPS[automatic].label+'. Puedes cambiarlo.':raw?'Tu análisis indica «'+raw+'». Todavía no hay un mapa específico para esa forma. Puedes explorar uno de los cuatro disponibles.':'Elige un mapa para explorarlo. Cuando completes el análisis usaremos su forma de rostro.';
 const context=document.getElementById('makeupMapContext');context.replaceChildren();
 if(a){
  context.append(node('p',a.colorimetry.season+' · Subtono '+a.colorimetry.temperature,'fine'));
  const color=a.makeup.blushHex;
  if(/^#[a-f0-9]{6}$/i.test(color||'')){
   const line=node('p',null,'makeup-map-tone fine'),dot=node('span',null,'makeup-map-tone-dot');dot.style.backgroundColor=color;dot.setAttribute('aria-hidden','true');
   line.append(dot,document.createTextNode('Colorete propuesto por tu análisis: '+color+'. Consulta sus referencias en el catálogo de abajo.'));context.append(line);
  }
 }
}
makeupMapShape.addEventListener('change',()=>{manualMakeupMapShape=normalizeFaceShape(makeupMapShape.value);store.saveMakeupMapSelection(manualMakeupMapShape);syncMakeupMap();});
document.getElementById('makeupMapRestore').addEventListener('click',()=>{manualMakeupMapShape=null;store.saveMakeupMapSelection(null);syncMakeupMap();});
window.addEventListener('stylingu:analysis',syncMakeupMap);
window.addEventListener('stylingu:account',()=>{manualMakeupMapShape=normalizeFaceShape(store.getMakeupMapSelection());faceMakeupMap.setProps({faceShape:null,showBronzer:false,showContour:false,showBlush:true,showHighlighter:false,opacity:0.85});syncMakeupMap();});
syncMakeupMap();
