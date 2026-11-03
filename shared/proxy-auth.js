const enc=new TextEncoder();
const algo={name:'ECDSA',hash:'SHA-256'};
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
async function message({method,path,origin,ip,time,cookie='',contentType='',body=new Uint8Array()}){
 const digest=hex(await crypto.subtle.digest('SHA-256',body));
 return enc.encode(JSON.stringify([method,path,origin,ip,time,cookie,contentType,digest]));
}
export async function signProxy(input,privateJwk){
 const key=await crypto.subtle.importKey('jwk',privateJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 return hex(await crypto.subtle.sign(algo,key,await message(input)));
}
export async function verifyProxy(input,signature,publicJwk,now=Date.now()){
 if(!/^\d{13}$/.test(input.time)||now-Number(input.time)>30000||Number(input.time)-now>5000||!/^([a-f0-9]{2}){64}$/.test(signature||''))return false;
 try{
  const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  return await crypto.subtle.verify(algo,key,Uint8Array.from(signature.match(/../g),x=>parseInt(x,16)),await message(input));
 }catch{return false;}
}
