import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {SECURITY_HEADERS} from '../worker/free.js';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const publicDir=path.resolve('frontend/public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.wasm':'application/wasm','.task':'application/octet-stream'};
const server=createServer(async(req,res)=>{
 try {
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(publicDir,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(publicDir+path.sep)){res.writeHead(403).end();return;}
  const content=await fs.readFile(file);
  res.writeHead(200,{...SECURITY_HEADERS,'Content-Type':types[path.extname(file)]||'text/plain'}).end(content);
 } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const analysis={analyzedAt:'2026-11-04T10:00:00Z',source:'mock',photos:{face:'/api/personal/photos/'+'a'.repeat(64),body:'/api/personal/photos/'+'b'.repeat(64)},colorimetry:{season:'Primavera cálida',temperature:'cálida',contrast:'medio',chroma:'medio',palette:['#E7CE75','#EAD6CF','#CDB29D','#A7CDD5','#93AD68','#DB744D'],avoid:[],harmony:0},makeup:{faceShape:'oval',eyeShape:'almendrada',eyelinerType:'suave',shadowPlacement:'difuminar',blushPlacement:'mejilla',look:'natural',lipHex:'#AA5533',blushHex:'#BB6644'},outfit:{style:'natural',silhouette:'recta'},outfits:[],notes:[]};
/* Use an installed Chrome when the bundled Playwright browser is not downloaded. */
const installedChrome=await fs.access('C:/Program Files/Google/Chrome/Application/chrome.exe').then(()=>'C:/Program Files/Google/Chrome/Application/chrome.exe',()=>undefined);
const browser=await chromium.launch({headless:true,executablePath:installedChrome});
/* A real browser UA: PostHog (correctly) refuses to record known bots such as HeadlessChrome. */
const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'});
const page=await context.newPage();
/* PostHog skips automation; behave as a regular browser for the replay check. */
await page.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
/* The committed config file ships without a key; the check supplies a synthetic one. */
await page.route('**/posthog-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.STYLINGU_POSTHOG={key:"test_project_token_123",host:"https://eu.i.posthog.com"};'}));
const pageErrors=[],consoleErrors=[];
page.on('pageerror',error=>pageErrors.push(error.message));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
const ingest=[];
const decode=request=>{
 const buffer=request.postDataBuffer();
 if(!buffer)return '';
 if(buffer[0]===0x1f&&buffer[1]===0x8b){try{return gunzipSync(buffer).toString('utf8');}catch{/* fall through */}}
 return buffer.toString('utf8');
};
await page.route('**/*.posthog.com/**',async route=>{
 const request=route.request();
 const url=request.url();
 /* The recorder and config loader are real PostHog scripts; the project config and ingest are stubbed. */
 if(url.includes('/static/'))return route.continue();
 if(url.includes('/array/')){
  if(url.endsWith('config.js'))return route.fulfill({status:200,contentType:'text/javascript',body:'window._POSTHOG_REMOTE_CONFIG=window._POSTHOG_REMOTE_CONFIG||{};'});
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sessionRecording:{enabled:true},hasFeatureFlags:false,supportedCompression:['gzip-js']})});
 }
 if(url.includes('/flags'))return route.fulfill({status:200,contentType:'application/json',body:'{"flags":{}}'});
 ingest.push({url,body:decode(request)});
 await route.fulfill({status:200,contentType:'application/json',body:'{"status":1}'});
});
await page.route('**/api/**',async route=>{
 const pathname=new URL(route.request().url()).pathname;
 if(pathname.includes('/photos/')){await route.fulfill({path:path.join(publicDir,'assets/svg-design/makeup.jpg'),contentType:'image/jpeg'});return;}
 const body=pathname==='/api/auth/yo'?{user:{id:'fixture',name:'Lucía (prueba)'}}:pathname==='/api/auth/perfil'?{preferences:{},analysis}:pathname==='/api/profile'?{profile:{version:1,declared:{}}}:pathname==='/api/outfit-plans'?{plans:[]}:pathname==='/api/tutorial-progress'?{completed:[]}:{items:[]};
 await route.fulfill({json:body});
});
const waitFor=async(predicate,timeout=20000)=>{
 const started=Date.now();
 while(Date.now()-started<timeout){if(predicate())return;await new Promise(r=>setTimeout(r,250));}
 throw new Error('Timeout esperando la condición');
};
const state=()=>page.evaluate(()=>({consent:window.stylinguAnalytics.consent(),configured:window.stylinguAnalytics.configured(),recording:window.stylinguAnalytics.recording()}));
try {
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('.su-mounted').waitFor();
 assert.deepEqual(await state(),{consent:'unset',configured:true,recording:false},'sin consentimiento no hay grabación');
 await page.waitForTimeout(1500);
 assert.equal(ingest.length,0,'la app no contacta con PostHog antes del consentimiento');

 /* El aviso de consentimiento vive en el menú (el pie de página no se muestra en móvil). */
 await page.getByRole('button',{name:'Abrir menú'}).click();
 assert.equal(await page.getByRole('button',{name:'Permitir grabación'}).isVisible(),true);
 await page.getByRole('button',{name:'Permitir grabación'}).click();
 await page.locator('.su-sheet-close').click();
 await page.waitForFunction(()=>window.stylinguAnalytics.recording()===true,undefined,{timeout:30000});
 assert.equal((await state()).consent,'granted');
 await page.locator('.su-header-nav').getByRole('button',{name:'Makeup',exact:true}).click();
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.getByRole('button',{name:'Mi perfil y privacidad'}).click();
 await page.locator('#deleteConfirmation').fill('PRIVADO-NO-GRABAR');
 await waitFor(()=>ingest.some(request=>request.body.includes('$snapshot')),30000);
 await page.waitForTimeout(6000);

 const payloads=ingest.map(request=>request.body).join('\n');
 assert.ok(payloads.includes('journey_view'),'el recorrido se vincula a eventos de la sesión');
 assert.ok(payloads.includes('makeup'),'la vista visitada viaja con el evento');
 assert.ok(!payloads.includes('/api/personal/photos/'),'las fotos privadas no entran en la grabación');
 assert.ok(!payloads.includes('PRIVADO-NO-GRABAR'),'los campos escritos quedan enmascarados');
 assert.ok(!payloads.includes('Lucía'),'el nombre de la persona queda enmascarado');

 await page.locator('#closeAccountBtn2').click();
 await page.getByRole('button',{name:'Abrir menú'}).click();
 await page.getByRole('button',{name:'Desactivar'}).click();
 await page.waitForFunction(()=>window.stylinguAnalytics.recording()===false);
 await page.waitForTimeout(6000);
 const settled=ingest.length;
 await page.waitForTimeout(6000);
 assert.equal(ingest.length,settled,'al desactivar no se envía ninguna grabación más');

 assert.deepEqual(pageErrors,[]);
 assert.deepEqual(consoleErrors.filter(text=>!/favicon/.test(text)),[]);
 console.log('PASS: consentimiento previo, grabación real enmascarada, eventos de recorrido y revocación. PostHog recibe datos de prueba interceptados.');
} catch(error) {console.error(error);throw error;}
finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
