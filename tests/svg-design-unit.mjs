import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from '../frontend/node_modules/esbuild/lib/main.js';

const source=await readFile(new URL('../frontend/src/design/media.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {privatePhoto}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('personal photo only accepts the existing authenticated route',()=>{
 const route='/api/personal/photos/'+'a'.repeat(64);
 assert.equal(privatePhoto(route),route);
 assert.equal(privatePhoto(route,'https://api.example.test'),'https://api.example.test'+route);
 for(const value of [undefined,'','javascript:alert(1)','https://tracker.test/photo.jpg','//tracker.test/photo.jpg',route+'?redirect=x','/api/personal/photos/../account','/api/personal/photos/short'])assert.equal(privatePhoto(value),undefined);
});

const geometry=await readFile(new URL('../frontend/src/design/tryon/geometry.ts',import.meta.url),'utf8');
const {code:geometryCode}=await transform(geometry,{loader:'ts',format:'esm'});
const {validateFace,eyePolygons,clamp}=await import('data:text/javascript;base64,'+Buffer.from(geometryCode).toString('base64'));
test('rejects incomplete, clipped and too-small faces instead of using fixed masks',()=>{
 assert.throws(()=>validateFace([],800,800),/rostro/);
 const points=Array.from({length:478},()=>({x:.5,y:.5}));
 assert.throws(()=>validateFace(points,800,800),/pequeño/);
 points[234]={x:.2,y:.5};points[454]={x:.8,y:.5};points[10]={x:.5,y:.1};points[152]={x:.5,y:.9};
 assert.doesNotThrow(()=>validateFace(points,800,800));
 points[0]={x:NaN,y:.5};assert.throws(()=>validateFace(points,800,800),/rostro/);
 points[0]={x:1.2,y:.5};assert.throws(()=>validateFace(points,800,800),/rostro/);
});
test('eyeshadow polygons follow rotated/scaled facial geometry',()=>{
 const points=Array.from({length:478},(_,i)=>({x:.2+(i%15)*.02,y:.3+(i%12)*.02}));
 const original=eyePolygons(points);
 const rotated=eyePolygons(points.map(p=>({x:1-p.y,y:p.x})));
 for(let side=0;side<2;side++)for(let i=0;i<original[side].length;i++){
  assert.ok(Math.abs(rotated[side][i].x-(1-original[side][i].y))<1e-10);
  assert.ok(Math.abs(rotated[side][i].y-original[side][i].x)<1e-10);
 }
 assert.equal(clamp(NaN),0);assert.equal(clamp(-3),0);assert.equal(clamp(9),1);
});

const fileVersionSource=await readFile(new URL('../frontend/src/design/file-version.ts',import.meta.url),'utf8');
const {code:fileVersionCode}=await transform(fileVersionSource,{loader:'ts',format:'esm'});
const {REQUIRED_FILE_VERSION,FileSpecificationPolicy}=await import('data:text/javascript;base64,'+Buffer.from(fileVersionCode).toString('base64'));
test('file specification policy enforces REQUIRED_FILE_VERSION v2.0 on images and dossiers',()=>{
 assert.equal(REQUIRED_FILE_VERSION,'v2.0');
 const policy=new FileSpecificationPolicy();
 assert.equal(policy.getMetadata().shortBadge,'Archivo v2.0');
 assert.equal(policy.validateImageFile({type:'image/jpeg',size:1024}).valid,true);
 assert.equal(policy.validateImageFile({type:'image/gif',size:1024}).valid,false);
 assert.equal(policy.validateImageFile({type:'image/png',size:9*1024*1024}).valid,false);
 assert.equal(policy.validateDossierPayload({fileVersion:'v2.0',schemaVersion:2,colorimetry:{season:'Otoño'}}).valid,true);
 assert.equal(policy.validateDossierPayload({fileVersion:'v1.0',schemaVersion:2,colorimetry:{season:'Otoño'}}).valid,false);
});

const atlasSource=await readFile(new URL('../frontend/src/design/colorimetry-atlas.ts',import.meta.url),'utf8');
const {code:atlasCode}=await transform(atlasSource,{loader:'ts',format:'esm'});
const {ColorimetryAtlasCatalog}=await import('data:text/javascript;base64,'+Buffer.from(atlasCode).toString('base64'));
test('colorimetry atlas catalog provides all 12 seasons and all 6 subranges without truncation',()=>{
 const catalog=new ColorimetryAtlasCatalog();
 const allSeasons=catalog.getAllSeasons();
 assert.equal(allSeasons.length,12);
 for(const family of ['primavera','verano','otono','invierno']){
  assert.equal(catalog.getSeasonsByFamily(family).length,3);
 }
 for(const season of allSeasons){
  assert.ok(season.ranges.base.length>=3);
  assert.ok(season.ranges.medios.length>=3);
  assert.ok(season.ranges.acentos.length>=3);
  assert.ok(season.ranges.profundos.length>=3);
  assert.ok(season.ranges.iluminadores.length>=3);
  assert.ok(season.ranges.evitar.length>=3);
 }
 const breakdown=catalog.buildPersonalBreakdown({colorimetry:{season:'Primavera Cálida',palette:['#123456','#ABCDEF','#E7CE75'],avoid:[{name:'Test',hex:'#010101',why:'Why',alt:'Alt'}]}});
 assert.ok(breakdown.allHarmoniousSwatches.some(s=>s.hex==='#123456'));
 assert.ok(breakdown.allHarmoniousSwatches.some(s=>s.hex==='#ABCDEF'));
 assert.ok(breakdown.ranges.evitar.some(a=>a.hex==='#010101'));
});
