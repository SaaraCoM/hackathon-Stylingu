import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker} from '../worker/free.js';
test('vision resources use the static binding and keep security headers',async()=>{
 const worker=createWorker({});let calls=0;
 const env={VISION_ASSETS:{async fetch(request){calls++;assert.equal(new URL(request.url).pathname,'/vision/wasm/vision_wasm_internal.wasm');return new Response(new Uint8Array([0,97,115,109]),{headers:{'Content-Type':'application/octet-stream'}});}}};
 const response=await worker.fetch(new Request('https://example.test/vision/wasm/vision_wasm_internal.wasm'),env);
 assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'application/wasm');
 assert.match(response.headers.get('Content-Security-Policy'),/'wasm-unsafe-eval'/);
 assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/'unsafe-eval'/);
 const post=await worker.fetch(new Request('https://example.test/vision/wasm/vision_wasm_internal.wasm',{method:'POST'}),env);
 assert.equal(post.status,405);assert.equal(calls,1);
 const missing=await worker.fetch(new Request('https://example.test/vision/face-landmarker.task'),{});
 assert.equal(missing.status,503);
});
