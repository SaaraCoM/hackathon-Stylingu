import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Analysis, Snapshot, View } from './types';
import { privatePhoto } from './media';
import { createPortal } from 'react-dom';
import { ToneSimulator } from './tryon/ToneSimulator';

const views: {id: View; label: string; title: string; description: string}[] = [
 {id:'inicio',label:'Inicio',title:'Hoy empieza contigo.',description:'Un poco de inspiración para sentirte más tú, cada día.'},
 {id:'color',label:'UColors',title:'Los colores que hablan de ti.',description:'Tu guía para combinar con confianza, del armario al maquillaje.'},
 {id:'makeup',label:'Makeup',title:'Realza lo que te hace única.',description:'Rutinas sencillas y tonos que se sienten como una segunda piel.'},
 {id:'armario',label:'Outfits',title:'¿Qué versión de ti sale hoy?',description:'Redescubre tu armario con combinaciones para cada momento.'},
 {id:'compras',label:'AIShoppie',title:'Compra menos. Elige mejor.',description:'Descubre si ese flechazo encaja contigo antes de llevarlo a casa.'}
];
const button = 'su-button tw:inline-flex tw:items-center tw:justify-center tw:gap-3 tw:rounded-md tw:px-5 tw:py-3 tw:text-sm';
const card = 'tw:rounded-xl tw:bg-white tw:p-6';
function Swatches({analysis}: {analysis: Analysis | null}) {
 return <div className="tw:flex tw:gap-2 tw:my-5" aria-label="Colores de tu paleta">{analysis?.colorimetry.palette.filter(hex=>/^#[a-f0-9]{6}$/i.test(hex)).slice(0,6).map((hex,i)=><span key={hex+i} title={hex} className="tw:h-16 tw:flex-1 tw:rounded" style={{backgroundColor:hex}} />)}</div>;
}
function Home({snapshot, navigate}: {snapshot: Snapshot; navigate: (view: View)=>void}) {
 const a=snapshot.analysis;
 return <div className="tw:grid tw:gap-6">
  <div className="tw:grid tw:gap-6 tw:lg:grid-cols-3">
   <article className="su-home-feature tw:grid tw:overflow-hidden tw:rounded-xl tw:bg-[#ead8d3] tw:sm:grid-cols-2 tw:lg:col-span-2">
    <div className="tw:flex tw:flex-col tw:items-start tw:justify-between tw:p-8 tw:lg:p-10"><p className="su-eyebrow">Menos dudas. Más tú.</p><h2 className="su-display tw:my-6 tw:text-4xl tw:lg:text-5xl">Tu estilo,<br/>sin esfuerzo.</h2><p className="tw:mb-8 tw:max-w-64">Colores que te iluminan y looks que encajan con tu forma de ser.</p><button className={button+' su-primary'} onClick={()=>navigate('armario')}>Descubrir mi outfit <span aria-hidden="true">→</span></button></div>
    <figure className="tw:relative tw:m-0"><img src="./assets/svg-design/day-look.jpg" alt="Inspiración editorial: blazer claro y vaqueros en un paseo por la ciudad" className="tw:h-full tw:min-h-72 tw:w-full tw:object-cover"/><figcaption className="su-photo-label">Inspiración editorial</figcaption></figure>
   </article>
   <aside className={card}><h2 className="su-display tw:text-2xl">¿Por dónde empezamos?</h2><p className="su-muted tw:mt-2 tw:mb-6 tw:text-sm">Pequeñas decisiones, grandes sensaciones.</p>{[['color','◎','Mis colores','Encuentra tus tonos favoritos'],['makeup','✧','Mi makeup','Una rutina que realza lo natural'],['compras','♧','Date un capricho','Elige con tu paleta como guía']].map(([id,icon,title,copy])=><button key={id} className="su-shortcut tw:flex tw:w-full tw:items-center tw:gap-4 tw:py-5 tw:text-left" onClick={()=>navigate(id as View)}><span className="su-icon" aria-hidden="true">{icon}</span><span className="tw:flex-1"><strong className="tw:block tw:font-medium">{title}</strong><small className="su-muted">{copy}</small></span><span aria-hidden="true">→</span></button>)}</aside>
  </div>
  <section aria-labelledby="inspiration-heading"><h2 id="inspiration-heading" className="su-display tw:mb-4 tw:text-2xl">Tu dosis de inspiración</h2><div className="tw:grid tw:gap-6 tw:md:grid-cols-3">
   <button className={card+' tw:text-left su-inspiration'} onClick={()=>navigate('color')}><span className="su-eyebrow">UColors</span><h3 className="su-display tw:mt-4 tw:text-2xl">{a?.colorimetry.season || 'Tu universo de color'}</h3><Swatches analysis={a}/><span className="su-muted tw:text-sm">{a?.colorimetry.temperature || 'Descubre tu paleta personal'} <span aria-hidden="true">→</span></span></button>
   <button className="su-inspiration tw:grid tw:grid-cols-2 tw:overflow-hidden tw:rounded-xl tw:bg-[#e9ecdf] tw:text-left" onClick={()=>navigate('armario')}><span className="tw:p-6"><span className="su-eyebrow">Outfits</span><span className="su-display tw:my-5 tw:block tw:text-2xl">Lista para<br/>lo que venga.</span><span className="su-muted tw:text-sm">Tu look del día →</span></span><img src="./assets/svg-design/day-look.jpg" alt="" className="tw:h-full tw:w-full tw:object-cover" loading="lazy"/></button>
   <button className="su-inspiration tw:grid tw:grid-cols-2 tw:overflow-hidden tw:rounded-xl tw:bg-[#eaded9] tw:text-left" onClick={()=>navigate('makeup')}><span className="tw:p-6"><span className="su-eyebrow">Makeup</span><span className="su-display tw:my-5 tw:block tw:text-2xl">Naturalmente<br/>tú.</span><span className="su-muted tw:text-sm">Ver mi rutina →</span></span><img src="./assets/svg-design/makeup.jpg" alt="" className="tw:h-full tw:w-full tw:object-cover" loading="lazy"/></button>
  </div></section>
 </div>;
}

/* These children remain owned by the existing feature controllers. They stay
 * mounted while navigating so pending requests and form values remain valid. */
function FeaturePanel({view, active}: {view: Exclude<View,'inicio'>; active:boolean}) {
 const host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const panel=document.getElementById('tab-'+view);
  if(!panel || !host.current) return;
  const marker=document.createComment('design-panel-'+view);
  panel.before(marker);
  panel.setAttribute('role','region');
  panel.removeAttribute('aria-labelledby');
  host.current.append(panel);
  return ()=>{ marker.replaceWith(panel); };
 },[view]);
 return <div hidden={!active} ref={host} className="su-feature tw:min-w-0"/>;
}

function PersonalCard({analysis}: {analysis:Analysis|null}) {
 const src=privatePhoto(analysis?.photos?.face,window.STYLINGU_API_BASE);
 return <aside className="su-personal tw:rounded-xl tw:bg-[#373530] tw:p-4 tw:text-white"><div className="tw:overflow-hidden tw:rounded-lg tw:bg-[#514d47]">{src?<img src={src} alt="Tu foto privada de referencia" className="tw:aspect-[4/5] tw:w-full tw:object-cover"/>:<p className="tw:p-6">Tu foto aparecerá al completar el análisis.</p>}</div><p className="tw:mt-6 tw:text-xs tw:uppercase tw:tracking-widest">Tu universo de color</p><h2 className="su-display tw:my-4 tw:text-3xl">{analysis?.colorimetry.season || 'Tu paleta personal'}</h2><p className="tw:mb-5 tw:text-sm">{analysis?.source==='mock'?'Análisis de prueba · simulación':'Una guía basada en tu análisis.'}</p><button className={button+' su-on-dark tw:w-full'} onClick={()=>window.stylinguDesign.consultation()}>Actualizar mis fotos</button></aside>;
}

export function StylingApp() {
 const bridge=window.stylinguDesign;
 const [snapshot,setSnapshot]=useState(()=>bridge.snapshot());
 const [view,setView]=useState<View>('inicio');
 const title=useRef<HTMLHeadingElement>(null);
 const initial=useRef(true);
 useEffect(()=>bridge.subscribe(()=>setSnapshot(bridge.snapshot())),[bridge]);
 useEffect(()=>{
  const onNavigate=(event:Event)=>{const id=(event as CustomEvent<string>).detail.replace('tab-','');if(views.some(v=>v.id===id))setView(id as View);};
  const onAccount=()=>setView('inicio');
  window.addEventListener('stylingu:navigate',onNavigate);
  window.addEventListener('stylingu:account',onAccount);
  return ()=>{window.removeEventListener('stylingu:navigate',onNavigate);window.removeEventListener('stylingu:account',onAccount);};
 },[]);
 useEffect(()=>{if(initial.current){initial.current=false;return;}title.current?.focus({preventScroll:true});},[view]);
 useLayoutEffect(()=>{
  document.getElementById('appShell')?.classList.add('su-mounted');
  const status=document.getElementById('productStatus');
  const dest=document.getElementById('su-status');
  if(status&&dest)dest.append(status);
  return ()=>document.getElementById('appShell')?.classList.remove('su-mounted');
 },[]);
 const navigate=(next:View)=>{setView(next);bridge.navigate(next);};
 const current=views.find(v=>v.id===view)!;
 const simulator=document.getElementById('tone-simulator-root');
 function downloadPalette(){
  const palette=snapshot.analysis?.colorimetry.palette || [];
  if(!palette.length){bridge.notify('Completa tu análisis para descargar la paleta.');return;}
  const blob=new Blob([palette.join('\n')+'\n'],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='stylingu-paleta.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);bridge.notify('Paleta descargada.');
 }
 return <div className="su-app">
  {simulator&&createPortal(<ToneSimulator key={`${snapshot.accountId}:${snapshot.analysis?.photos?.face}:${snapshot.analysis?.analyzedAt}`} identity={snapshot.accountId||''} photo={snapshot.analysis?.photos?.face} lip={snapshot.analysis?.makeup?.lipHex} palette={snapshot.analysis?.colorimetry.palette}/>,simulator)}
  <a href="#su-main" className="su-skip">Saltar al contenido</a>
  <header className="su-header"><div className="su-width tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:py-5"><button className="su-brand su-display tw:text-3xl" aria-label="StylingU, inicio" onClick={()=>navigate('inicio')}>StylingU <span aria-hidden="true">♧</span></button><nav className="su-nav tw:order-3 tw:flex tw:w-full tw:gap-1 tw:overflow-x-auto tw:lg:order-none tw:lg:w-auto" aria-label="Secciones de StylingU">{views.map(item=><button key={item.id} className="tw:rounded-full tw:px-5 tw:py-3 tw:text-sm tw:whitespace-nowrap" aria-current={view===item.id?'page':undefined} onClick={()=>navigate(item.id)}>{item.label}</button>)}</nav><button className="su-account tw:text-left tw:text-sm" onClick={()=>bridge.account()}><span className="tw:block">{snapshot.name || 'Tu cuenta'}</span><small className="su-muted">Mi perfil ↗</small></button></div></header>
  <main id="su-main" className="su-width tw:py-8 tw:md:py-10"><div className="tw:mb-9 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-5"><div><p className="su-eyebrow tw:mb-3">{view==='inicio'?'Tu espacio personal':current.label}</p><h1 ref={title} tabIndex={-1} className="su-display tw:m-0 tw:text-3xl tw:md:text-4xl">{view==='inicio'&&snapshot.name?`Hola, ${snapshot.name}. `:''}{current.title}</h1><p className="su-muted tw:mt-3 tw:mb-0">{current.description}</p></div>{view==='color'&&<button className={button+' su-primary'} onClick={downloadPalette}>Descargar paleta ↓</button>}{view==='compras'&&<button className={button+' su-primary'} onClick={()=>bridge.scanner()}>Escanear o buscar producto ↗</button>}</div>
   <div id="su-status"/>
   {view==='inicio'&&<Home snapshot={snapshot} navigate={navigate}/>}
   <div className={view==='color'?'tw:grid tw:items-start tw:gap-6 tw:lg:grid-cols-[280px_minmax(0,1fr)]':''}>
    {view==='color'&&<PersonalCard analysis={snapshot.analysis}/>}
    <div className="tw:min-w-0">{(['color','makeup','armario','compras'] as const).map(id=><FeaturePanel key={id} view={id} active={view===id}/>)}</div>
   </div>
   {view==='compras'&&<aside className="tw:mt-6 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4 tw:rounded-xl tw:bg-[#ead8d3] tw:p-6"><div><h2 className="su-display tw:text-2xl">Tu mejor compra es la que va contigo.</h2><p className="su-muted">Usa tu paleta como guía y deja espacio solo para lo que de verdad te encanta.</p></div><button className={button+' tw:bg-white'} onClick={()=>navigate('color')}>Consultar mi paleta →</button></aside>}
  </main><footer className="su-width su-footer tw:mt-8 tw:flex tw:flex-wrap tw:justify-between tw:gap-4 tw:py-6 tw:text-xs"><span>STYLINGU / TU ESTILO, A TU MANERA</span><button onClick={()=>bridge.account()}>Mi cuenta y privacidad ↗</button></footer>
 </div>;
}
