import {signProxy} from '../shared/proxy-auth.js';
import {defaultSecurityHeadersPolicy, defaultCorsAndOriginPolicy} from '../shared/security-policy.js';
const BACKEND_ORIGIN='https://zbfxwbuuuzjzmsrraxkf.supabase.co';
const ORIGINS=new Set(['https://hackathon-stylingu.castellanomateossara.workers.dev','https://stylingu-free-preview.castellanomateossara.workers.dev']);
const AUTH=new Set(['/api/auth/login','/api/auth/registro','/api/auth/forgot-password','/api/auth/reset-password']);
export const SECURITY_HEADERS=defaultSecurityHeadersPolicy.getHeadersRecord();
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{...SECURITY_HEADERS,'Cache-Control':'no-store',...extra}});
async function boundedBody(request,max){
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new Error('BODY_TOO_LARGE');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}return bytes;
}
export function createWorker(assets,fetcher=fetch){
 return {async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')){
   if(!ORIGINS.has(url.origin))return json({code:'ORIGIN_DENIED'},403);
   if(defaultCorsAndOriginPolicy.hasForbiddenClientCredentialHeaders(function(name){return request.headers.get(name);})){
    return json({code:'CLIENT_API_KEY_FORBIDDEN',error:'La clave de Meta AI se gestiona exclusivamente en el servidor.'},400);
   }
   const reqOrigin=request.headers.get('Origin');
   const corsHeaders=reqOrigin&&ORIGINS.has(reqOrigin)?defaultCorsAndOriginPolicy.buildCorsHeaders(reqOrigin,url.origin):{};
   if(request.method==='OPTIONS'){
    if(!reqOrigin||!ORIGINS.has(reqOrigin)||request.headers.get('Sec-Fetch-Site')==='cross-site'){
     return json({code:'ORIGIN_DENIED',error:'Origen no permitido.'},403);
    }
    return new Response(null,{status:204,headers:{...SECURITY_HEADERS,'Cache-Control':'no-store',...corsHeaders}});
   }
   const mutating=!['GET','HEAD','OPTIONS'].includes(request.method);
   if(mutating&&reqOrigin!==url.origin||request.headers.get('Sec-Fetch-Site')==='cross-site'||(reqOrigin&&!ORIGINS.has(reqOrigin))){
    return json({code:'ORIGIN_DENIED',error:'Origen no permitido.'},403);
   }
   if(!['GET','HEAD','POST','PATCH','PUT','DELETE'].includes(request.method))return json({code:'METHOD_NOT_ALLOWED'},405,corsHeaders);
   const ip=request.headers.get('CF-Connecting-IP');
   if(!ip||!env.EDGE_SIGNING_KEY||!env.API_GUARD||!env.AUTH_GUARD)return json({code:'DEPLOY_CONFIG',error:'Servicio temporalmente no disponible.'},503,corsHeaders);
   const limited=await env.API_GUARD.limit({key:ip});if(!limited.success)return json({code:'RATE_LIMITED',error:'Demasiadas solicitudes. Espera un minuto.'},429,{'Retry-After':'60',...corsHeaders});
   if(url.pathname==='/api/public-config')return json({turnstileRequired:true,sitekey:env.TURNSTILE_SITE_KEY},200,corsHeaders);
   const authPath=url.pathname.replace(/\/+$/,'').toLowerCase();const auth=AUTH.has(authPath);
   if(auth&&!(await env.AUTH_GUARD.limit({key:ip})).success)return json({code:'RATE_LIMITED',error:'Demasiados intentos. Espera un minuto.'},429,{'Retry-After':'60',...corsHeaders});
   const contentType=request.headers.get('Content-Type')||'';
   if(mutating&&!/^application\/json(?:;|$)/i.test(contentType))return json({code:'JSON_REQUIRED',error:'Usa contenido JSON.'},415,corsHeaders);
   const max=url.pathname==='/api/personal/photos'?6000000:url.pathname==='/api/scans'?3000000:65536;
   if(Number(request.headers.get('Content-Length'))>max)return json({code:'BODY_TOO_LARGE'},413,corsHeaders);
   let body;try{body=await boundedBody(request,max);}catch{return json({code:'BODY_TOO_LARGE',error:'La solicitud supera el tamaño permitido.'},413,corsHeaders);}
   if(auth){
    if(!env.TURNSTILE_SECRET)return json({code:'DEPLOY_CONFIG'},503,corsHeaders);
    const token=request.headers.get('X-Turnstile-Token');if(!token||token.length>2048)return json({code:'BOT_CHECK_REQUIRED',error:'Completa la verificación de seguridad.'},403,corsHeaders);
    try{
     const r=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET,response:token,remoteip:ip}),signal:AbortSignal.timeout(10000)});
     const verdict=await r.json();const action=authPath.split('/').pop().replaceAll('-','_');
     if(!r.ok||!verdict.success||verdict.hostname!==url.hostname||verdict.action!==action)return json({code:'BOT_CHECK_FAILED',error:'La verificación ha caducado o no es válida. Reintenta.'},403,corsHeaders);
    }catch{return json({code:'BOT_CHECK_UNAVAILABLE',error:'No se pudo verificar el acceso. Reintenta.'},503,corsHeaders);}
   }
   if(!env.BACKEND_URL)return json({code:'DEPLOY_CONFIG'},503,corsHeaders);
   const backend=new URL(env.BACKEND_URL);
   if(backend.origin!==BACKEND_ORIGIN||!/^\/functions\/v1\/stylingu-(api|preview-api)$/.test(backend.pathname))return json({code:'DEPLOY_CONFIG'},503,corsHeaders);
   backend.pathname+='/'+url.pathname.slice(1);backend.search=url.search;
   const headers=new Headers(request.headers);
   for(const name of [...headers.keys()])if(name.startsWith('x-stylingu-')||name.startsWith('x-forwarded-')||['forwarded','host','authorization','x-turnstile-token','cf-connecting-ip','content-length','x-meta-api-key','meta-api-key','x-model-api-key','model-api-key'].includes(name))headers.delete(name);
   const time=String(Date.now());headers.set('X-Stylingu-Origin',url.origin);headers.set('X-Stylingu-IP',ip);headers.set('X-Stylingu-Time',time);
   const signature=await signProxy({method:request.method,path:backend.pathname+backend.search,origin:url.origin,ip,time,body,cookie:headers.get('Cookie')||'',contentType},JSON.parse(env.EDGE_SIGNING_KEY));
   headers.set('X-Stylingu-Signature',signature);
   try{
    const response=await fetcher(new Request(backend,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:body,redirect:'manual'}));
    const out=new Headers(response.headers);for(const [k,v] of Object.entries(SECURITY_HEADERS))out.set(k,v);for(const [k,v] of Object.entries(corsHeaders))out.set(k,v);out.set('Cache-Control','private, no-store');
    return new Response(response.body,{status:response.status,headers:out});
   }catch{return json({code:'BACKEND_UNAVAILABLE',error:'No se pudo conectar. Reintenta en unos segundos.'},503,corsHeaders);}
  }
  if(!['GET','HEAD'].includes(request.method))return json({code:'METHOD_NOT_ALLOWED'},405);
  if(url.pathname.startsWith('/vision/')){
   if(!env.VISION_ASSETS)return new Response('Detector no disponible.',{status:503,headers:SECURITY_HEADERS});
   const response=await env.VISION_ASSETS.fetch(request);
   const headers=new Headers(response.headers);
   for(const [key,value] of Object.entries(SECURITY_HEADERS))headers.set(key,value);
   if(url.pathname.endsWith('.wasm'))headers.set('Content-Type','application/wasm');
   return new Response(response.body,{status:response.status,headers});
  }
  const key=url.pathname==='/'?'/index.html':url.pathname,item=assets[key];if(!item)return new Response('No encontrado.',{status:404,headers:SECURITY_HEADERS});
  const headers={...SECURITY_HEADERS,'Content-Type':item.type,'Cache-Control':key.endsWith('.html')||key==='/sw.js'?'no-cache':'public, max-age=600'};
  if(request.method==='HEAD')return new Response(null,{headers});
  return new Response(Uint8Array.from(atob(item.base64),c=>c.charCodeAt(0)),{headers});
 }};
}
// Compatibilidad con el namespace heredado de Containers. No se enlaza en el runtime gratuito.
export class StylinguContainer{async fetch(){return json({code:'LEGACY_RUNTIME_RETIRED'},410);}}
