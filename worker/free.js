const BACKEND_ORIGIN='https://zbfxwbuuuzjzmsrraxkf.supabase.co';
export function createWorker(assets,fetcher=fetch){
  return {async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/')){
      if(!env.BACKEND_URL)return Response.json({code:'DEPLOY_CONFIG',error:'Backend no configurado.'},{status:503});
      const backend=new URL(env.BACKEND_URL);
      if(backend.origin!==BACKEND_ORIGIN||!/^\/functions\/v1\/stylingu-(api|preview-api)$/.test(backend.pathname))return Response.json({code:'DEPLOY_CONFIG'},{status:503});
      backend.pathname+='/'+url.pathname.slice(1);backend.search=url.search;
      const headers=new Headers(request.headers);
      for(const name of [...headers.keys()])if(name.startsWith('x-stylingu-')||name.startsWith('x-forwarded-')||name==='forwarded'||name==='host'||name==='authorization')headers.delete(name);
      headers.set('X-Stylingu-Origin',url.origin);
      try{
        const response=await fetcher(new Request(backend,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',duplex:'half'}));
        const out=new Headers(response.headers);out.set('Cache-Control','private, no-store');out.set('X-Content-Type-Options','nosniff');
        return new Response(response.body,{status:response.status,headers:out});
      }catch{return Response.json({code:'BACKEND_UNAVAILABLE',error:'No se pudo conectar. Reintenta en unos segundos.'},{status:503,headers:{'Cache-Control':'no-store'}});}
    }
    if(!['GET','HEAD'].includes(request.method))return new Response('Método no permitido.',{status:405,headers:{Allow:'GET, HEAD'}});
    const key=url.pathname==='/'?'/index.html':url.pathname;
    const item=assets[key];
    if(!item)return new Response('No encontrado.',{status:404});
    const headers={'Content-Type':item.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Permissions-Policy':'camera=(self)','Cache-Control':key.endsWith('.html')||key==='/sw.js'?'no-cache':'public, max-age=600'};
    if(request.method==='HEAD')return new Response(null,{headers});
    const raw=atob(item.base64);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    return new Response(bytes,{headers});
  }};
}
// Conserva el namespace anterior sin invocar Containers.
export class StylinguContainer{async fetch(){return Response.json({code:'LEGACY_RUNTIME_RETIRED'},{status:410});}}
