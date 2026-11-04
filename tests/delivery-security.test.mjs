import test from 'node:test';
import assert from 'node:assert/strict';
import {signProxy,verifyProxy} from '../shared/proxy-auth.js';
import {createWorker} from '../worker/free.js';
import {defaultCorsAndOriginPolicy, defaultInputSecurityValidator} from '../shared/security-policy.js';
const origin='https://stylingu-free-preview.castellanomateossara.workers.dev';
const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);
const allow={limit:async()=>({success:true})};
const env={EDGE_SIGNING_KEY:JSON.stringify(privateKey),API_GUARD:allow,AUTH_GUARD:allow,TURNSTILE_SECRET:'unit-test-only',TURNSTILE_SITE_KEY:'public-test',BACKEND_URL:'https://zbfxwbuuuzjzmsrraxkf.supabase.co/functions/v1/stylingu-preview-api'};
const req=(path='/api/auth/login',extra={})=>new Request(origin+path,{method:'POST',body:'{}',...extra,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.3','X-Turnstile-Token':'one-time-token',...extra.headers}});
test('firma: no permite cambiar método, ruta, origen, IP, cookie, tipo ni cuerpo',async()=>{
 const input={method:'POST',path:'/stylingu-preview-api/api/profile',origin,ip:'192.0.2.1',time:String(Date.now()),cookie:'stylingu_sid=abc',contentType:'application/json',body:new TextEncoder().encode('{"budget":30}')};
 const signature=await signProxy(input,privateKey);assert.equal(await verifyProxy(input,signature,publicKey),true);
 for(const patch of [{method:'DELETE'},{path:input.path+'?x=1'},{origin:'https://evil.test'},{ip:'192.0.2.2'},{cookie:'stylingu_sid=other'},{contentType:'text/plain'},{body:new TextEncoder().encode('{"budget":0}')},{time:String(Date.now()-31000)},{time:String(Date.now()+60000)}])assert.equal(await verifyProxy({...input,...patch},signature,publicKey),false,JSON.stringify(patch));
 assert.equal(await verifyProxy(input,'',publicKey),false);
});
test('Worker: captcha válido se verifica antes del proxy; token repetido rechazado',async()=>{
 let used=false,forwarded=0;
 const worker=createWorker({},async(request,options)=>{
  if(typeof request==='string'){assert.equal(request,'https://challenges.cloudflare.com/turnstile/v0/siteverify');const body=JSON.parse(options.body);assert.equal(body.remoteip,'192.0.2.3');const success=!used;used=true;return Response.json({success,hostname:new URL(origin).hostname,action:'login'});}
  forwarded++;const input={method:request.method,path:new URL(request.url).pathname+new URL(request.url).search,origin:request.headers.get('X-Stylingu-Origin'),ip:request.headers.get('X-Stylingu-IP'),time:request.headers.get('X-Stylingu-Time'),cookie:request.headers.get('Cookie')||'',contentType:request.headers.get('Content-Type')||'',body:new Uint8Array(await request.arrayBuffer())};assert.equal(await verifyProxy(input,request.headers.get('X-Stylingu-Signature'),publicKey),true);return Response.json({ok:true});
 });
 assert.equal((await worker.fetch(req(),env)).status,200);assert.equal((await worker.fetch(req(),env)).status,403);assert.equal(forwarded,1);
});
test('Worker: sin captcha, con hostname/acción falsos o error del verificador se cierra el acceso',async()=>{
 let proxies=0;
 for(const verdict of [{success:false},{success:true,hostname:'evil.test',action:'login'},{success:true,hostname:new URL(origin).hostname,action:'registro'}]){
  const worker=createWorker({},async r=>{if(typeof r!=='string')proxies++;return Response.json(verdict);});
  assert.equal((await worker.fetch(req(),env)).status,403);
 }
 const worker=createWorker({},async()=>{throw Error('offline');});
 assert.equal((await worker.fetch(req(),env)).status,503);
 assert.equal((await worker.fetch(req('/api/auth/login',{headers:{'X-Turnstile-Token':''}}),env)).status,403);assert.equal(proxies,0);
 for(const path of ['/api/auth/login/','/api/AUTH/LOGIN'])assert.equal((await worker.fetch(req(path,{headers:{'X-Turnstile-Token':''}}),env)).status,403);
});
test('Worker: CSRF, límite previo al captcha, JSON y tamaño; no filtra secretos',async()=>{
 let forwarded=0;const worker=createWorker({},async()=>{forwarded++;return Response.json({success:true});});
 assert.equal((await worker.fetch(req('/api/profile',{headers:{Origin:'https://evil.test'}}),env)).status,403);
 assert.equal((await worker.fetch(req('/api/profile',{headers:{Origin:''}}),env)).status,403);
 const throttled=await worker.fetch(req(),{...env,AUTH_GUARD:{limit:async()=>({success:false})}});assert.equal(throttled.status,429);assert.equal(throttled.headers.get('Retry-After'),'60');
 assert.equal((await worker.fetch(req('/api/profile',{headers:{'Content-Type':'text/plain'}}),env)).status,415);
 assert.equal((await worker.fetch(req('/api/profile',{body:'a'.repeat(65537)}),env)).status,413);
 assert.equal((await worker.fetch(req('/api/profile'),{...env,EDGE_SIGNING_KEY:''})).status,503);
 assert.equal(forwarded,0);
 const config=await worker.fetch(new Request(origin+'/api/public-config',{headers:{'CF-Connecting-IP':'192.0.2.3'}}),env);assert.deepEqual(await config.json(),{turnstileRequired:true,sitekey:'public-test'});assert.match(config.headers.get('Content-Security-Policy'),/frame-ancestors 'none'/);assert.equal(config.headers.get('X-Frame-Options'),'DENY');
});
test('CORS Meta AI y API: preflight OPTIONS estricto sin asterisco y bloqueo de API keys en cabeceras del cliente',async()=>{
 const worker=createWorker({},async()=>Response.json({ok:true}));
 const preflightOk=await worker.fetch(new Request(origin+'/api/personal/analyze',{method:'OPTIONS',headers:{Origin:origin,'CF-Connecting-IP':'192.0.2.3'}}),env);
 assert.equal(preflightOk.status,204);
 assert.equal(preflightOk.headers.get('Access-Control-Allow-Origin'),origin);
 assert.notEqual(preflightOk.headers.get('Access-Control-Allow-Origin'),'*');
 assert.equal(preflightOk.headers.get('Access-Control-Allow-Credentials'),'true');
 assert.equal(preflightOk.headers.get('Vary'),'Origin');
 const preflightEvil=await worker.fetch(new Request(origin+'/api/personal/analyze',{method:'OPTIONS',headers:{Origin:'https://evil.test','CF-Connecting-IP':'192.0.2.3'}}),env);
 assert.equal(preflightEvil.status,403);
 assert.equal(preflightEvil.headers.get('Access-Control-Allow-Origin'),null);
 assert.equal(defaultCorsAndOriginPolicy.isOriginTrusted('*',origin,'*'),false);
 const forbiddenKey=await worker.fetch(req('/api/personal/analyze',{headers:{'X-Meta-Api-Key':'leaked-client-key'}}),env);
 assert.equal(forbiddenKey.status,400);
 assert.equal((await forbiddenKey.json()).code,'CLIENT_API_KEY_FORBIDDEN');
});
test('Validación de servidor: emails estrictos y filtrado anti-XSS en armario',()=>{
 assert.equal(defaultInputSecurityValidator.isValidEmail('sara@stylingu.es'),true);
 for(const badEmail of ['','a..b@stylingu.es','.a@stylingu.es','a@stylingu','<script>@stylingu.es','a@.stylingu.es']){
  assert.equal(defaultInputSecurityValidator.isValidEmail(badEmail),false,badEmail);
 }
 assert.throws(()=>defaultInputSecurityValidator.validateWardrobeOutfitPayload({top:'<script>alert(1)</script>',bottom:'Pantalón',jacket:'Blazer'}),e=>e.status===400);
 const cleanOutfit=defaultInputSecurityValidator.validateWardrobeOutfitPayload({top:'Camisa seda',bottom:'Pantalón recto',jacket:'Blazer lino',note:'Ideal oficina'});
 assert.equal(cleanOutfit.top,'Camisa seda');
});
