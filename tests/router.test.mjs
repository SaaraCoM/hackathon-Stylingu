import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../package.json',import.meta.url));
const {build}=require('esbuild');const {Miniflare,convertV4MiniflareOptions}=require('miniflare');

test('Worker real: rate limits, protected operations, candidate proxy and atomic blue/green promotion',async()=>{
 const release='a'.repeat(40),image='registry.cloudflare.com/'+'b'.repeat(32)+'/stylingu@sha256:'+'c'.repeat(64);
 const built=await build({entryPoints:[fileURLToPath(new URL('../worker/router.js',import.meta.url))],bundle:true,format:'esm',external:['cloudflare:workers'],write:false});
 const target=slot=>async request=>{
  const path=new URL(request.url).pathname;
  if(path==='/api/health')return Response.json({ok:true,version:release,slot});
  if(path==='/api/ready')return Response.json({ready:true});
  if(path==='/internal/ready')return Response.json({storage:true});
  return Response.json({slot,authorization:request.headers.get('Authorization'),method:request.method,body:request.method==='POST'?await request.text():null});
 };
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'router',modules:true,script:built.outputFiles[0].text,compatibilityDate:'2026-10-30',compatibilityFlags:['nodejs_compat'],bindings:{OPS_TOKEN:'test-operations-token'},durableObjects:{DEPLOYMENT_CONTROL:{className:'DeploymentControl',useSQLite:true},RATE_COUNTER:{className:'RateCounter',useSQLite:true}},serviceBindings:{BLUE:target('blue'),GREEN:target('green')}}]}));
 const ops=async(path,body)=>mf.dispatchFetch('https://example.test/__ops/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer test-operations-token','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await mf.dispatchFetch('https://example.test/__ops/status')).status,404);
  assert.equal((await mf.dispatchFetch('https://example.test/internal/ready')).status,404);
  assert.equal((await (await ops('status')).json()).active,'blue');
  const preview=await (await ops('candidate/green/api/echo',{hello:'candidate'})).json();
  assert.equal(preview.slot,'green');assert.equal(preview.authorization,null);assert.equal(preview.method,'POST');
  assert.equal((await ops('promote',{slot:'green',revision:0,release,image})).status,200);
  assert.equal((await (await ops('status')).json()).active,'green');
  assert.equal((await ops('promote',{slot:'blue',revision:0,release,image})).status,409);
  assert.equal((await ops('promote',{slot:'blue',revision:1,release:'d'.repeat(40),image})).status,409);
  for(let i=0;i<10;i++)assert.equal((await mf.dispatchFetch('https://example.test/api/auth/login',{headers:{'CF-Connecting-IP':'192.0.2.1'}})).status,200);
  assert.equal((await mf.dispatchFetch('https://example.test/api/auth/login',{headers:{'CF-Connecting-IP':'192.0.2.1'}})).status,429);
 }finally{await mf.dispose();}
});
