const FACE_MAKEUP_LAYERS=[
 {id:'bronzer',prop:'showBronzer',label:'Bronzer',color:'#AC8057',icon:'◒'},
 {id:'contour',prop:'showContour',label:'Contouring',color:'#795A50',icon:'◐'},
 {id:'blush',prop:'showBlush',label:'Blush',color:'#CC7491',icon:'●'},
 {id:'highlighter',prop:'showHighlighter',label:'Iluminador',color:'#C1AC58',icon:'✧'}
];
const FACE_MAKEUP_MAPS={
 ovalado:{label:'ovalado',tips:{
  bronzer:'Aplica en las sienes y los laterales de la mandíbula. Difumina hacia el contorno del rostro para aportar calidez.',
  contour:'Sombrea bajo los pómulos y a los lados de la nariz. Difumina los bordes para dar profundidad suave.',
  blush:'Aplica sobre las mejillas y difumina ligeramente hacia fuera para crear un rubor suave.',
  highlighter:'Da luz al centro de la frente, los pómulos altos, la nariz y el mentón. Suaviza cada punto para evitar bordes marcados.'}},
 corazon:{label:'corazón',tips:{
  bronzer:'Aplica en los laterales altos de la frente y las sienes. Difumina hacia el nacimiento del pelo para aportar calidez.',
  contour:'Sombrea las sienes y bajo los pómulos. Difumina hacia fuera para dar profundidad a los laterales.',
  blush:'Concentra el colorete en las mejillas y extiéndelo suavemente hacia fuera para aportar un rubor centrado.',
  highlighter:'Ilumina el centro de la frente, los pómulos altos, la nariz y el mentón. Difumina cada punto para crear luz suave.'}},
 diamante:{label:'diamante',tips:{
  bronzer:'Aplica en las sienes y los laterales bajos de la mandíbula. Difumina hacia el borde del rostro para aportar calidez.',
  contour:'Sombrea los laterales bajo los pómulos y la parte baja del mentón. Difumina los bordes para dar profundidad.',
  blush:'Aplica sobre el centro de las mejillas, bajo el pómulo alto. Difumina hacia fuera para crear un rubor suave.',
  highlighter:'Da luz al centro de la frente, la parte alta de los pómulos, la nariz y el mentón. Suaviza las transiciones.'}},
 cuadrada:{label:'cuadrado',tips:{
  bronzer:'Aplica en las sienes y los laterales de la mandíbula. Difumina siguiendo el borde del rostro para aportar calidez.',
  contour:'Sombrea bajo los pómulos y en los ángulos de la mandíbula. Difumina hacia dentro para suavizar las transiciones.',
  blush:'Aplica en la parte alta de las mejillas. Difumina ligeramente hacia fuera y arriba para crear un rubor suave.',
  highlighter:'Ilumina el centro de la frente, los pómulos altos, la nariz y el mentón. Difumina los puntos para aportar luz suave.'}}
};
function normalizeFaceShape(value){
 if(typeof value!=='string')return null;
 const key=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const aliases={oval:'ovalado',ovalado:'ovalado',ovalada:'ovalado',heart:'corazon','heart-shaped':'corazon',corazon:'corazon',diamond:'diamante',diamante:'diamante',square:'cuadrada',cuadrado:'cuadrada',cuadrada:'cuadrada'};
 return Object.hasOwn(aliases,key)?aliases[key]:null;
}

/* Illustrations only: all five PNGs share a fixed canvas. Photo adaptation belongs
   in a separate renderer once anatomical landmarks and mask warping are available. */
class FaceMakeupMap{
 constructor(root,props={}){
  this.root=root;root.classList.add('face-makeup-map');
  this.props={faceShape:null,showBronzer:false,showContour:false,showBlush:true,showHighlighter:false,opacity:0.85,interactive:true};
  this.cache=new Map();this.generation=0;this.loadedShape=null;this.loading=false;this.images=[];
  this.figure=node('figure',null,'makeup-map-figure');
  this.stage=node('div',null,'makeup-map-stage');this.caption=node('figcaption');this.figure.append(this.stage,this.caption);
  this.status=node('p',null,'makeup-map-status fine');this.status.setAttribute('role','status');this.status.setAttribute('aria-live','polite');
  this.retry=node('button','Reintentar cargar mapa','btn');this.retry.type='button';this.retry.hidden=true;
  this.retry.addEventListener('click',()=>{this.ready=this.loadShape(this.props.faceShape);});
  this.controls=node('fieldset',null,'makeup-map-controls');this.controls.append(node('legend','Zonas de aplicación'));
  const toggles=node('div',null,'makeup-map-toggles');this.buttons={};
  for(const layer of FACE_MAKEUP_LAYERS){
   const b=node('button',null,'makeup-map-toggle');b.type='button';b.dataset.layer=layer.id;
   const mark=node('span',layer.icon,'makeup-map-mark');mark.style.color=layer.color;mark.setAttribute('aria-hidden','true');
   b.append(mark,node('span',layer.label));b.setAttribute('aria-pressed',String(this.props[layer.prop]));
   b.addEventListener('click',()=>this.setProps({[layer.prop]:!this.props[layer.prop]}));
   toggles.append(b);this.buttons[layer.id]=b;
  }
  const actions=node('div',null,'makeup-map-actions');
  for(const [label,visible] of [['Mostrar todo',true],['Ocultar maquillaje',false]]){
   const b=node('button',label,'btn');b.type='button';
   b.addEventListener('click',()=>this.setProps(Object.fromEntries(FACE_MAKEUP_LAYERS.map(l=>[l.prop,visible]))));actions.append(b);
  }
  const opacityLabel=node('label','Intensidad de las guías','makeup-map-opacity');
  this.opacity=node('input');this.opacity.type='range';this.opacity.min='0';this.opacity.max='100';this.opacity.step='1';
  this.output=node('span');this.output.setAttribute('aria-hidden','true');opacityLabel.append(this.opacity,this.output);
  this.opacity.addEventListener('input',()=>this.setProps({opacity:Number(this.opacity.value)/100}));
  this.tips=node('ul',null,'makeup-map-tips');this.tips.setAttribute('aria-label','Orientaciones de las capas activas');
  this.controls.append(toggles,actions,opacityLabel);root.append(this.figure,this.status,this.retry,this.controls,this.tips);
  this.setProps(props);if(!this.ready)this.ready=this.loadShape(this.props.faceShape);
 }
 setProps(next={}){
  const previous=this.props.faceShape;
  for(const l of FACE_MAKEUP_LAYERS)if(typeof next[l.prop]==='boolean')this.props[l.prop]=next[l.prop];
  if(Object.hasOwn(next,'faceShape'))this.props.faceShape=normalizeFaceShape(next.faceShape);
  if(typeof next.opacity==='number'&&Number.isFinite(next.opacity))this.props.opacity=Math.max(0,Math.min(1,next.opacity));
  if(typeof next.interactive==='boolean')this.props.interactive=next.interactive;
  if(previous!==this.props.faceShape)this.ready=this.loadShape(this.props.faceShape);
  this.renderLayers();return this.ready;
 }
 loadImages(shape){
  if(!this.cache.has(shape)){
   const pending=Promise.all(['base',...FACE_MAKEUP_LAYERS.map(l=>l.id)].map(id=>new Promise((resolve,reject)=>{
    const img=new Image();img.decoding='async';img.width=900;img.height=1100;img.dataset.layer=id;
    img.alt=id==='base'?'Mapa ilustrativo de rostro '+FACE_MAKEUP_MAPS[shape].label:'';
    if(id!=='base'){img.className='makeup-map-overlay';img.setAttribute('aria-hidden','true');}
    img.onload=()=>img.naturalWidth===900&&img.naturalHeight===1100?resolve(img):reject(new Error('Dimensiones de mapa no válidas'));
    img.onerror=()=>reject(new Error('Recurso de mapa no disponible'));
    img.src='./assets/makeup-maps/'+shape+'/'+id+'.png';
   })));
   this.cache.set(shape,pending);pending.catch(()=>{if(this.cache.get(shape)===pending)this.cache.delete(shape);});
  }
  return this.cache.get(shape);
 }
 async loadShape(shape){
  const generation=++this.generation;this.retry.hidden=true;
  if(!shape){
   this.loading=false;this.loadedShape=null;this.images=[];this.stage.replaceChildren();delete this.stage.dataset.faceShape;
   this.figure.hidden=true;this.root.setAttribute('aria-busy','false');
   this.status.textContent='Selecciona una de las cuatro formas para explorar su mapa ilustrativo.';this.renderLayers();return;
  }
  this.loading=true;this.root.setAttribute('aria-busy','true');this.status.textContent='Cargando mapa de rostro '+FACE_MAKEUP_MAPS[shape].label+'…';this.renderLayers();
  try{
   const images=await this.loadImages(shape);if(generation!==this.generation)return;
   this.images=images;this.loadedShape=shape;this.loading=false;
   this.stage.replaceChildren(...images);this.stage.dataset.faceShape=shape;this.figure.hidden=false;
   this.root.setAttribute('aria-busy','false');this.status.textContent='Mapa ilustrativo de rostro '+FACE_MAKEUP_MAPS[shape].label+'. Orientaciones para practicar a tu manera.';this.renderLayers();
  }catch{
   if(generation!==this.generation)return;
   this.loading=false;this.loadedShape=null;this.images=[];this.stage.replaceChildren();delete this.stage.dataset.faceShape;this.figure.hidden=true;
   this.root.setAttribute('aria-busy','false');this.status.textContent='No se pudo cargar el mapa de rostro '+FACE_MAKEUP_MAPS[shape].label+'. Reintenta o elige otra forma.';
   this.retry.hidden=false;this.renderLayers();
  }
 }
 renderLayers(){
  this.controls.hidden=!this.props.interactive;this.controls.disabled=this.loading||!this.loadedShape;
  this.opacity.value=String(Math.round(this.props.opacity*100));this.opacity.setAttribute('aria-valuetext',this.opacity.value+' %');this.output.textContent=this.opacity.value+' %';
  for(const layer of FACE_MAKEUP_LAYERS){
   this.buttons[layer.id].setAttribute('aria-pressed',String(this.props[layer.prop]));
   const img=this.images.find(i=>i.dataset.layer===layer.id);
   if(img){img.style.opacity=String(this.props[layer.prop]?this.props.opacity:0);img.dataset.visible=String(this.props[layer.prop]);}
  }
  const active=FACE_MAKEUP_LAYERS.filter(l=>this.props[l.prop]);this.tips.replaceChildren();
  if(!this.loadedShape)return;
  this.caption.textContent='Rostro '+FACE_MAKEUP_MAPS[this.loadedShape].label+' · '+(active.length?active.map(l=>l.label).join(', '):'Sin capas de maquillaje');
  for(const l of active){
   const item=node('li');item.dataset.layer=l.id;const title=node('strong',l.label);const dot=node('span',l.icon,'makeup-map-mark');dot.style.color=l.color;dot.setAttribute('aria-hidden','true');
   item.append(dot,title,node('span',FACE_MAKEUP_MAPS[this.loadedShape].tips[l.id]));this.tips.append(item);
  }
 }
}
