import sodium from 'libsodium-wrappers';
export async function jsonRequest(url,token,{method='GET',body,...rest}={}) {
  const response=await fetch(url,{...rest,method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
  if(method==='DELETE'&&response.status===404)return null;
  if(!response.ok)throw new Error('Provider API request failed: '+method+' '+new URL(url).pathname+' HTTP '+response.status);
  if(response.status===204)return null;
  return response.json();
}
export function cloudflareAPI(env){return async(path,options)=>{
 const result=await jsonRequest('https://api.cloudflare.com/client/v4'+path,env.CF_ROTATION_TOKEN,options);
 if(result===null&&options?.method==='DELETE')return null;
 if(!result?.success)throw new Error('Cloudflare request rejected');return result.result;
};}
export async function putStoreSecret(env,name,value){
 const api=cloudflareAPI(env),base=`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/secrets_store/stores/${env.CF_SECRET_STORE_ID}/secrets`;
 const list=await api(base+'?per_page=100');
 const found=list.find(s=>s.name===name&&s.status!=='deleted');
 if(found)await api(base+'/'+found.id,{method:'PATCH',body:{value,scopes:['workers']}});
 else await api(base,{method:'POST',body:[{name,value,scopes:['workers']}]});
}
export async function setGitHubSecret(env,name,value){
 const base=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/environments/${env.DEPLOY_ENV}`;
 const key=await jsonRequest(base+'/secrets/public-key',env.ROTATION_GITHUB_TOKEN);
 await sodium.ready;
 const encrypted=sodium.to_base64(sodium.crypto_box_seal(new TextEncoder().encode(value),sodium.from_base64(key.key,sodium.base64_variants.ORIGINAL)),sodium.base64_variants.ORIGINAL);
 await jsonRequest(base+'/secrets/'+name,env.ROTATION_GITHUB_TOKEN,{method:'PUT',body:{key_id:key.key_id,encrypted_value:encrypted}});
}
export async function operation(env,path,body){
 if(new URL(env.PUBLIC_ORIGIN).protocol!=='https:')throw new Error('HTTPS operations endpoint required');
 return jsonRequest(env.PUBLIC_ORIGIN+'/__ops/'+path,env.OPS_TOKEN,{method:body?'POST':'GET',...(body?{body}:{})});
}
