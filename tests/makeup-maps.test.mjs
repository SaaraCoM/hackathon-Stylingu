import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const sharp=require('sharp');
const shapes=['ovalado','corazon','diamante','cuadrada'];
test('20 PNG alineados de 900×1100; máscaras no vacías y transparentes',async()=>{
 for(const shape of shapes){
  for(const layer of ['base','bronzer','contour','blush','highlighter']){
   const image=sharp(fileURLToPath(new URL('../frontend/public/assets/makeup-maps/'+shape+'/'+layer+'.png',import.meta.url)));
   const metadata=await image.metadata();assert.equal(metadata.width,900);assert.equal(metadata.height,1100);assert.equal(metadata.hasAlpha,true);
   const pixels=await image.raw().toBuffer();let min=255,max=0;
   for(let i=3;i<pixels.length;i+=4){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);}
   assert.ok(max>0,shape+'/'+layer+' no debe estar vacío');
   if(layer!=='base'){assert.equal(min,0);assert.ok(max<255,'una máscara no debe ocultar completamente las capas inferiores');}
  }
  const psd=await fs.readFile(new URL('../design/makeup-maps/'+shape+'.psd',import.meta.url));
  assert.equal(psd.toString('ascii',0,4),'8BPS');assert.equal(psd.readUInt32BE(14),1100);assert.equal(psd.readUInt32BE(18),900);
 }
});
test('PWA descarga mapas bajo demanda, los guarda y excluye fotos privadas',async()=>{
 const listeners={},entries=new Map();let downloaded=0;const precached=[];
 const key=request=>typeof request==='string'?request:new URL(request.url).pathname;
 const cache={addAll:async assets=>precached.push(...assets),put:async(request,response)=>entries.set(key(request),response)};
 const context={self:{location:{origin:'https://test.local'},addEventListener:(name,fn)=>{listeners[name]=fn;}},URL,
  caches:{open:async()=>cache,match:async request=>entries.get(key(request)),keys:async()=>[],delete:async()=>true},
  fetch:async()=>{downloaded++;return {ok:true,clone(){return this;}};}};
 vm.runInNewContext(await fs.readFile(new URL('../frontend/public/sw.js',import.meta.url),'utf8'),context);
 let installation;listeners.install({waitUntil:p=>{installation=p;}});await installation;
 assert.ok(precached.length>0);assert.equal(precached.some(p=>p.startsWith('/assets/makeup-maps/')),false);
 const request={method:'GET',url:'https://test.local/assets/makeup-maps/ovalado/blush.png'};
 let response;listeners.fetch({request,respondWith:p=>{response=p;}});await response;
 assert.equal(downloaded,1);listeners.fetch({request,respondWith:p=>{response=p;}});await response;assert.equal(downloaded,1,'el PNG visitado se reutiliza sin red');
 let intercepted=false;listeners.fetch({request:{method:'GET',url:'https://test.local/api/personal/photos/'+ 'a'.repeat(64)},respondWith:()=>{intercepted=true;}});
 assert.equal(intercepted,false);assert.equal([...entries.keys()].some(p=>p.startsWith('/api/')),false);
});
