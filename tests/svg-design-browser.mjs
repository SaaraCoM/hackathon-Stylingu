import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {SECURITY_HEADERS} from '../worker/free.js';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const {default:AxeBuilder}=require('@axe-core/playwright');
const publicDir=path.resolve('frontend/public');
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(publicDir,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(publicDir+path.sep)){res.writeHead(403).end();return;}
  const content=await fs.readFile(file);
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.task':'application/octet-stream'};
  res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':types[path.extname(file)]||'text/plain'}).end(content);
 } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1040},serviceWorkers:'block'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const analysis={analyzedAt:'2026-11-04T10:00:00Z',source:'mock',analysisId:'fixture',profileVersion:1,photos:{face:'/api/personal/photos/'+'a'.repeat(64),body:'/api/personal/photos/'+'b'.repeat(64)},colorimetry:{season:'Primavera cálida',temperature:'cálida',contrast:'medio',chroma:'medio',palette:['#E7CE75','#EAD6CF','#CDB29D','#A7CDD5','#93AD68','#DB744D','#B84C7B','#7094A3','#697654','#28597E'],avoid:[],harmony:0},makeup:{faceShape:'oval',eyeShape:'almendrada',eyelinerType:'suave',shadowPlacement:'difuminar',blushPlacement:'mejilla',look:'natural',lipHex:'#AA5533',blushHex:'#BB6644',applicationSteps:['Prepara la piel','Difumina la sombra']},outfit:{style:'natural',silhouette:'recta'},outfits:[],notes:[]};
await page.route('**/api/**',async route=>{
 const pathname=new URL(route.request().url()).pathname;
 if(pathname.includes('/photos/')){await route.fulfill({path:path.join(publicDir,'assets/svg-design/makeup.jpg'),contentType:'image/jpeg'});return;}
 const body=pathname==='/api/auth/yo'?{user:{id:'fixture',name:'Lucía (prueba)'}}:pathname==='/api/auth/perfil'?{preferences:{},analysis}:pathname==='/api/profile'?{profile:{version:1,declared:{}}}:pathname==='/api/outfit-plans'?{plans:[]}:pathname==='/api/tutorial-progress'?{completed:[]}:{items:[]};
 await route.fulfill({json:body});
});
await fs.mkdir('docs/svg-design/browser',{recursive:true});
try {
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('.su-mounted').waitFor();
 await page.locator('.su-header').waitFor({state:'visible'});
 for(const [label,file] of [['Inicio','home'],['UColors','colors'],['Makeup','makeup'],['Outfits','outfits'],['AIShoppie','shopping']]){
  await page.getByRole('navigation',{name:'Secciones de StylingU'}).getByRole('button',{name:label,exact:true}).click();
  await page.screenshot({path:`docs/svg-design/browser/${file}-desktop.png`,fullPage:true});
  assert.equal(await page.locator('.su-app h1:visible').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label}: desktop overflow`);
 }
 await page.getByRole('button',{name:'Escanear o buscar producto'}).click();
 assert.equal(await page.locator('#scannerDialog').isVisible(),true);
 await page.locator('#scanClose').click();
 await page.getByRole('button',{name:'Consultar mi paleta'}).click();
 await page.locator('#swatches button').first().click();
 assert.match(await page.locator('#swatchName').textContent(),/#E7CE75/);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Descargar paleta'}).click();assert.equal((await download).suggestedFilename(),'stylingu-paleta.txt');
 await page.getByRole('navigation',{name:'Secciones de StylingU'}).getByRole('button',{name:'Inicio',exact:true}).click();
 const accessibility=await new AxeBuilder({page}).include('.su-app').withTags(['wcag2a','wcag2aa']).analyze();
 await fs.writeFile('docs/svg-design/browser/axe.json',JSON.stringify(accessibility.violations,null,2));
 assert.deepEqual(accessibility.violations.map(v=>v.id),[],'home accessibility');
 if(process.env.TEST_TRYON==='1'){
  await page.getByRole('navigation',{name:'Secciones de StylingU'}).getByRole('button',{name:'Makeup',exact:true}).click();
  await page.getByRole('button',{name:'Preparar mi foto',exact:true}).click();
  await page.locator('#tryon-status').filter({hasText:'Contornos detectados'}).waitFor({timeout:90000}).catch(async error=>{console.error('TRYON:',await page.locator('#tryon-status').textContent(),errors);throw error;});
  const pixels=()=>page.locator('.su-tryon canvas').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data));
  const tinted=await pixels();
  await page.getByRole('button',{name:'Ver original',exact:true}).click();
  const original=await pixels();
  assert.notDeepEqual(tinted,original,'real detected regions change pixels');
  assert.deepEqual(tinted.slice(0,400),original.slice(0,400),'background is unchanged');
  await page.getByRole('button',{name:'Volver a la simulación',exact:true}).click();
  for(const id of ['sliderOpacidad','sliderSombra'])await page.locator('#'+id).fill('0');
  assert.deepEqual(await pixels(),original,'zero intensities exactly restore original');
  await page.locator('#sliderOpacidad').fill('75');
  await page.getByLabel('Tono de labios',{exact:true}).fill('#b12854');
  assert.notDeepEqual(await pixels(),original,'custom tone changes lips');
  await page.locator('.su-tryon').screenshot({path:'docs/tone-simulator/working-desktop.png'});
  const a11y=await new AxeBuilder({page}).include('.su-tryon').withTags(['wcag2a','wcag2aa']).analyze();
  await fs.writeFile('docs/tone-simulator/axe.json',JSON.stringify(a11y.violations,null,2));
  assert.deepEqual(a11y.violations.map(v=>v.id),[],'simulator accessibility');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.su-tryon').screenshot({path:'docs/tone-simulator/working-mobile.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const blank=await require('sharp')({create:{width:640,height:640,channels:3,background:'#eee'}}).png().toBuffer();
  await page.route('**/api/personal/photos/'+ 'c'.repeat(64),route=>route.fulfill({body:blank,contentType:'image/png'}));
  await page.evaluate(()=>{const a=store.getAnalysis();store.applyAnalysis({...a,photos:{...a.photos,face:'/api/personal/photos/'+'c'.repeat(64)}});});
  await page.getByRole('button',{name:'Preparar mi foto',exact:true}).click();
  await page.locator('#tryon-status').filter({hasText:'No se ha detectado un rostro'}).waitFor({timeout:90000});
  assert.equal(await page.locator('.su-tryon canvas').count(),0,'no stale image after photo change');
  assert.equal(await page.locator('#sliderOpacidad').isDisabled(),true,'controls disabled without face');
  console.log('PASS: real face detector, pixel changes, unchanged background, original comparison, zero opacity, custom color, no-face error, mobile and axe.');
 }
 await page.setViewportSize({width:390,height:844});
 for(const label of ['Inicio','UColors','Makeup','Outfits','AIShoppie']){
  await page.getByRole('navigation',{name:'Secciones de StylingU'}).getByRole('button',{name:label,exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${label}: mobile overflow`);
  await page.screenshot({path:`docs/svg-design/browser/${label}-mobile.png`,fullPage:true});
 }
 await page.evaluate(()=>{currentUser=null;store.setUser(null);store.applyAnalysis(null);});
 await page.locator('#analysisGate').waitFor({state:'visible'});
 assert.equal(await page.locator('.su-app').isVisible(),false,'private shell hidden after logout');
 assert.deepEqual(errors,[]);
 console.log('PASS: five views desktop/mobile, palette selection/download, scanner, axe home, logout privacy, no JS errors. API responses simulated.');
} catch(error) {console.error(error);throw error;}
finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
