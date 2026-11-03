import {PhotonImage,SamplingFilter,resize,rotate,fliph,flipv} from '@cf-wasm/photon/node';
import {PersonalError} from '../shared/personal-error.js';
import {imageBounds} from './image-bounds.js';
export async function normalizePhoto({bytes}){
  let image;
  try{
    const meta=imageBounds(bytes);image=PhotonImage.new_from_byteslice(new Uint8Array(bytes));
    if(image.get_width()!==meta.width||image.get_height()!==meta.height)throw new Error('INVALID_IMAGE');
    const replace=next=>{image.free();image=next;};
    if(meta.orientation===2)fliph(image);
    if(meta.orientation===3)replace(rotate(image,180));
    if(meta.orientation===4)flipv(image);
    if(meta.orientation===5){replace(rotate(image,90));fliph(image);}
    if(meta.orientation===6)replace(rotate(image,90));
    if(meta.orientation===7){replace(rotate(image,90));flipv(image);}
    if(meta.orientation===8)replace(rotate(image,270));
    const ratio=Math.min(1,1600/image.get_width(),1600/image.get_height());
    if(ratio<1)replace(resize(image,Math.max(1,Math.round(image.get_width()*ratio)),Math.max(1,Math.round(image.get_height()*ratio)),SamplingFilter.Triangle));
    return {bytes:Buffer.from(image.get_bytes_jpeg(85)),mime:'image/jpeg'};
  }catch{throw new PersonalError('No se puede decodificar la imagen. Usa una foto válida de hasta 4 megapíxeles; el formulario reduce tus fotos automáticamente.',400,'INVALID_IMAGE');}
  finally{image?.free();}
}
