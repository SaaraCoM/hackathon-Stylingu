import sharp from 'sharp';
import { PersonalError } from '../../shared/personal-error.js';
export async function normalizePhoto({bytes}) {
 try {
  const image=sharp(bytes,{limitInputPixels:20000000,failOn:'warning',animated:false});
  const meta=await image.metadata();
  if(!meta.width||!meta.height||meta.width<16||meta.height<16||(meta.pages||1)>1)throw new Error();
  const data=await image.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
  return {bytes:data,mime:'image/jpeg'};
 } catch {throw new PersonalError('No se puede decodificar la imagen. Usa una foto válida de hasta 20 megapíxeles.',400,'INVALID_IMAGE');}
}
