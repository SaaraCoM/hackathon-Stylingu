import type {CropBox, Point} from './geometry';
import {renderMakeup} from './render';

/**
 * Renders a close-up of the user's own eye area with a shadow applied.
 * It reuses the same canvas renderer as the try-on, so the skin, light and
 * features in the reference are literally the user's, not a stock tone.
 */
export function renderEyeReference(image:HTMLImageElement,points:Point[],box:CropBox,color:string,opacity:number,width=720):string {
 const naturalWidth=image.naturalWidth||image.width;
 const naturalHeight=image.naturalHeight||image.height;
 if(!naturalWidth||!naturalHeight)throw new Error('La foto no tiene unas dimensiones válidas.');
 const scale=Math.min(1,1600/Math.max(naturalWidth,naturalHeight));
 const workWidth=Math.max(1,Math.round(naturalWidth*scale));
 const workHeight=Math.max(1,Math.round(naturalHeight*scale));
 const full=document.createElement('canvas');
 full.width=workWidth;full.height=workHeight;
 renderMakeup(full,image,workWidth,workHeight,points,{lip:'#000000',shadow:color,opacity:0,shadowOpacity:opacity,gloss:0,original:false});
 const sx=box.x*workWidth,sy=box.y*workHeight,sw=box.width*workWidth,sh=box.height*workHeight;
 const outWidth=Math.max(1,Math.round(width));
 const outHeight=Math.max(1,Math.round(outWidth*(sh/sw)));
 const crop=document.createElement('canvas');
 crop.width=outWidth;crop.height=outHeight;
 const context=crop.getContext('2d');
 if(!context)throw new Error('No se pudo preparar la referencia de sombras.');
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
 context.drawImage(full,sx,sy,sw,sh,0,0,outWidth,outHeight);
 return crop.toDataURL('image/jpeg',.9);
}
