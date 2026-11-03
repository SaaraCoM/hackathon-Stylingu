import test from 'node:test';
import assert from 'node:assert/strict';
import pg from '../backend/node_modules/pg/lib/index.js';
import {testDatabase,stopCluster} from './pg.mjs';
import {transferData} from '../scripts/transfer-data.mjs';

test('transferencia: integridad, rollback y COMMIT ambiguo', {timeout:180000}, async t=>{
  const source=new pg.Client({connectionString:await testDatabase('transfer_source')});await source.connect();
  const target=new pg.Client({connectionString:await testDatabase('transfer_target')});await target.connect();
  const key='photos/synthetic-test-photo';const bytes=Buffer.from('synthetic-photo-fixture');
  const saved=new Map();let corrupt=false;
  const photos={readSource:async()=>bytes,putIfAbsent:async(k,b)=>{if(saved.has(k))return false;saved.set(k,Buffer.from(b));return true;},readTarget:async k=>corrupt?Buffer.from('corrupted'):saved.get(k),removeTarget:async k=>saved.delete(k)};
  try{
    const {rows:[user]}=await source.query("insert into users (name,email,password_hash,birth_date,analysis,created_at) values ('Prueba','transfer@example.test','test-hash','1990-05-20',$1,'2026-10-01T01:02:03.123456Z') returning id",[JSON.stringify(['jsonb-array',1])]);
    await source.query('insert into photos(id,user_id,mime,storage_key,bytes) values ($1,$2,$3,$4,$5)',['photo-test-123',user.id,'image/jpeg',key,bytes.length]);
    await source.query("insert into analysis_jobs(user_id,key,hash,state,result) values ($1,'k1','h1','completed',$2)",[user.id,JSON.stringify({nested:{list:[1,'á']}})]);
    await t.test('copia fechas precisas, JSON, sesiones y bytes sin alterar el origen',async()=>{
      const report=await transferData({source,target,photos});assert.equal(report.verified,true);assert.equal(report.photosCreated,1);
      const {rows:[r]}=await target.query("select analysis,birth_date::text,to_char(created_at,'US') as micros,password_hash from users");
      assert.deepEqual(r.analysis,['jsonb-array',1]);assert.equal(r.birth_date,'1990-05-20');assert.equal(r.micros,'123456');assert.equal(r.password_hash,'test-hash');
      assert.equal((await source.query('select count(*)::int as n from users')).rows[0].n,1);assert.deepEqual(saved.get(key),bytes);
    });
    await t.test('rechaza un destino ocupado sin sobrescribirlo',async()=>{
      await assert.rejects(()=>transferData({source,target,photos}),/TARGET_NOT_EMPTY/);
      assert.equal((await target.query('select count(*)::int as n from users')).rows[0].n,1);
    });
    await target.query('truncate users cascade');saved.clear();
    await t.test('un fallo de integridad revierte filas y elimina solo fotos nuevas',async()=>{
      corrupt=true;
      await assert.rejects(()=>transferData({source,target,photos}),/PHOTO_INTEGRITY_FAILED/);
      assert.equal((await target.query('select count(*)::int as n from users')).rows[0].n,0);assert.equal(saved.size,0);corrupt=false;
    });
    await t.test('conserva fotos si COMMIT pudo completarse antes de perder conexión',async()=>{
      const ambiguous={query:async(...args)=>{const result=await target.query(...args);if(args[0]==='commit')throw new Error('simulated connection lost');return result;}};
      await assert.rejects(()=>transferData({source,target:ambiguous,photos}),/COMMIT_RESULT_REQUIRES_RECONCILIATION/);
      assert.equal((await target.query('select count(*)::int as n from users')).rows[0].n,1);assert.deepEqual(saved.get(key),bytes);
    });
  }finally{await source.end();await target.end();await stopCluster();}
});
