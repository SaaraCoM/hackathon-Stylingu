import test from 'node:test';
import assert from 'node:assert/strict';
import request from '../backend/node_modules/supertest/index.js';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const sharp=require('sharp');
import {testDatabase,stopCluster} from './pg.mjs';
import {installAuthFixture} from './auth-fixture.mjs';
import {seedCatalog} from '../shared/catalog-seed.js';
test('integración HTTP: sesiones, aislamiento, perfil, tareas, armario, compras y eliminación', {timeout:180000},async t=>{
 await testDatabase('http');process.env.NODE_ENV='test';process.env.AI_PROVIDER='mock';delete process.env.PUBLIC_ORIGIN;
 const auth=await installAuthFixture();
 const {default:app}=await import('../backend/src/index.js');const {products,repo}=await import('../backend/src/product.js');
 const server=app.listen(0);const a=request.agent(server).set('X-Stylingu-Request','1'),b=request.agent(server).set('X-Stylingu-Request','1');
 try {
  await seedCatalog(repo);
  let aid,bid,garmentId,jobId;
  await t.test('registro exige fecha y bloquea a menores de 16',async()=>{
    const base={name:'Menor',email:'menor@example.test',password:'Password-123'};
    const missing=await a.post('/api/auth/registro').send(base).expect(400);assert.equal(missing.body.code,'BIRTH_DATE_REQUIRED');
    const invalid=await a.post('/api/auth/registro').send({...base,birthDate:'2015-13-40'}).expect(400);assert.equal(invalid.body.code,'INVALID_BIRTH_DATE');
    const under=await a.post('/api/auth/registro').send({...base,birthDate:`${new Date().getFullYear()-10}-01-01`}).expect(403);assert.equal(under.body.code,'UNDERAGE');
    assert.equal(await repo.userByEmail('menor@example.test'),null);
  });
  await t.test('registro exige confirmación y login entrega cookies HttpOnly',async()=>{
    for (const [agent,name,email,password] of [[a,'Ana','ana@example.test','Password-123'],[b,'Berta','berta@example.test','Password-456']]) {
      const r=await agent.post('/api/auth/registro').send({name,email,password,birthDate:'1995-04-12'}).expect(201);
      assert.equal(r.body.user,null);assert.equal(r.body.confirmationRequired,true);
      await agent.post('/api/auth/login').send({email,password}).expect(401);
      await auth.confirm(email);
      const login=await agent.post('/api/auth/login').send({email,password}).expect(200);
      if(agent===a)aid=login.body.user.id;else bid=login.body.user.id;
      assert.ok(login.headers['set-cookie'].some(c=>c.includes('HttpOnly')));
    }
  });
  await t.test('propietario de prendas y renderizado de texto no confiable',async()=>{const r=await a.post('/api/garments').send({name:'Camisa A',category:'top',colors:['#112233'],userId:bid}).expect(201);garmentId=r.body.item._id;assert.equal(r.body.item.userId,aid);assert.equal((await b.get('/api/garments')).body.items.length,0);await b.delete('/api/garments/'+garmentId).expect(404);await a.post('/api/garments').send({name:'<img onerror=alert(1)>',category:'top'}).expect(400);});
  await t.test('perfil versionado y presupuesto independiente del análisis',async()=>{const p=(await a.patch('/api/profile').send({hairColor:'castaño',currency:'EUR',budget:20}).expect(200)).body.profile;assert.equal(p.version,1);assert.equal(p.visualVersion,1);const p2=(await a.patch('/api/profile').send({budget:30}).expect(200)).body.profile;assert.equal(p2.visualVersion,1);assert.equal(p2.version,2);});
  let face;
  await t.test('fotos se decodifican, normalizan y aíslan',async()=>{const image='data:image/png;base64,'+(await sharp({create:{width:32,height:32,channels:3,background:'#AABBCC'}}).png().toBuffer()).toString('base64');const result=await a.post('/api/personal/photos').send({face:image,body:image}).expect(200);face=result.body.photos.face;await b.get(face).expect(404);const p=await a.get(face).expect(200);assert.equal(p.headers['content-type'],'image/jpeg');assert.match(p.headers['cache-control'],/no-store/);});
  await t.test('idempotencia concurrente genera un solo trabajo y ejecución',async()=>{const calls=await Promise.all([1,2].map(()=>a.post('/api/personal/analysis-jobs').set('Idempotency-Key','same-key-123').send({userMeta:{}})));assert.equal(calls[0].status,202);assert.equal(calls[1].status,202);assert.equal(calls[0].body.id,calls[1].body.id);jobId=calls[0].body.id;assert.equal(await repo.countRows('analysis_jobs',aid),1);await b.get('/api/jobs/'+jobId).expect(404);assert.equal(await products.runOne(),true);assert.equal(await products.runOne(),false);const job=await a.get('/api/jobs/'+jobId).expect(200);assert.equal(job.body.state,'completed',JSON.stringify(job.body));assert.equal(job.body.result.analysis.profileVersion,2);});
  await t.test('resultado anterior permanece mientras se cambian fotos',async()=>{const image='data:image/png;base64,'+(await sharp({create:{width:32,height:32,channels:3,background:'#CCBBAA'}}).png().toBuffer()).toString('base64');await a.post('/api/personal/photos').send({face:image,body:image}).expect(200);assert.ok((await a.get('/api/personal/analysis')).body.analysis.analyzedAt);});
  await t.test('trabajo obsoleto no sobrescribe un perfil más reciente',async()=>{const j=await products.requestAnalysis(aid,{},'stale-key-123');await products.updateProfile(aid,{hairColor:'negro'});await products.runOne();const saved=await repo.jobByIdForUser(j._id,aid);assert.equal(saved.state,'failed');assert.equal(saved.error.code,'STALE_INPUT');});
  await t.test('calendario: siete combinaciones propias y aperturas estables',async()=>{for(let i=0;i<2;i++)await a.post('/api/garments').send({name:'Top '+i,category:'top',colors:['#AA5533']}).expect(201);for(let i=0;i<3;i++)await a.post('/api/garments').send({name:'Bottom '+i,category:'bottom',colors:['#223344']}).expect(201);const body={from:'2026-10-28',timeZone:'Europe/Madrid'};const first=await a.post('/api/outfit-plans').send(body).expect(200);const second=await a.post('/api/outfit-plans').send(body).expect(200);assert.equal(first.body.plans.length,7);assert.equal(new Set(first.body.plans.map(p=>p.signature)).size,7);assert.deepEqual(first.body.plans.map(p=>p._id),second.body.plans.map(p=>p._id));const other=await b.get('/api/outfit-plans?from=2026-10-28&to=2026-11-03');assert.equal(other.body.plans.length,0);});
  await t.test('producto desconocido y familia ambigua no dan compra categórica',async()=>{const unknown=await a.post('/api/scans').send({barcode:'0000000000000'}).expect(200);assert.equal(unknown.body.state,'unknown');const family=await a.post('/api/scans').send({query:'Lifter'}).expect(200);assert.equal(family.body.state,'confirm_variant');assert.equal(family.body.candidates.length,3);const rec=await a.post('/api/purchase-recommendations').send({variantId:'maybelline-lifter-moon'}).expect(200);assert.equal(rec.body.state,'insufficient');});
  await t.test('catálogo incluye labios, colorete y sombras sin certificar colores aproximados',async()=>{
   const {items}=(await a.get('/api/products').expect(200)).body;
   assert.equal(items.length,21);assert.deepEqual(new Set(items.map(v=>v.product.category)),new Set(['labial','colorete','sombra']));
   for(const v of items){assert.match(v.source,/^https:\/\//);assert.equal(v.colorVerified,false);assert.equal(v.hex,'');}
   await seedCatalog(repo);assert.equal((await a.get('/api/products')).body.items.length,21,'volver a cargar no duplica tonos');
  });
  await t.test('feedback persistente tiene efecto de duplicidad',async()=>{await a.post('/api/recommendation-feedback').send({variantId:'maybelline-lifter-moon',action:'owned'}).expect(200);const rec=await a.post('/api/purchase-recommendations').send({variantId:'maybelline-lifter-moon'}).expect(200);assert.equal(rec.body.state,'low_priority');assert.equal((await b.get('/api/owned-cosmetics')).body.items.length,0);});
  await t.test('tutorial conserva progreso por versión',async()=>{const items=(await a.get('/api/tutorials').expect(200)).body.items;const tutorial=items[0],key=tutorial.id+':'+tutorial.analysisId+':'+tutorial.profileVersion;await a.post('/api/tutorial-progress').send({key,completed:[0]}).expect(200);assert.deepEqual((await a.get('/api/tutorial-progress?key='+encodeURIComponent(key))).body.completed,[0]);});
  await t.test('liveness, readiness y adaptador ESM',async()=>{await a.get('/api/health').expect(200);await a.get('/api/ready').expect(200);assert.equal((await import('../vercel/api/index.js')).default,app);});
  await t.test('recuperación delega el envío en Supabase Auth',async()=>{const response=await a.post('/api/auth/forgot-password').send({email:'ana@example.test'}).expect(200);assert.equal(response.body.ok,true);});
  await t.test('borrado revoca sesión y elimina todas las colecciones personales',async()=>{await a.delete('/api/account').send({confirmation:'ELIMINAR'}).expect(200);assert.equal(await repo.countRows('users',aid),0);for(const table of ['photos','outfits','garments','outfit_plans','owned_cosmetics','recommendation_feedback','tutorial_progress','analysis_jobs','quotas'])assert.equal(await repo.countRows(table,aid),0,table);await a.get('/api/profile').expect(401);assert.ok(await repo.userById(bid));});
 }finally{await new Promise(resolve=>server.close(resolve));await stopCluster();auth.reset();}
});
