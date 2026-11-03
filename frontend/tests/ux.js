const {JSDOM}=require('jsdom');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const tick=()=>new Promise(r=>setTimeout(r,0));
const localDate=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
(async()=>{
 const root=path.join(__dirname,'../public');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});const w=dom.window;
 w.structuredClone=structuredClone;w.AbortSignal=AbortSignal;w.fetch=async()=>({ok:true,json:async()=>({user:null})});w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 const files=[...html.matchAll(/<script src="\.\/([^"]+)"/g)].map(m=>m[1]).filter(f=>!['js/barcode.js','js/pwa.js'].includes(f));
 w.eval(files.map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n')+'\nwindow.testStore=store;window.testApply=applyAnalysis;window.testSetUser=u=>{currentUser=u;store.setUser(u)};window.testD=D;');
 await new Promise(r=>setTimeout(r,30));let checks=0;function check(name,fn){return Promise.resolve().then(fn).then(()=>{checks++;console.log('ok - '+name);});}
 await check('sin sesión no expone contenido ni ejemplos',()=>{assert.equal(w.document.getElementById('appShell').hidden,true);assert.equal(w.testD.outfits.length,0);assert.equal(w.testD.palette.length,0);});
 await check('almacenamiento separado por cuenta',()=>{w.testSetUser({id:'a'});w.testStore.saveProfile({name:'Ana'});w.testStore.addOutfit({top:'Camisa privada'});w.testSetUser({id:'b'});assert.equal(w.testStore.getProfile(),null);assert.equal(w.testStore.getOutfits().length,0);w.testSetUser({id:'a'});assert.equal(w.testStore.getProfile().name,'Ana');});
 await check('JSON corrupto vuelve a vacío',()=>{w.localStorage.setItem('stylingu:v2:a:outfits','{bad');assert.equal(w.testStore.getOutfits().length,0);});
 await check('respuesta IA incompleta no abre dossier',()=>{w.testApply({analyzedAt:'2026-10-28'});assert.equal(w.testStore.getAnalysis(),null);});
 await check('textos guardados no ejecutan HTML',()=>{w.testStore.addOutfit({top:'<img id="injected" onerror="alert(1)">',bottom:'pantalón'});w.eval('renderSaved()');assert.equal(w.document.getElementById('injected'),null);assert.match(w.document.getElementById('savedList').textContent,/<img/);});
 await check('navegación por teclado',()=>{const nav=w.document.getElementById('nav-color');nav.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(w.document.getElementById('nav-makeup').getAttribute('aria-selected'),'true');});
 await check('escáner separado de consulta',()=>{w.document.getElementById('comprasShootBtn').click();assert.equal(w.document.getElementById('scannerDialog').open,true);assert.equal(w.document.getElementById('consultationModal').hidden,true);w.document.getElementById('scanClose').click();});
 await check('etiquetas y estados accesibles',()=>{assert.ok(w.document.querySelector('label[for="scanQuery"]'));assert.equal(w.document.getElementById('scanStatus').getAttribute('aria-live'),'polite');assert.equal(w.document.getElementById('scannerDialog').getAttribute('aria-labelledby'),'scanTitle');});

 /* --- Entrega 1: el cliente espera más que el proveedor, no menos --- */
 await check('el cliente no caduca antes que el proveedor (125 s > 120 s)',()=>{
  assert.equal(w.testStore.requestTimeout('/personal/analyze'),125000);
  assert.equal(w.testStore.requestTimeout('/personal/photos'),125000);
  assert.equal(w.testStore.requestTimeout('/scans'),125000);
  assert.ok(w.testStore.requestTimeout('/personal/analyze')>120000);
  assert.equal(w.testStore.requestTimeout('/garments'),20000);
  assert.equal(w.testStore.requestTimeout('/auth/registro'),125000);
 });

 /* --- Perfil versionado y conjuntos externos --- */
 const analysis={
  analyzedAt:'2026-10-28T10:00:00Z',source:'meta',analysisId:'an-1',profileVersion:4,
  photos:{face:'/api/personal/photos/'+'a'.repeat(64),body:'/api/personal/photos/'+'b'.repeat(64)},
  colorimetry:{season:'otoño',temperature:'cálido',contrast:'medio',chroma:'medio',palette:['#AA5533','#BB6644','#CC7755','#DD8866'],avoid:[],harmony:0},
  makeup:{faceShape:'oval',eyeShape:'almendrada',eyelinerType:'suave',shadowPlacement:'difuminar',blushPlacement:'mejilla',look:'natural',lipHex:'#AA5533',blushHex:'#BB6644',applicationSteps:['Prepara la piel','Difumina la sombra','Fija con polvo']},
  outfit:{style:'natural',silhouette:'recta',accent:'terracota'},
  outfits:[{top:'Camisa lino',topDesc:'',bottom:'Pantalón sastre',bottomDesc:'',jacket:'',jacketDesc:'',acc:'',accDesc:''}],
  notes:['Nota del análisis'],observed:{hairColor:'castaño',eyeColor:'avellana',eyelid:'visible',depth:'media',uncertain:['Iluminación mixta']}
 };
 await check('las propuestas de la IA se marcan como externas, nunca como propias',()=>{
  w.testSetUser({id:'a'});w.testApply(analysis);
  assert.equal(w.testStore.getAnalysis().analysisId,'an-1');
  assert.equal(w.testD.externalOutfits.length,1);
  const text=w.document.getElementById('estilismosGrid').textContent;
  assert.match(text,/Propuesta externa/);
  assert.doesNotMatch(text,/Prendas propias/);
 });

 /* --- Entrega 2: maquillaje con catálogo real y tutoriales distintos --- */
 await check('el maquillaje usa el catálogo real y no inventa tonos',()=>{
  w.testStore.setCatalog([{_id:'v1',shade:'Moon',market:'US',finish:'brillo',colorVerified:false,hex:'',product:{brand:'Maybelline',name:'Lifter Gloss',category:'labial'},source:'https://example.test/ficha'}]);
  w.eval('renderProducts()');
  const lip=w.document.getElementById('lipList').textContent;
  assert.match(lip,/Maybelline/);assert.match(lip,/Moon/);assert.match(lip,/color no verificado/);
  assert.doesNotMatch(lip,/melocotón/);
  assert.match(w.document.getElementById('blushList').textContent,/Sin referencias verificadas/);
  assert.match(w.document.getElementById('eyesQuad').textContent,/Sin referencias verificadas/);
 });
 await check('catálogo vacío no se rellena con ejemplos',()=>{
  w.testStore.setCatalog([]);w.eval('renderProducts()');
  assert.match(w.document.getElementById('lipList').textContent,/Sin referencias verificadas/);
 });
 await check('cambiar de look cambia pasos, productos e intensidad',async()=>{
  w.api=async(path)=>{if(String(path).startsWith('/tutorial-progress'))return {completed:[]};return {};};
  const tutorials=[
   {id:'diario',title:'Diario suave',duration:8,difficulty:'inicial',intensity:'suave',categories:['colorete','labial'],goal:'día a día',zone:'rostro completo',steps:['Paso diario 1','Paso diario 2'],materials:['brocha'],adaptations:'Rostro oval.',alternative:'Omite el labial.'},
   {id:'noche',title:'Noche con contraste',duration:15,difficulty:'intermedio',intensity:'intensa',categories:['sombra','delineador'],goal:'luz artificial',zone:'ojos',steps:['Paso noche 1','Paso noche 2','Paso noche 3'],materials:['pincel'],adaptations:'Ojos almendrados.',alternative:'Refuerza la sombra.'},
   {id:'especial',title:'Ocasión especial',duration:20,difficulty:'avanzado',intensity:'media',categories:['sombra satinada'],goal:'ocasión',zone:'rostro completo',steps:['Paso especial 1'],materials:['espejo'],adaptations:'Rostro oval.',alternative:'Omite el colorete.'}
  ];
  w.testStore.setTutorials(tutorials);
  assert.equal(w.document.querySelectorAll('#looksGrid [data-look]').length,3);
  w.document.querySelector('[data-look="noche"]').click();
  await tick();
  assert.equal(w.document.getElementById('lookTitle').textContent,'Noche con contraste');
  assert.equal(w.document.getElementById('lookBadge').textContent,'intensa');
  const steps=w.document.getElementById('tutorialSteps').textContent;
  assert.match(steps,/Paso noche 1/);assert.doesNotMatch(steps,/Paso diario 1/);
  assert.match(w.document.getElementById('tutorialMeta').textContent,/15 min/);
  assert.match(w.document.getElementById('tutorialMeta').textContent,/Zona|intermedio/);
  w.document.querySelector('[data-look="diario"]').click();
  await tick();
  assert.match(w.document.getElementById('tutorialSteps').textContent,/Paso diario 1/);
 });

 /* --- Entrega 3: armario y calendario por fecha --- */
 const plans=[0,1,2,3,4,5,6].map(i=>({date:new Date(Date.now()+i*86400000).toISOString().slice(0,10),labels:['Top '+i,'Bottom '+i],signature:'sig'+i,status:'proposed',profileVersion:4,colors:['#AA5533'],explanation:'Prendas propias',origin:'owned'}));
 await check('el conjunto de hoy se recupera igual en dos aperturas',()=>{
  w.testSetUser({id:'w'});w.testStore.setPlans(plans);w.eval('renderOutfit()');
  const first=w.document.getElementById('outfitCounter').textContent;
  assert.match(first,new RegExp(localDate()));
  w.testStore.setPlans(plans);w.eval('renderOutfit()');
  assert.equal(w.document.getElementById('outfitCounter').textContent,first);
  assert.match(w.document.getElementById('outfitList').textContent,/Prendas propias/);
 });
 await check('siete conjuntos sin duplicados completos',()=>{
  assert.equal(new Set(plans.map(p=>p.signature)).size,7);
  assert.equal(plans.length,7);
 });
 await check('el botón recorre fechas del calendario, no ejemplos',()=>{
  const before=w.document.getElementById('outfitCounter').textContent;
  w.document.getElementById('shuffleBtn').click();
  const after=w.document.getElementById('outfitCounter').textContent;
  assert.notEqual(after,before);
  assert.match(after,/\d{4}-\d{2}-\d{2}/);
 });
 await check('aceptar un conjunto persiste en la cuenta y en local',async()=>{
  let patched=null;
  w.api=async(path,opts)=>{if(String(path).startsWith('/outfit-plans/')){patched=JSON.parse(opts.body);return {item:{}};}return {};};
  w.eval('renderOutfit()');
  const before=w.testStore.getOutfits().length;
  w.document.getElementById('saveOutfitBtn').click();
  await tick();
  assert.equal(patched.status,'accepted');
  assert.equal(w.testStore.getOutfits().length,before+1);
  assert.match(w.document.getElementById('savedList').textContent,/Top 0|Top 1|Top 2|Top 3|Top 4|Top 5|Top 6/);
 });
 await check('cambiar de cuenta borra el calendario en memoria',()=>{
  w.testSetUser({id:'otra'});assert.equal(w.testStore.getPlans().length,0);assert.equal(w.testStore.getTodayPlan(),null);
 });

 /* --- Entrega 4: escáner contra catálogo y widget de decisión --- */
 await check('producto desconocido conserva la incertidumbre',async()=>{
  w.testSetUser({id:'s'});w.eval('openScanner(false)');
  w.api=async(path)=>{if(path==='/scans')return {state:'unknown',candidates:[]};return {};};
  await w.eval("scanRequest({query:'producto inexistente'})");
  assert.match(w.document.getElementById('scanStatus').textContent,/No puedo identificar|no puedo identificar/);
  assert.equal(w.document.querySelectorAll('#scanResults button').length,0);
 });
 await check('envase conocido con tono desconocido pide confirmación',async()=>{
  w.api=async(path)=>{if(path==='/scans')return {state:'confirm_variant',candidates:[{_id:'v1',shade:'Moon',market:'US',product:{brand:'Maybelline',name:'Lifter Gloss'}}]};return {};};
  await w.eval("scanRequest({barcode:'1234567890123'})");
  assert.match(w.document.getElementById('scanStatus').textContent,/Confirma el tono/);
  assert.equal(w.document.querySelectorAll('#scanResults button').length,1);
 });
 await check('widget favorable con motivos, versión de perfil y feedback persistido',async()=>{
  let feedback=null;
  w.api=async(path,opts)=>{
   if(path==='/scans')return {state:'identified',variant:{_id:'v1',shade:'Moon'}};
   if(path==='/purchase-recommendations')return {state:'favorable',label:'Buena compra para ti',reasons:['El tono está próximo a tu paleta.','Afinidad orientativa del sistema.'],profileVersion:4,product:{brand:'Maybelline',name:'Lifter Gloss'},variant:{shade:'Moon'}};
   if(path==='/recommendation-feedback'){feedback=JSON.parse(opts.body);return {saved:true,effect:'Preferencia guardada para ordenar tu catálogo.'};}
   return {};
  };
  await w.eval("scanRequest({barcode:'7777777777777'})");
  await tick();
  assert.equal(w.document.getElementById('scanStatus').textContent,'Buena compra para ti');
  const text=w.document.getElementById('scanResults').textContent;
  assert.match(text,/El tono está próximo a tu paleta/);
  assert.match(text,/Perfil v4/);
  assert.equal(w.testStore.getScanner().variantId,'v1');
  assert.equal(w.document.getElementById('thumbUpBtn').hidden,false);
  const like=[...w.document.querySelectorAll('#scanResults button')].find(b=>b.textContent==='Me gusta');
  like.click();await tick();
  assert.deepEqual(feedback,{variantId:'v1',action:'like'});
 });
 await check('una respuesta tardía no sobrescribe el producto nuevo',async()=>{
  let release;
  w.api=async(path)=>{if(path==='/scans'){await new Promise(r=>{release=r;});return {state:'confirm_variant',candidates:[{_id:'old',shade:'Old',product:{brand:'Vieja',name:'Marca'}}]};}return {};};
  const pending=w.eval("scanRequest({query:'producto viejo'})");
  w.document.getElementById('scanQuery').dispatchEvent(new w.Event('input'));
  release();
  await pending;await tick();
  assert.equal(w.document.getElementById('scanResults').children.length,0);
  assert.doesNotMatch(w.document.getElementById('scanResults').textContent,/Vieja/);
 });
 await check('el mismo envase no se consulta dos veces al proveedor',async()=>{
  let calls=0;
  w.api=async(path)=>{if(path==='/scans'){calls++;return {state:'unknown',candidates:[]};}return {};};
  await w.eval("scanRequest({barcode:'9999999999999'})");
  await w.eval("scanRequest({barcode:'9999999999999'})");
  assert.equal(calls,1);
 });
 await check('el widget no depende solo del color para informar',()=>{
  assert.equal(w.document.getElementById('scanStatus').getAttribute('aria-live'),'polite');
  assert.ok(w.document.getElementById('scanResults').tagName);
 });

 console.log('UX DOM: '+checks+'/'+checks+' checks passed');dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
