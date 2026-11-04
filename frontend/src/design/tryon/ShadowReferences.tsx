import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {privatePhoto} from '../media';
import {eyeCropBox} from './geometry';
import {loadFace} from './face-cache';
import {renderEyeReference} from './reference';

type Status='idle'|'loading'|'ready'|'fallback';
type ImageKey='tone'|'bruma'|'sage';
interface Targets {tone:HTMLElement|null;bruma:HTMLElement|null;sage:HTMLElement|null;status:HTMLElement|null}
interface Props {active:boolean;photo?:string;identity:string;targets:Targets}
const LOOKS:{tone:{color:string;opacity:number};bruma:{color:string;opacity:number};sage:{color:string;opacity:number}}={
 tone:{color:'#a9b8a2',opacity:34},
 bruma:{color:'#9a7f9f',opacity:38},
 sage:{color:'#a9b8a2',opacity:38}
};
const ALTS:Record<ImageKey,string>={
 tone:'Tu mirada con sombra salvia, generada sobre tu foto y tu tono de piel.',
 bruma:'Tu mirada con sombras malva y ciruela, generada sobre tu foto y tu tono de piel.',
 sage:'Tu mirada con sombras salvia y champaña, generada sobre tu foto y tu tono de piel.'
};

function EyeFrame({src,alt,status}:{src?:string;alt:string;status:Status}) {
 return <span className="su-eye-frame" data-state={src?'ready':status}>
  {src?<img className="su-eye-generated" src={src} alt={alt}/>:null}
  <span className="su-eye-badge">{src?'Tu piel':status==='loading'?'Preparando…':'Editorial'}</span>
 </span>;
}

export function ShadowReferences({active,photo,identity,targets}:Props) {
 const src=privatePhoto(photo,window.STYLINGU_API_BASE);
 const [status,setStatus]=useState<Status>('idle');
 const [images,setImages]=useState<Partial<Record<ImageKey,string>>>({});
 const [error,setError]=useState('');
 const [attempt,setAttempt]=useState(0);
 const generatedFor=useRef('');
 const key=`${identity}:${src||''}`;

 useEffect(()=>{
  setImages({});setStatus('idle');setError('');generatedFor.current='';
 },[key]);

 useEffect(()=>{
  if(!active||!src||generatedFor.current===key)return;
  let cancelled=false;
  setStatus('loading');setError('');
  (async()=>{
   try {
    const face=await loadFace(src);
    if(cancelled)return;
    const both=eyeCropBox(face.points,4/3,'both');
    const one=eyeCropBox(face.points,4/5,'left');
    const next={
     tone:renderEyeReference(face.image,face.points,one,LOOKS.tone.color,LOOKS.tone.opacity,600),
     bruma:renderEyeReference(face.image,face.points,both,LOOKS.bruma.color,LOOKS.bruma.opacity,720),
     sage:renderEyeReference(face.image,face.points,both,LOOKS.sage.color,LOOKS.sage.opacity,720)
    };
    if(cancelled)return;
    setImages(next);setStatus('ready');generatedFor.current=key;
   } catch(cause) {
    if(cancelled)return;
    setStatus('fallback');
    setError(cause instanceof Error?cause.message:'');
   }
  })();
  return ()=>{cancelled=true;};
 },[active,src,key,attempt]);

 const message=!src
  ? 'Añade una foto de rostro para ver estas referencias sobre tu piel. Mientras tanto se muestra una referencia editorial.'
  : status==='loading'
   ? 'Preparando tu referencia sobre tu foto. El detector se ejecuta en este dispositivo.'
   : status==='ready'
    ? 'Referencias generadas sobre tu foto: mismo tono de piel y misma luz. Nada se ha enviado a un proveedor para esta vista.'
    : status==='fallback'
     ? 'No se ha podido preparar la referencia sobre tu foto. Se muestra una referencia editorial.'+(error?` ${error}`:'')
     : 'Referencia editorial. Abre Makeup con una foto para generarla sobre tu piel.';

 if(!targets.tone&&!targets.bruma&&!targets.sage&&!targets.status)return null;
 return <>
  {targets.tone&&createPortal(<EyeFrame src={images.tone} alt={ALTS.tone} status={status}/>,targets.tone)}
  {targets.bruma&&createPortal(<EyeFrame src={images.bruma} alt={ALTS.bruma} status={status}/>,targets.bruma)}
  {targets.sage&&createPortal(<EyeFrame src={images.sage} alt={ALTS.sage} status={status}/>,targets.sage)}
  {targets.status&&createPortal(<>
   <span className="su-eye-status-text">{message}</span>
   {status==='fallback'&&<button type="button" className="su-eye-retry" onClick={()=>setAttempt(value=>value+1)}>Reintentar</button>}
   {!src&&<button type="button" className="su-eye-retry" onClick={()=>window.stylinguDesign.consultation()}>Completar mi análisis</button>}
  </>,targets.status)}
 </>;
}
