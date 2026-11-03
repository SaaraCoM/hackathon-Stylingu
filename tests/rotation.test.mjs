import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceRotation} from '../scripts/security/rotation-machine.mjs';
test('rotation: candidate failure keeps old key, grace blocks revoke, consumer failure blocks revoke, resume succeeds',async()=>{
 let saved,revoked=0,promoted=0,valid=false,ready=false;
 const provider={prepare:async()=>({id:'new'}),verifyCandidate:async()=>valid,promote:async()=>{promoted++;},consumersReady:async()=>ready,revoke:async id=>{assert.equal(id,'old');revoked++;}};
 const args={state:{phase:'active',currentId:'old',createdAt:0},save:async s=>saved=structuredClone(s),provider,now:1000,periodMs:100,graceMs:500};
 await assert.rejects(()=>advanceRotation(args));assert.equal(saved.phase,'prepared');assert.equal(revoked,0);
 valid=true;await advanceRotation({...args,state:saved});assert.equal(saved.phase,'promoted');assert.equal(promoted,1);assert.equal(revoked,0);
 await advanceRotation({...args,state:saved,now:1200});assert.equal(revoked,0);
 await assert.rejects(()=>advanceRotation({...args,state:saved,now:1600}));assert.equal(revoked,0);
 ready=true;await advanceRotation({...args,state:saved,now:1600});assert.equal(revoked,1);assert.equal(saved.currentId,'new');assert.equal(promoted,1);
});
