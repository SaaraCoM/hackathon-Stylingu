import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {testDatabase,stopCluster} from './pg.mjs';
import {query,runAsUser,connectionOptions} from '../backend/src/db/pool.js';
import {csrfGuard} from '../backend/src/middleware/security.js';

test('RLS real: dos identidades, no acceso anónimo, sesión revocada y rol de trabajos',async()=>{
  await testDatabase('security');process.env.NODE_ENV='test';
  const a=randomUUID(),b=randomUUID(),sid=randomUUID();
  try{
    for(const [id,name] of [[a,'A'],[b,'B']])await query('insert into auth.users(id,email,raw_user_meta_data)values($1,$2,$3)',[id,name+'@example.test',{name,birth_date:'1990-01-01'}]);
    await query('insert into auth.sessions(id,user_id)values($1,$2)',[sid,a]);
    process.env.DB_ROLE='stylingu_api';
    assert.equal((await query('select * from users')).rowCount,0,'no identity means no rows');
    await runAsUser(a,async()=>{
      assert.equal((await query('select * from users')).rowCount,1);
      assert.equal((await query('select * from users where id=$1',[b])).rowCount,0);
      await query("insert into garments(user_id,name,category)values($1,'Mine','top')",[a]);
      await assert.rejects(()=>query("insert into garments(user_id,name,category)values($1,'Not mine','top')",[b]),e=>e.code==='42501');
      await assert.rejects(()=>query('update garments set user_id=$1 where user_id=$2',[b,a]),e=>e.code==='42501');
      await assert.rejects(()=>query('delete from auth.users where id=$1',[a]),e=>e.code==='42501');
      await assert.rejects(()=>query('select * from private.claim_analysis_job()'),e=>e.code==='42501');
    },{sessionId:sid});
    assert.equal((await query('select * from users')).rowCount,0,'identity does not leak through pool reuse');
    delete process.env.DB_ROLE;await query('delete from auth.sessions where id=$1',[sid]);
    process.env.DB_ROLE='stylingu_api';
    await runAsUser(a,async()=>assert.equal((await query('select * from garments')).rowCount,0),{sessionId:sid});
    delete process.env.DB_ROLE;
    const j=randomUUID();await query("insert into analysis_jobs(id,user_id,key,hash,state)values($1,$2,'key','hash','queued')",[j,a]);
    process.env.DB_ROLE='stylingu_jobs';
    const claimed=await query('select * from private.claim_analysis_job()');assert.equal(claimed.rows[0].id,j);
    assert.equal((await query('select * from private.claim_analysis_job()')).rowCount,0);
    await runAsUser(a,async()=>{
      assert.equal((await query('select * from users')).rowCount,1);
      await assert.rejects(()=>query("insert into garments(user_id,name,category)values($1,'No','top')",[a]),e=>e.code==='42501');
      await query("update analysis_jobs set state='completed' where id=$1",[j]);
    },{jobId:j});
  }finally{delete process.env.DB_ROLE;await stopCluster();}
});

test('TLS rejects certificate bypass parameters; CSRF rejects missing header and foreign origins',()=>{
  const old=process.env.NODE_ENV;process.env.NODE_ENV='production';
  try{assert.equal(connectionOptions('postgres://user:pass@db.example:5432/postgres?sslmode=no-verify').ssl.rejectUnauthorized,true);}finally{process.env.NODE_ENV=old;}
  const res={status(s){this.code=s;return this;},json(v){this.body=v;return this;}};
  let passed=false;
  csrfGuard({method:'POST',protocol:'https',get:k=>({host:'example.test',Origin:'https://evil.test','X-Stylingu-Request':'1'}[k])},res,()=>passed=true);
  assert.equal(res.code,403);assert.equal(passed,false);
  csrfGuard({method:'POST',protocol:'https',get:k=>({host:'example.test'}[k])},res,()=>passed=true);assert.equal(passed,false);
});
