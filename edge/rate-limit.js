import rateLimit from '../backend/node_modules/express-rate-limit/dist/index.mjs';
import {createHash} from 'node:crypto';
import {query} from '../backend/src/db/pool.js';
export class DatabaseStore{
  constructor(prefix){this.prefix=prefix;this.windowMs=60000;}
  init(options){this.windowMs=options.windowMs;}
  async increment(key){
    const now=Date.now(),end=Math.floor(now/this.windowMs)*this.windowMs+this.windowMs;
    const digest=createHash('sha256').update(this.prefix+':'+key+':'+end).digest('hex');
    const {rows:[row]}=await query(`insert into private_runtime.request_limits(key,hits,expires_at) values ($1,1,$2) on conflict(key) do update set hits=request_limits.hits+1 returning hits`,[digest,new Date(end)]);
    if(!this.nextCleanup||now>this.nextCleanup){this.nextCleanup=now+60000;await query('delete from private_runtime.request_limits where key in (select key from private_runtime.request_limits where expires_at<now() limit 100)');}
    return {totalHits:row.hits,resetTime:new Date(end)};
  }
  key(key){const end=Math.floor(Date.now()/this.windowMs)*this.windowMs+this.windowMs;return createHash('sha256').update(this.prefix+':'+key+':'+end).digest('hex');}
  async decrement(key){await query('update private_runtime.request_limits set hits=greatest(1,hits-1) where key=$1',[this.key(key)]);}
  async resetKey(key){await query('delete from private_runtime.request_limits where key=$1',[this.key(key)]);}
}
// La IP solo se usa tras verificar la firma del Worker; nunca viene del navegador.
const common={windowMs:60000,standardHeaders:true,legacyHeaders:false};
const perIpLimiter=rateLimit({...common,max:120,keyGenerator:req=>req.verifiedClientIp||'unverified',store:new DatabaseStore('api'),message:{code:'RATE_LIMITED',error:'Demasiadas solicitudes. Espera un minuto.'}});
export const authLimiter=rateLimit({...common,max:10,keyGenerator:req=>req.verifiedClientIp||'unverified',store:new DatabaseStore('auth'),message:{code:'RATE_LIMITED',error:'Demasiados intentos. Espera un minuto.'}});
export const aiLimiter=rateLimit({...common,max:5,keyGenerator:req=>req.sessionUser||'anonymous',store:new DatabaseStore('ai'),message:{code:'RATE_LIMITED',error:'Demasiadas solicitudes IA. Reintenta en un minuto.'}});

const globalLimiter=rateLimit({...common,max:1200,keyGenerator:()=> 'all',store:new DatabaseStore('api-global'),message:{code:'RATE_LIMITED',error:'Servicio ocupado. Reintenta en un minuto.'}});
export const apiLimiter=[globalLimiter,perIpLimiter];
