import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from '../backend/node_modules/pg/lib/index.js';
import {testDatabase,stopCluster} from './pg.mjs';

const migration=readFileSync(new URL('../db/migrations/20261103140831_stylingu_server_only_access.sql',import.meta.url),'utf8');

test('Supabase: permisos cerrados, RLS e idempotencia preservan el acceso del backend', {timeout:180000}, async t=>{
  const url=await testDatabase('supabase_access');
  const client=new pg.Client({connectionString:url});await client.connect();
  try{
    for(const role of ['anon','authenticated','service_role']){
      await client.query(`create role ${role} nologin`);
      await client.query(`grant all on all tables in schema public to ${role}`);
    }
    await client.query(migration);
    await client.query(migration);
    await client.query("insert into users (name,email,password_hash) values ('Prueba','migration@example.test','test-only')");
    await t.test('las 16 tablas tienen RLS y ninguna política pública',async()=>{
      const r=await client.query("select count(*)::int as n,bool_and(rowsecurity) as protected from pg_tables where schemaname='public'");
      assert.equal(r.rows[0].n,16);assert.equal(r.rows[0].protected,true);
      assert.equal((await client.query("select count(*)::int as n from pg_policies where schemaname='public'")).rows[0].n,0);
    });
    await t.test('roles de la API sin permisos de tabla, incluido service_role',async()=>{
      for(const role of ['anon','authenticated','service_role']){
        const r=await client.query("select count(*)::int as n from pg_tables where schemaname='public' and (has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'SELECT') or has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'INSERT') or has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'UPDATE') or has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'DELETE'))",[role]);
        assert.equal(r.rows[0].n,0,role);
        await client.query(`set role ${role}`);
        try{await assert.rejects(()=>client.query('select * from users'),e=>e.code==='42501');}
        finally{await client.query('reset role');}
      }
    });
    await t.test('un GRANT accidental sigue filtrado por RLS',async()=>{
      await client.query('grant select,insert on users to anon');
      await client.query('set role anon');
      try{
        assert.equal((await client.query('select count(*)::int as n from users')).rows[0].n,0);
        await assert.rejects(()=>client.query("insert into users (name,email,password_hash) values ('A','a@example.test','x')"),e=>e.code==='42501');
      }finally{await client.query('reset role');await client.query(migration);}
      assert.equal((await client.query('select count(*)::int as n from users')).rows[0].n,1);
    });
    await t.test('rechaza políticas incompatibles sin modificarlas',async()=>{
      await client.query('create policy existing_policy on users for select to anon using (true)');
      await assert.rejects(()=>client.query(migration),e=>e.code==='P0001'&&/políticas existentes/.test(e.message));
      assert.equal((await client.query("select count(*)::int as n from pg_policies where policyname='existing_policy'")).rows[0].n,1);
      await client.query('drop policy existing_policy on users');
    });
  }finally{await client.end();await stopCluster();}
});
