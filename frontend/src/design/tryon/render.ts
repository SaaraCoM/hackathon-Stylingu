import {clamp,eyePolygons,INNER_LIPS,OUTER_LIPS,type Point} from './geometry';
export interface Settings { lip:string; shadow:string; opacity:number; shadowOpacity:number; gloss:number; original:boolean }
function polygon(ctx:CanvasRenderingContext2D,points:Point[],width:number,height:number) {
 points.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x*width,p.y*height);else ctx.lineTo(p.x*width,p.y*height);});ctx.closePath();
}
export function renderMakeup(canvas:HTMLCanvasElement,image:CanvasImageSource,width:number,height:number,points:Point[],settings:Settings) {
 if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Tu navegador no permite preparar la vista de maquillaje.');
 ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
 if(settings.original)return;
 const layer=document.createElement('canvas');layer.width=width;layer.height=height;
 const mask=layer.getContext('2d');if(!mask)throw new Error('No se pudo preparar la máscara de maquillaje.');
 function paint(polygons:Point[][],hex:string,opacity:number,hole?:Point[],gloss=0){
  if(!/^#[a-f0-9]{6}$/i.test(hex)||opacity<=0)return;
  mask!.clearRect(0,0,width,height);mask!.fillStyle=hex;
  mask!.beginPath();polygons.forEach(p=>polygon(mask!,p,width,height));if(hole)polygon(mask!,hole,width,height);mask!.fill('evenodd');
  ctx!.save();ctx!.globalCompositeOperation='color';ctx!.globalAlpha=clamp(opacity)*.85;ctx!.drawImage(layer,0,0);
  ctx!.globalCompositeOperation='multiply';ctx!.globalAlpha=clamp(opacity)*.18;ctx!.drawImage(layer,0,0);
  if(gloss>0){ctx!.globalCompositeOperation='screen';ctx!.globalAlpha=clamp(gloss)*clamp(opacity)*.18;ctx!.drawImage(layer,0,0);}
  ctx!.restore();
 }
 paint(eyePolygons(points),settings.shadow,settings.shadowOpacity/100);
 paint([OUTER_LIPS.map(i=>points[i])],settings.lip,settings.opacity/100,INNER_LIPS.map(i=>points[i]),settings.gloss/100);
}
