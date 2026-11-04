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
