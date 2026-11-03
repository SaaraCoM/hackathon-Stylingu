/* Una sola pantalla, incluso con solicitudes concurrentes o un análisis en cola. */
const requestScreen=(()=>{
 const dialog=document.getElementById('requestLoading'),label=document.getElementById('requestLoadingText');
 const pending=new Map(),controllers=new Set();let previous;
 function begin(text='Preparando tu espacio…'){
  const key=Symbol();pending.set(key,text);label.textContent=text;
  if(!dialog.open){previous=document.activeElement;dialog.hidden=false;if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}
  document.body.setAttribute('aria-busy','true');
  let released=false;return ()=>{if(released)return;released=true;pending.delete(key);if(pending.size){label.textContent=[...pending.values()].at(-1);return;}if(dialog.close)dialog.close();else dialog.removeAttribute('open');dialog.hidden=true;document.body.removeAttribute('aria-busy');if(previous?.isConnected)previous.focus();};
 }
 dialog.addEventListener('cancel',e=>e.preventDefault());
 document.getElementById('cancelRequest').addEventListener('click',()=>{for(const c of controllers)c.abort(new DOMException('Solicitud cancelada','AbortError'));});
 return {begin,controllers};
})();
let publicSecurityConfig;
async function securityConfig(){
 if(!publicSecurityConfig)publicSecurityConfig=fetch(API+'/api/public-config',{credentials:'same-origin',signal:AbortSignal.timeout(10000)}).then(async r=>{if(!r.ok)throw new Error('No se pudo preparar el acceso seguro. Reintenta.');return r.json();}).catch(e=>{publicSecurityConfig=null;throw e;});
 return publicSecurityConfig;
}
let turnstileScript;
async function botToken(path,signal){
 const config=await securityConfig();if(!config.turnstileRequired)return '';
 if(!config.sitekey)throw new Error('La verificación de acceso no está configurada.');
 if(!window.turnstile){
  if(!turnstileScript)turnstileScript=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;s.onload=resolve;s.onerror=()=>{turnstileScript=null;reject(new Error('No se pudo cargar la verificación. Comprueba tu conexión.'));};document.head.append(s);});
  await turnstileScript;
 }
 return new Promise((resolve,reject)=>{
  const box=document.getElementById('requestChallenge');box.replaceChildren();let widget,done=false;
  function finish(error,token){if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);if(widget!==undefined)window.turnstile.remove(widget);box.replaceChildren();error?reject(error):resolve(token);}
  const abort=()=>finish(new Error('Solicitud cancelada.'));const timer=setTimeout(()=>finish(new Error('La verificación ha caducado. Reintenta.')),110000);
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}
  widget=window.turnstile.render(box,{sitekey:config.sitekey,theme:'light',language:'es',action:path.split('/').pop().replaceAll('-','_'),callback:t=>finish(null,t),'error-callback':()=>finish(new Error('No se pudo verificar el acceso. Reintenta.')),'expired-callback':()=>finish(new Error('Verificación caducada. Reintenta.'))});
 });
}
