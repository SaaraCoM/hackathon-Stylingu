const {JSDOM}=require('jsdom');
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.join(__dirname,'../public');
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'http://localhost/',runScripts:'outside-only'});
const w=dom.window;w.structuredClone=structuredClone;
let delayed=false,fail='',wrongSize=false;const pending=[],requests=[];
w.Image=function(){
 const img=w.document.createElement('img');
 Object.defineProperty(img,'src',{get:()=>img.getAttribute('src'),set:value=>{
  img.setAttribute('src',value);requests.push(value);
  const complete=()=>{
   if(fail&&value.includes(fail)){img.onerror();return;}
   Object.defineProperty(img,'naturalWidth',{configurable:true,value:wrongSize?800:900});Object.defineProperty(img,'naturalHeight',{configurable:true,value:1100});img.onload();
  };
  if(delayed)pending.push({value,complete});else queueMicrotask(complete);
 }});return img;
};
w.eval(['data.js','js/store.js','js/face-makeup-map.js','js/makeup-map.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nwindow.testStore=store;window.setAnalysis=a=>{accountAnalysis=a;window.dispatchEvent(new Event("stylingu:analysis"))};window.TestMap=FaceMakeupMap;window.normalizeShape=normalizeFaceShape;window.testMap=faceMakeupMap;');
let checks=0;
async function check(name,fn){await fn();checks++;console.log('ok - '+name);}
const active=map=>[...map.stage.querySelectorAll('[data-visible="true"]')].map(i=>i.dataset.layer);
const analysis=shape=>({makeup:{faceShape:shape,blushHex:'#BB6644'},colorimetry:{season:'Otoño',temperature:'cálido'}});
const select=async shape=>{const el=w.document.getElementById('makeupMapShape');el.value=shape;el.dispatchEvent(new w.Event('change'));await w.testMap.ready;};
(async()=>{
 await check('normaliza el contrato español y los alias; no fuerza formas desconocidas',()=>{
  for(const [input,expected] of [['oval','ovalado'],['ÓVALADA','ovalado'],['corazón','corazon'],['heart','corazon'],['diamond','diamante'],['cuadrado','cuadrada'],['square','cuadrada'],['redonda',null],['alargada',null],['no determinado',null],['constructor',null],['__proto__',null],[42,null]])assert.equal(w.normalizeShape(input),expected);
  assert.equal(requests.length,0,'sin forma elegida no descarga mapas');
 });
 await check('A: rostro ovalado con solo colorete y base permanente',async()=>{
  w.testStore.setUser({id:'a'});w.setAnalysis(analysis('oval'));await w.testMap.ready;
  assert.deepEqual(active(w.testMap),['blush']);assert.equal(w.testMap.stage.querySelectorAll('img').length,5);
  assert.equal(w.testMap.stage.dataset.faceShape,'ovalado');assert.equal(requests.length,5);
  assert.ok(w.testMap.stage.querySelector('[data-layer="base"]'));assert.match(w.testMap.tips.textContent,/mejillas/);
 });
 await check('B: combina contorno e iluminador sin perder la base ni la alineación',()=>{
  w.testMap.setProps({showBlush:false,showContour:true,showHighlighter:true});
  assert.deepEqual(active(w.testMap),['contour','highlighter']);
  for(const img of w.testMap.stage.querySelectorAll('img')){assert.equal(img.width,900);assert.equal(img.height,1100);assert.match(img.src,/ovalado\//);}
  assert.equal(requests.length,5,'los interruptores no vuelven a descargar imágenes');
 });
 await check('C: corazón y diamante actualizan la base y todas las máscaras',async()=>{
  await select('corazon');assert.equal(w.testMap.stage.dataset.faceShape,'corazon');const heart=w.testMap.tips.textContent;
  await select('diamante');assert.equal(w.testMap.stage.dataset.faceShape,'diamante');assert.notEqual(w.testMap.tips.textContent,heart);
  for(const img of w.testMap.stage.querySelectorAll('img'))assert.match(img.src,/diamante\//);
 });
 await check('D: mostrar todo, ocultar maquillaje y variar opacidad mantienen la base',()=>{
  [...w.testMap.controls.querySelectorAll('button')].find(b=>b.textContent==='Mostrar todo').click();assert.equal(active(w.testMap).length,4);
  w.testMap.opacity.value='30';w.testMap.opacity.dispatchEvent(new w.Event('input'));
  for(const img of w.testMap.stage.querySelectorAll('.makeup-map-overlay'))assert.equal(img.style.opacity,'0.3');
  [...w.testMap.controls.querySelectorAll('button')].find(b=>b.textContent==='Ocultar maquillaje').click();assert.equal(active(w.testMap).length,0);assert.ok(w.testMap.stage.querySelector('[data-layer="base"]'));
  w.testMap.setProps({opacity:2});assert.equal(w.testMap.props.opacity,1);w.testMap.setProps({opacity:-1});assert.equal(w.testMap.props.opacity,0);
 });
 await check('E: la selección manual prevalece sobre nuevos análisis hasta restablecerla',async()=>{
  await select('corazon');w.setAnalysis(analysis('diamante'));await w.testMap.ready;
  assert.equal(w.testMap.stage.dataset.faceShape,'corazon');assert.equal(w.testStore.getMakeupMapSelection(),'corazon');
  w.document.getElementById('makeupMapRestore').click();await w.testMap.ready;
  assert.equal(w.testMap.stage.dataset.faceShape,'diamante');assert.equal(w.testStore.getMakeupMapSelection(),null);
 });
 await check('una forma no cubierta informa y permite explorar manualmente',async()=>{
  w.setAnalysis(analysis('redonda'));await w.testMap.ready;
  assert.match(w.document.getElementById('makeupMapOrigin').textContent,/Todavía no hay un mapa específico/);
  assert.equal(w.testMap.stage.children.length,0);assert.equal(w.document.getElementById('makeupMapShape').value,'');
  await select('cuadrada');assert.equal(w.testMap.stage.dataset.faceShape,'cuadrada');
 });
 await check('la preferencia manual está separada por cuenta y se reutilizan PNG visitados',async()=>{
  w.testStore.setUser({id:'b'});await w.testMap.ready;assert.equal(w.testMap.stage.children.length,0);assert.equal(w.testStore.getMakeupMapSelection(),null);
  const count=requests.length;w.testStore.setUser({id:'a'});await w.testMap.ready;
  assert.equal(w.testMap.stage.dataset.faceShape,'cuadrada');assert.equal(requests.length,count);
  assert.equal(w.document.getElementById('makeupMapContext').textContent,'','no arrastra la colorimetría de otra cuenta');
 });
 await check('la elección manual funciona durante la sesión aunque no se pueda guardar',async()=>{
  const setItem=w.Storage.prototype.setItem;w.toast=()=>{};
  w.Storage.prototype.setItem=()=>{throw new Error('Quota exceeded');};
  try{await select('ovalado');w.setAnalysis(analysis('corazón'));await w.testMap.ready;assert.equal(w.testMap.stage.dataset.faceShape,'ovalado');}
  finally{w.Storage.prototype.setItem=setItem;}
 });
 await check('los cambios rápidos nunca mezclan imágenes de dos morfologías',async()=>{
  delayed=true;const host=w.document.createElement('div');const map=new w.TestMap(host,{faceShape:'ovalado'});
  map.setProps({faceShape:'corazon'});
  pending.filter(p=>p.value.includes('/corazon/')).forEach(p=>p.complete());await map.ready;
  assert.equal(map.stage.dataset.faceShape,'corazon');
  pending.filter(p=>p.value.includes('/ovalado/')).forEach(p=>p.complete());await Promise.resolve();await Promise.resolve();
  assert.equal(map.stage.dataset.faceShape,'corazon');for(const img of map.stage.children)assert.match(img.src,/corazon\//);
  pending.length=0;map.setProps({faceShape:'diamante'});
  assert.equal(map.stage.dataset.faceShape,'corazon','mantiene la composición anterior completa mientras carga');
  for(const img of map.stage.children)assert.match(img.src,/corazon\//);
  pending.forEach(p=>p.complete());await map.ready;
  assert.equal(map.stage.dataset.faceShape,'diamante');delayed=false;pending.length=0;
 });
 await check('una capa inexistente no deja un mapa parcial y permite reintentar',async()=>{
  fail='/cuadrada/highlighter.png';const host=w.document.createElement('div');const map=new w.TestMap(host,{faceShape:'cuadrada'});await map.ready;
  assert.equal(map.stage.children.length,0);assert.equal(map.retry.hidden,false);assert.match(map.status.textContent,/No se pudo cargar/);
  fail='';map.retry.click();await map.ready;assert.equal(map.stage.children.length,5);assert.equal(map.retry.hidden,true);
 });
 await check('rechaza máscaras con dimensiones incorrectas y permite modo no interactivo',async()=>{
  wrongSize=true;const map=new w.TestMap(w.document.createElement('div'),{faceShape:'ovalado',interactive:false});await map.ready;
  assert.equal(map.stage.children.length,0);assert.equal(map.controls.hidden,true);
  wrongSize=false;map.retry.click();await map.ready;assert.equal(map.stage.children.length,5);
  map.setProps({showBronzer:true});assert.ok(active(map).includes('bronzer'));assert.equal(map.controls.hidden,true);
 });
 console.log('MAPAS DOM: '+checks+'/'+checks+' comprobaciones correctas');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>dom.window.close());
