let currentHex='',paletteFilter='todas';
const PALETTE_NUMBERS={4:'cuatro',5:'cinco',6:'seis',7:'siete',8:'ocho'};
function toneName(hex){
 const refs=window.STYLINGU_DATA?.palette||[];
 const channels=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
 if(!/^#[a-f0-9]{6}$/i.test(hex)||!refs.length)return hex;
 const target=channels(hex);let best=hex,dist=Infinity;
 for(const ref of refs){
  if(!/^#[a-f0-9]{6}$/i.test(ref.hex))continue;
  const c=channels(ref.hex),d=(c[0]-target[0])**2+(c[1]-target[1])**2+(c[2]-target[2])**2;
  if(d<dist){dist=d;best=ref.name;}
 }
 return best;
}
function paletteItems(){
 return D.palette.map(c=>({...c,name:c.name&&c.name!==c.hex?c.name:toneName(c.hex)}));
}
function renderPalette(){
 const box=document.getElementById('swatches');box.replaceChildren();
 const title=document.getElementById('paletteTitle');
 if(title)title.textContent=D.palette.length?'Tu paleta, en '+(PALETTE_NUMBERS[D.palette.length]||D.palette.length)+' tonos.':'Tu paleta.';
 const items=paletteItems(),third=Math.ceil(items.length/3);
 items.forEach((c,i)=>{const b=node('button',null,'swatch-card');b.type='button';b.dataset.paletteGroup=i<third?'base':i<2*third?'media':'acento';b.setAttribute('aria-label','Seleccionar '+c.hex);const dot=node('span',null,'chipdot');dot.style.backgroundColor=safeHex(c.hex);b.append(dot,node('strong',c.name),node('span',c.desc));b.addEventListener('click',()=>selectSwatch(c,b));box.append(b);});
 if(items.length)selectSwatch(items[0],box.firstChild,true);else{currentHex='';document.getElementById('swatchName').textContent='Sin paleta';document.getElementById('swatchDesc').textContent='';}
 document.getElementById('swatchDetailBox').hidden=!items.length;setPaletteFilter(paletteFilter);
}
function selectSwatch(c,b,silent){if(!c)return;currentHex=c.hex;document.getElementById('swatchName').textContent=c.name;document.getElementById('swatchDesc').textContent=c.desc;document.getElementById('swatchPreviewDot').style.backgroundColor=safeHex(c.hex);document.querySelectorAll('#swatches button').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));if(!silent)toast(c.hex+' seleccionado');}
async function copyHex(){if(!currentHex)return;try{await navigator.clipboard.writeText(currentHex);toast('Copiado '+currentHex);}catch{toast(currentHex+' listo para copiar');}}
function renderAvoid(){const box=document.getElementById('avoidList');box.replaceChildren();for(const a of D.avoid){const row=node('div',null,'avoid-row'),dot=node('span',null,'avoid-dot');dot.style.backgroundColor=safeHex(a.hex);const body=node('div');body.append(node('strong',a.name),node('p',a.why+' Alternativa: '+a.alt));row.append(dot,body);box.append(row);}}
function renderComparator(){const box=document.getElementById('comparatorGrid');box.replaceChildren();box.append(node('p','No se han calculado mediciones de reactividad de tu piel.'));
 const section=box.closest('section');if(section)section.hidden=true;}
function renderInspiracion(){const box=document.getElementById('inspiracionGrid');box.replaceChildren();for(const o of D.outfits){const card=node('article',null,'card');card.append(node('span','Propuesta de estilo','pill'),node('h3',o.top+' · '+o.jacket),node('p',o.bottom+' · '+o.acc));box.append(card);}if(!D.outfits.length)box.append(node('p','El análisis no incluyó propuestas externas para tu perfil. Puedes generar conjuntos con las prendas de tu armario.','fine'));}
function setPaletteFilter(key){paletteFilter=key;document.querySelectorAll('[data-pfilter]').forEach(b=>b.classList.toggle('primary',b.dataset.pfilter===key));document.querySelectorAll('[data-palette-group]').forEach(c=>{c.hidden=key!=='todas'&&c.dataset.paletteGroup!==key;});}
renderPalette();renderAvoid();renderComparator();renderInspiracion();
document.getElementById('copyHexBtn').addEventListener('click',copyHex);document.querySelectorAll('[data-pfilter]').forEach(b=>b.addEventListener('click',()=>setPaletteFilter(b.dataset.pfilter)));document.getElementById('savePaletteBtn').addEventListener('click',()=>{store.savePalette();toast('Paleta guardada en este dispositivo para tu cuenta.');});
