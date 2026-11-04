import {Script} from 'node:vm';
import './build-design.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {build} from '../frontend/node_modules/esbuild/lib/main.js';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'frontend/dist');
const edgeOutput=path.join(root,'deploy/free');
await fs.mkdir(output,{recursive:true});await fs.mkdir(edgeOutput,{recursive:true});
async function walk(dir){return (await Promise.all((await fs.readdir(path.join(root,dir),{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
const assets={};
for(const file of (await walk('frontend/public')).sort()){
  // Large on-device ML assets are static files, not embedded Worker code.
  if(file.split(path.sep).join('/').startsWith('frontend/public/vision/'))continue;
  const type=mime[path.extname(file)];if(!type)throw new Error('Tipo de recurso público no previsto: '+file);
  let bytes=await fs.readFile(path.join(root,file));
  if(file.replaceAll('\\','/').includes('/assets/editorial/')&&path.extname(file)==='.jpg')bytes=await sharp(bytes).rotate().resize({width:1200,height:1400,fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer();
  assets['/'+path.relative('frontend/public',file).split(path.sep).join('/')]={type,base64:bytes.toString('base64')};
}
const codeHash=createHash('sha256').update(JSON.stringify(assets));
await fs.mkdir(path.join(root,'deploy/vision-assets'),{recursive:true});
await fs.cp(path.join(root,'frontend/public/vision'),path.join(root,'deploy/vision-assets/vision'),{recursive:true});
for(const file of [...await walk('backend/src'),...await walk('shared'),...await walk('edge'),'worker/free.js'].sort())codeHash.update(await fs.readFile(path.join(root,file)));
const release=codeHash.digest('hex').slice(0,16);
const cachePaths=Object.keys(assets).filter(k=>k!=='/sw.js'&&k!=='/index.html');
const sw='const CACHE='+JSON.stringify('stylingu-public-'+release)+';const SHELL="/index.html";const ASSETS='+JSON.stringify(cachePaths)+';self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll([...new Set([...ASSETS,SHELL])])))});self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("stylingu-public-")&&k!==CACHE).map(k=>caches.delete(k))))])));self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==self.location.origin||u.pathname.startsWith("/api/"))return;if(e.request.mode==="navigate"){e.respondWith(caches.match(SHELL).then(c=>c||fetch(e.request)));return}if(!ASSETS.includes(u.pathname))return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});';
new Script(sw);
assets['/sw.js']={type:mime['.js'],base64:Buffer.from(sw).toString('base64')};
await fs.writeFile(path.join(output,'free-assets.mjs'),'export default '+JSON.stringify(assets)+';');
await fs.writeFile(path.join(output,'free-entry.mjs'),"import assets from './free-assets.mjs';import {createWorker} from '../../worker/free.js';export {StylinguContainer} from '../../worker/free.js';export default createWorker(assets);");
await build({entryPoints:[path.join(output,'free-entry.mjs')],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2022',outfile:path.join(output,'free-worker.mjs'),legalComments:'inline'});
const worker=await fs.readFile(path.join(output,'free-worker.mjs'));
const compressed=gzipSync(worker).length;
if(compressed>2800000)throw new Error('Worker demasiado grande para mantener margen en el plan gratuito.');
const files=[];
for(const file of [...await walk('backend/src'),...await walk('shared')].filter(f=>f.endsWith('.js'))){
  let content=await fs.readFile(path.join(root,file),'utf8');
  const name=file.split(path.sep).join('/');
  if(name==='backend/src/images.js')content="export {normalizePhoto} from '../../edge/images.js';";
  if(name==='backend/src/middleware/rateLimit.js')content="export {apiLimiter,authLimiter,aiLimiter} from '../../../edge/rate-limit.js';";
  files.push({name,content});
}
for(const file of ['edge/images.js','edge/image-bounds.js','edge/rate-limit.js','edge/runtime-config.js','edge/proxy-key.js']){
  let content=await fs.readFile(path.join(root,file),'utf8');
  if(file==='edge/rate-limit.js')content=content.replace("'../backend/node_modules/express-rate-limit/dist/index.mjs'","'express-rate-limit'");
  files.push({name:file,content});
}
const lock=JSON.parse(await fs.readFile(path.join(root,'backend/package-lock.json'),'utf8'));
const imports={};for(const name of ['express','bcryptjs','cookie','express-rate-limit','nodemailer','pg'])imports[name]='npm:'+name+'@'+lock.packages['node_modules/'+name].version;
imports['@cf-wasm/photon/node']='npm:@cf-wasm/photon@0.4.0/node';
files.push({name:'deno.json',content:JSON.stringify({imports})});
const entry=await fs.readFile(path.join(root,'edge/index.ts'),'utf8');
for(const [name,origin] of [['stylingu-preview-api','https://stylingu-free-preview.castellanomateossara.workers.dev'],['stylingu-api','https://hackathon-stylingu.castellanomateossara.workers.dev']]){
  const content=entry.replaceAll('__FUNCTION_NAME__',name).replaceAll('__PUBLIC_ORIGIN__',origin).replace('free-edge-v1',release);
  const bundle={name,project_id:'zbfxwbuuuzjzmsrraxkf',entrypoint_path:'index.ts',verify_jwt:false,files:[...files,{name:'index.ts',content}]};
  await fs.writeFile(path.join(edgeOutput,name+'.json'),JSON.stringify(bundle));
}
const report={release,assets:Object.keys(assets).length,workerGzipBytes:compressed,workerBytes:worker.length,edgeSourceFiles:files.length+1};
await fs.writeFile(path.join(edgeOutput,'build-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
