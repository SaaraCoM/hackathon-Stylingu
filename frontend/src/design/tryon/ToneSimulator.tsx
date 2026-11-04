import {useEffect,useRef,useState} from 'react';
import {privatePhoto} from '../media';
import {detectFace} from './detector';
import {renderMakeup} from './render';
import type {Point} from './geometry';
interface Props {photo?:string;lip?:string;palette?:string[];identity:string}
interface Ready {image:HTMLImageElement;points:Point[]}
const tone=(value?:string,fallback='#9b424d')=>/^#[a-f0-9]{6}$/i.test(value||'')?value!:fallback;
export function ToneSimulator({photo,lip,palette=[],identity}:Props){
 const [status,setStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 const [message,setMessage]=useState('Prepara tu foto para ajustar el color a tus labios y párpados.');
 const [ready,setReady]=useState<Ready|null>(null);
 const [lipColor,setLipColor]=useState(tone(lip));
 const [shadowColor,setShadowColor]=useState(tone(palette[0],'#826074'));
 const [opacity,setOpacity]=useState(50),[shadowOpacity,setShadowOpacity]=useState(25),[gloss,setGloss]=useState(30),[original,setOriginal]=useState(false);
 const canvas=useRef<HTMLCanvasElement>(null),request=useRef<AbortController|null>(null);
 const src=privatePhoto(photo,window.STYLINGU_API_BASE);
 useEffect(()=>()=>{request.current?.abort();if(canvas.current){canvas.current.width=0;canvas.current.height=0;}},[]);
 useEffect(()=>{request.current?.abort();setReady(null);setStatus('idle');setOriginal(false);setLipColor(tone(lip));setShadowColor(tone(palette[0],'#826074'));setMessage('Prepara tu foto para ajustar el color a tus labios y párpados.');},[src,identity]);
 useEffect(()=>{
  if(!ready||!canvas.current)return;
  try{renderMakeup(canvas.current,ready.image,ready.image.naturalWidth,ready.image.naturalHeight,ready.points,{lip:lipColor,shadow:shadowColor,opacity,shadowOpacity,gloss,original});}
  catch(error){setReady(null);setStatus('error');setMessage(error instanceof Error?error.message:'No se pudo dibujar la simulación.');}
 },[ready,lipColor,shadowColor,opacity,shadowOpacity,gloss,original]);
 async function prepare(){
  if(!src)return;request.current?.abort();const controller=new AbortController();request.current=controller;
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(60000)]);
  setReady(null);setStatus('loading');setMessage('Preparando tu foto y detectando el contorno del rostro…');
  let objectUrl:string|undefined;
  try{
   const response=await fetch(src,{credentials:'include',signal});
   if(!response.ok)throw new Error('No se pudo recuperar tu foto. Comprueba la sesión y reintenta.');
   const blob=await response.blob();if(!blob.type.startsWith('image/'))throw new Error('La foto recibida no es válida.');
   objectUrl=URL.createObjectURL(blob);const image=new Image();image.src=objectUrl;await image.decode();signal.throwIfAborted();
   const points=await detectFace(image,signal);signal.throwIfAborted();
   setReady({image,points});setStatus('ready');setMessage('Contornos detectados. Ajusta los tonos y compara con tu foto original.');
  }catch(error){if(controller.signal.aborted)return;setStatus('error');setMessage(error instanceof Error&&error.name==='TimeoutError'?'La preparación ha tardado demasiado. Revisa la conexión y reintenta.':error instanceof Error?error.message:'No se pudo preparar la simulación. Reintenta.');}
  finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
 }
 const enabled=status==='ready';
 return <section className="su-tryon tw:rounded-xl tw:bg-[#f6f2ec] tw:p-5" aria-labelledby="tryon-title">
  <div className="tw:mb-5"><p className="su-eyebrow">Probador personal</p><h2 id="tryon-title" className="su-display tw:mt-2 tw:text-3xl">Tu color, sobre tu foto.</h2><p className="su-muted">El detector se ejecuta en este dispositivo. Tu foto no se envía a un proveedor para esta simulación.</p></div>
  <div className="tw:grid tw:gap-6 tw:xl:grid-cols-2">
   <figure className="tw:relative tw:m-0 tw:overflow-hidden tw:rounded-lg tw:bg-[#e4ded6]">
    {ready?<canvas ref={canvas} aria-label={original?'Tu foto original':'Simulación de color ajustada a tus labios y párpados'} className="tw:block tw:h-auto tw:w-full"/>:src?<img src={src} alt="Tu foto privada para preparar el probador" className="tw:block tw:h-auto tw:w-full"/>:<p className="tw:p-8">Completa tu análisis con una foto de rostro para usar el probador.</p>}
    {ready&&<figcaption className="su-photo-label">{original?'Foto original':'Simulación orientativa'}</figcaption>}
   </figure>
   <div className="tw:min-w-0">
    <button className="su-button su-primary tw:rounded-md tw:px-5 tw:py-3" type="button" onClick={prepare} disabled={!src||status==='loading'}>{status==='loading'?'Detectando contornos…':status==='error'?'Reintentar detección':enabled?'Volver a detectar':'Preparar mi foto'}</button>
    <p id="tryon-status" role="status" aria-live="polite" className="tw:my-4 tw:text-sm">{message}</p>
    <fieldset disabled={!enabled} className="tw:m-0 tw:grid tw:gap-5 tw:border-0 tw:p-0"><legend className="tw:sr-only">Ajustes de la simulación</legend>
     <label className="tw:flex tw:items-center tw:justify-between tw:gap-3">Tono de labios<input aria-label="Tono de labios" type="color" value={lipColor} onChange={e=>setLipColor(e.target.value)} className="tw:h-11 tw:w-16"/></label>
     <div className="tw:flex tw:flex-wrap tw:gap-2" aria-label="Tonos de tu análisis">{palette.filter(h=>/^#[a-f0-9]{6}$/i.test(h)).slice(0,10).map((hex,i)=><button key={hex+i} type="button" className="su-tone tw:h-11 tw:w-11 tw:rounded-full" style={{backgroundColor:hex}} aria-label={'Probar '+hex+' en labios'} aria-pressed={hex.toLowerCase()===lipColor.toLowerCase()} onClick={()=>setLipColor(hex)}/>)}</div>
     <label>Intensidad del labial: {opacity}%<input id="sliderOpacidad" type="range" min="0" max="100" value={opacity} onChange={e=>setOpacity(Number(e.target.value))} className="tw:block tw:w-full"/></label>
     <label>Tono de sombras<input aria-label="Tono de sombras" type="color" value={shadowColor} onChange={e=>setShadowColor(e.target.value)} className="tw:ml-4 tw:h-11 tw:w-16"/></label>
     <label>Intensidad de sombras: {shadowOpacity}%<input id="sliderSombra" type="range" min="0" max="100" value={shadowOpacity} onChange={e=>setShadowOpacity(Number(e.target.value))} className="tw:block tw:w-full"/></label>
     <label>Brillo del labial: {gloss}%<input id="sliderBrillo" type="range" min="0" max="100" value={gloss} onChange={e=>setGloss(Number(e.target.value))} className="tw:block tw:w-full"/></label>
     <button type="button" className="su-button tw:rounded-md tw:border tw:border-solid tw:border-[#69625c] tw:bg-white tw:p-3" aria-pressed={original} onClick={()=>setOriginal(!original)}>{original?'Volver a la simulación':'Ver original'}</button>
    </fieldset>
    <p className="su-muted tw:mt-5 tw:text-xs">Resultado orientativo: la iluminación, la resolución y el acabado real del producto pueden variar. Si el contorno no encaja, actualiza tu foto con una imagen frontal.</p>
    <button className="su-button tw:mt-2 tw:rounded-md tw:bg-white tw:px-4" type="button" onClick={()=>window.stylinguDesign.consultation()}>Actualizar mi foto</button>
   </div>
  </div>
 </section>;
}
