import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {testDatabase,stopCluster} from './pg.mjs';
test('migration runner accepts repeated application of an already secured schema',async()=>{
 await testDatabase('migration');
 try{
  for(let i=0;i<2;i++){
   const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/migrate.mjs',import.meta.url))],{env:{...process.env,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
   let out='';child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>out+=v);
   const code=await new Promise(resolve=>child.on('close',resolve));
   assert.equal(code,0,out);assert.match(out,/committed: 0 file/);
  }
 }finally{await stopCluster();}
});
