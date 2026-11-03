import test from 'node:test';
import assert from 'node:assert/strict';
import {testDatabase,stopCluster} from './pg.mjs';

test('esquema Postgres: tablas, índice parcial y borrado en cascada', async () => {
  await testDatabase('schema');
  const {query}=await import('../backend/src/db/pool.js');
  try {
    const {rows}=await query("select table_name from information_schema.tables where table_schema='public'");
    const tables=new Set(rows.map(r=>r.table_name));
    for(const name of ['users','photos','outfits','garments','outfit_plans','products','product_variants','product_offers','owned_cosmetics','recommendation_feedback','tutorial_progress','analysis_jobs','quotas','schema_migrations'])assert.ok(tables.has(name),name);

    const {rows:[user]}=await query("insert into auth.users (id,email,raw_user_meta_data) values (gen_random_uuid(),'a@example.test','{\"name\":\"A\",\"birth_date\":\"1990-01-01\"}') returning id");
    const {rows:[birth]}=await query("select 1 from information_schema.columns where table_name='users' and column_name='birth_date'");
    assert.ok(birth,'users.birth_date');
    await query("insert into garments (user_id,name,category) values ($1,'Top','top')",[user.id]);
    await query('delete from users where id=$1',[user.id]);
    const {rows:[left]}=await query('select count(*)::int as n from garments');
    assert.equal(left.n,0);

    await query("insert into auth.users (id,email,raw_user_meta_data) values ('11111111-1111-1111-1111-111111111111','b@example.test','{\"name\":\"B\",\"birth_date\":\"1990-01-01\"}')");
    await query("insert into analysis_jobs (user_id,key,hash,state) values ('11111111-1111-1111-1111-111111111111','k1','h','queued')");
    await assert.rejects(
      () => query("insert into analysis_jobs (user_id,key,hash,state) values ('11111111-1111-1111-1111-111111111111','k2','h','queued')"),
      error => error.code === '23505'
    );
    await query("insert into analysis_jobs (user_id,key,hash,state) values ('11111111-1111-1111-1111-111111111111','k3','h','completed')");
  } finally {
    await stopCluster();
  }
});
