import test from 'node:test';
import assert from 'node:assert/strict';
import {configureNodeRuntime} from '../edge/runtime-config.js';

test('configuración Edge: respeta el entorno de secretos de solo lectura',()=>{
  let writes=0;
  const nodeProcess={env:new Proxy({},{set(){writes++;throw new Error('read only');}})};
  const values={SUPABASE_DB_URL:'postgresql://test.invalid/db',SUPABASE_URL:'https://example.supabase.co',META_AI_API_KEY:'test-key',MODEL_API_KEY:'legacy-test-key'};
  configureNodeRuntime(nodeProcess,name=>values[name],{publicOrigin:'https://example.workers.dev',release:'test'});
  assert.equal(writes,0);assert.equal(nodeProcess.env.DATABASE_URL,values.SUPABASE_DB_URL);
  assert.equal(nodeProcess.env.MODEL_API_KEY,'test-key');assert.equal(nodeProcess.env.AI_PROVIDER,'meta');assert.equal(nodeProcess.env.NODE_ENV,'production');assert.equal(nodeProcess.env.TRUST_PROXY,'0');
});
