import { PersonalError } from './personal-error.js';
import { PROTOCOL_ID } from './ai-protocol.js';
const str = (maxLength = 500) => ({ type: 'string', minLength: 1, maxLength });
const choice = values => ({ type: 'string', enum: values });
const arr = (items, minItems = 0, maxItems = 10) => ({ type: 'array', items, minItems, maxItems });
const obj = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const hex = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' };
export const OUTFIT_SCHEMA = obj(Object.fromEntries(['top','topDesc','bottom','bottomDesc','jacket','jacketDesc','acc','accDesc'].map(k=>[k,str(300)])));
// Legacy values remain readable; the real model never receives clinical/erroneous labels.
export const AI_SCHEMA = obj({
  photosUsable: { type: 'boolean' }, photoIssue: { type: 'string', maxLength: 300 },
  colorimetry: obj({ season: str(80), temperature: choice(['cálido','frío','neutro','no determinado']), contrast: str(80), chroma: str(80), palette: arr(hex,4,8), primaryHex: hex, avoid: arr(obj({name:str(80),hex,why:str(300),alt:str(300)}),1,5) }),
  makeup: obj({ faceShape: choice(['redonda','oval','corazón','cuadrada','diamante','alargada','no determinado']), eyeShape: choice(['almendrada','redonda','encapotada','monopárpado','hundida','caída','no determinado']), eyelinerType: str(120), shadowPlacement: str(300), blushPlacement: str(300), look: str(100), lipHex: hex, blushHex: hex, applicationSteps: arr(str(400),3,8) }),
  outfit: obj({ style: str(100), silhouette: str(300), accent: str(100) }),
  observed: obj({hairColor:str(100),eyeColor:str(100),eyelid:str(100),depth:str(100),uncertain:arr(str(150),0,10)}),
  outfits: arr(OUTFIT_SCHEMA,3,7),
  notes: arr(str(400),1,5),
  agenticInstructions: obj({ makeupPrompt: str(1500), outfitPrompt: str(1500) })
});
export const COSMETIC_DISCLAIMER = 'Orientación cosmética, no diagnóstico médico. La iluminación puede alterar la lectura del color. Consulta a un dermatólogo para problemas de piel y revisa la composición de cada producto.';

export function validateShape(value, schema, path = 'analysis') {
  const fail = () => { throw new PersonalError('La IA devolvió un resultado incompleto o no válido (' + path + '). Reintenta.',502); };
  if(schema.type==='object') {
    if(!value || typeof value!=='object' || Array.isArray(value)) fail();
    if(Object.keys(value).some(k=>!Object.hasOwn(schema.properties,k))) fail();
    for(const key of schema.required) validateShape(value[key],schema.properties[key],path+'.'+key);
  } else if(schema.type==='array') {
    if(!Array.isArray(value) || value.length<schema.minItems || value.length>schema.maxItems) fail();
    value.forEach((v,i)=>validateShape(v,schema.items,path+'.'+i));
  } else if(schema.type==='string') {
    if(typeof value!=='string' || (schema.minLength && !value.trim()) || value.length>(schema.maxLength||2000) || /[<>\u0000]/.test(value)) fail();
    if(schema.enum && !schema.enum.includes(value)) fail();
    if(schema.pattern && !new RegExp(schema.pattern).test(value)) fail();
  } else if(schema.type==='boolean' && typeof value!=='boolean') fail();
  return value;
}
export function cleanUserMeta(value = {}) {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new PersonalError('Cuestionario no válido.');
  const text = (v,max) => { if(typeof v!=='string' || v.length>max || /[<>\u0000]/.test(v)) throw new PersonalError('Revisa los campos del cuestionario.'); return v.trim(); };
  const skinType=text(value.skinType??'No lo sé',60);
  if(!['No lo sé','Seca','Grasa','Mixta','Normal'].includes(skinType)) throw new PersonalError('Tipo de piel no válido.');
  const allergies=value.allergies??[];
  if(!Array.isArray(allergies)||allergies.length>15) throw new PersonalError('Indica hasta 15 alergias o sensibilidades.');
  return {skinType,allergies:[...new Set(allergies.map(v=>text(v,100)).filter(Boolean))],stylePreferences:text(value.stylePreferences??'',500)};
}
export function finalizeAnalysis(raw, {photos,userMeta,model,analyzedAt=new Date().toISOString()}) {
  validateShape(raw,AI_SCHEMA);
  if(!raw.photosUsable) throw new PersonalError(raw.photoIssue||'Repite las fotos con la cara y el cuerpo visibles.',422);
  if(!raw.colorimetry.palette.includes(raw.colorimetry.primaryHex) || new Set(raw.colorimetry.palette.map(h=>h.toLowerCase())).size!==raw.colorimetry.palette.length) throw new PersonalError('La IA devolvió una paleta incoherente. Reintenta.',502);
  const {photosUsable,photoIssue,...analysis}=raw;
  const restricted=userMeta.allergies.length>0;
  return {...analysis,source:'meta',model,protocol:PROTOCOL_ID,photos,userMeta,analyzedAt,disclaimer:COSMETIC_DISCLAIMER,notes:restricted?[...analysis.notes,'Has indicado alergias o sensibilidades. No se ha verificado la composición de productos ni se garantiza su adecuación; revisa el envase y consulta a un profesional.']:analysis.notes,colorimetry:{...analysis.colorimetry,harmony:0}};
}
