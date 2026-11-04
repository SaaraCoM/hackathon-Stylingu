import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTurnstile} from '../backend/src/middleware/turnstile.js';
const env={TURNSTILE_SECRET:'test-only',PUBLIC_ORIGIN:'https://stylingu.example'};
const req={method:'POST',path:'/login',get:()=> 'test-token'};
test('standalone auth verifies success, hostname and action',async()=>{
 const valid={success:true,hostname:'stylingu.example',action:'login'};
 await verifyTurnstile(req,env,async(url,options)=>{assert.match(url,/siteverify$/);assert.equal(JSON.parse(options.body).response,'test-token');return Response.json(valid);});
 for(const verdict of [{...valid,success:false},{...valid,hostname:'attacker.example'},{...valid,action:'registro'}])await assert.rejects(()=>verifyTurnstile(req,env,async()=>Response.json(verdict)),{status:403});
 await assert.rejects(()=>verifyTurnstile({...req,get:()=>''},env),{status:403});
 await assert.rejects(()=>verifyTurnstile(req,{}),{status:503});
 await assert.rejects(()=>verifyTurnstile(req,env,async()=>{throw new Error('offline');}),{status:503});
 await verifyTurnstile({...req,method:'GET'},env,()=>{throw new Error('must not run');});
});
