import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {normalizePhoto} from '../edge/images.js';
import {imageBounds} from '../edge/image-bounds.js';
import {createWorker} from '../worker/free.js';
import {testDatabase,stopCluster} from './pg.mjs';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const sharp=require('sharp');

test('imágenes Edge: formatos, orientación y metadatos',async()=>{
  for(const format of ['png','jpeg','webp']){
    const bytes=await sharp({create:{width:48,height:32,channels:3,background:'#aabbcc'}})[format]().toBuffer();
    assert.deepEqual(imageBounds(bytes),{width:48,height:32,orientation:1});
    const out=await normalizePhoto({bytes});assert.equal(out.mime,'image/jpeg');
    const meta=await sharp(out.bytes).metadata();assert.equal(meta.width,48);assert.equal(meta.height,32);assert.equal(meta.exif,undefined);
  }
  const rotated=await sharp({create:{width:32,height:48,channels:3,background:'#aabbcc'}}).jpeg().withMetadata({orientation:6}).toBuffer();
  assert.equal(imageBounds(rotated).orientation,6);
  const out=await normalizePhoto({bytes:rotated});const meta=await sharp(out.bytes).metadata();
  assert.equal(meta.width,48);assert.equal(meta.height,32);assert.equal(meta.exif,undefined);
});
test('imágenes Edge: rechaza dimensiones excesivas y animación antes de descomprimir',async()=>{
  const png=await sharp({create:{width:32,height:32,channels:3,background:'#aabbcc'}}).png().toBuffer();
  const large=Buffer.from(png);large.writeUInt32BE(10000,16);large.writeUInt32BE(10000,20);
  await assert.rejects(()=>normalizePhoto({bytes:large}),e=>e.code==='INVALID_IMAGE');
  const chunk=Buffer.alloc(20);chunk.writeUInt32BE(8);chunk.write('acTL',4);
  await assert.rejects(()=>normalizePhoto({bytes:Buffer.concat([png.subarray(0,33),chunk,png.subarray(33)])}),e=>e.code==='INVALID_IMAGE');
  await assert.rejects(()=>normalizePhoto({bytes:Buffer.from('<svg></svg>')}),e=>e.code==='INVALID_IMAGE');
});
test('Worker: recursos públicos, proxy de cookies y cabeceras reconstruidas',async()=>{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const signingKey=JSON.stringify(await crypto.subtle.exportKey('jwk',pair.privateKey));
  const seen=[];const worker=createWorker({'/index.html':{type:'text/html',base64:Buffer.from('<h1>StylingU</h1>').toString('base64')}},async req=>{
    seen.push(req);assert.equal(await req.text(),'{}');return Response.json({ok:true},{headers:{'Set-Cookie':'stylingu_sid=test; HttpOnly; Secure; Path=/'}});
  });
  const root=await worker.fetch(new Request('https://stylingu-free-preview.castellanomateossara.workers.dev/'),{});assert.match(await root.text(),/StylingU/);
  const response=await worker.fetch(new Request('https://stylingu-free-preview.castellanomateossara.workers.dev/api/garments?x=1',{method:'POST',body:'{}',headers:{Cookie:'stylingu_sid=existing','X-Stylingu-Origin':'https://attacker.test','X-Forwarded-For':'fake','CF-Connecting-IP':'192.0.2.4','Content-Type':'application/json',Origin:'https://stylingu-free-preview.castellanomateossara.workers.dev'}}),{EDGE_SIGNING_KEY:signingKey,API_GUARD:{limit:async()=>({success:true})},AUTH_GUARD:{limit:async()=>({success:true})},BACKEND_URL:'https://zbfxwbuuuzjzmsrraxkf.supabase.co/functions/v1/stylingu-preview-api'});
  assert.equal(seen[0].url,'https://zbfxwbuuuzjzmsrraxkf.supabase.co/functions/v1/stylingu-preview-api/api/garments?x=1');
  assert.equal(seen[0].headers.get('X-Stylingu-Origin'),'https://stylingu-free-preview.castellanomateossara.workers.dev');assert.equal(seen[0].headers.get('X-Forwarded-For'),null);
  assert.equal(seen[0].headers.get('Cookie'),'stylingu_sid=existing');assert.match(response.headers.get('Set-Cookie'),/HttpOnly/);assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.equal((await worker.fetch(new Request('https://example.test/.env'),{})).status,404);
});
test('límites Edge: dos instancias comparten un contador SQL atómico', {timeout:180000},async()=>{
  await testDatabase('edge_limits');
  const {DatabaseStore}=await import('../edge/rate-limit.js');
  const {query}=await import('../backend/src/db/pool.js');
  try{
    const a=new DatabaseStore('test'),b=new DatabaseStore('test');a.init({windowMs:3600000});b.init({windowMs:3600000});
    const counts=await Promise.all(Array.from({length:12},(_,i)=>(i%2?a:b).increment('one-key')));
    assert.deepEqual(counts.map(x=>x.totalHits).sort((x,y)=>x-y),Array.from({length:12},(_,i)=>i+1));
    await a.decrement('one-key');assert.equal((await query('select hits from private_runtime.request_limits')).rows[0].hits,11);
    await b.resetKey('one-key');assert.equal((await query('select count(*)::int as n from private_runtime.request_limits')).rows[0].n,0);
    assert.equal((await query("select rowsecurity from pg_tables where schemaname='private_runtime' and tablename='request_limits'")).rows[0].rowsecurity,true);
  }finally{await stopCluster();}
});
