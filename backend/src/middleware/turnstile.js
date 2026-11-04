const actions=new Set(['login','registro','forgot-password','reset-password']);
export async function verifyTurnstile(req,env,fetcher=fetch){
 const action=req.path.replace(/\/+$/,'').split('/').pop();
 if(req.method!=='POST'||!actions.has(action))return;
 const fail=(message,status=403)=>Object.assign(new Error(message),{status});
 if(!env.TURNSTILE_SECRET||!env.PUBLIC_ORIGIN)throw fail('Verificación no configurada.',503);
 const token=req.get('X-Turnstile-Token');
 if(!token||token.length>2048)throw fail('Completa la verificación de seguridad.');
 let response,verdict;
 try{
  response=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET,response:token}),signal:AbortSignal.timeout(10000)});
  verdict=await response.json();
 }catch{throw fail('No se pudo verificar el acceso. Reintenta.',503);}
 if(!response.ok||!verdict.success||verdict.hostname!==new URL(env.PUBLIC_ORIGIN).hostname||verdict.action!==action.replaceAll('-','_'))throw fail('Verificación caducada o no válida.');
}
