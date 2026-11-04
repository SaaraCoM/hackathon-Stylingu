import {detectFace} from './detector';
import type {Point} from './geometry';

export interface PreparedFace {image:HTMLImageElement;points:Point[]}

/* The photo is private and fetched with the session cookie. Caching the
 * decoded image and its landmarks lets the try-on and the shadow references
 * share one detector pass instead of running the model twice. */
const cache=new Map<string,Promise<PreparedFace>>();

export function loadFace(src:string):Promise<PreparedFace> {
 const cached=cache.get(src);
 if(cached)return cached;
 const pending=(async()=>{
  const signal=AbortSignal.timeout(60000);
  const response=await fetch(src,{credentials:'include',signal});
  if(!response.ok)throw new Error('No se pudo recuperar tu foto. Comprueba la sesión y reintenta.');
  const blob=await response.blob();
  if(!blob.type.startsWith('image/'))throw new Error('La foto recibida no es válida.');
  const objectUrl=URL.createObjectURL(blob);
  try {
   const image=new Image();
   image.src=objectUrl;
   try {await image.decode();}
   catch {throw new Error('La foto no se pudo decodificar. Prueba con otra imagen.');}
   signal.throwIfAborted();
   const points=await detectFace(image,signal);
   return {image,points};
  } finally {URL.revokeObjectURL(objectUrl);}
 })();
 cache.set(src,pending);
 pending.catch(()=>{if(cache.get(src)===pending)cache.delete(src);});
 if(cache.size>2){const oldest=cache.keys().next().value;if(oldest&&oldest!==src)cache.delete(oldest);}
 return pending;
}
