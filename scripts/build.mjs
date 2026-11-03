import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from '../frontend/node_modules/esbuild/lib/main.js';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const sharp=require('sharp');
const root=fileURLToPath(new URL('../',import.meta.url)),pub=path.join(root,'frontend/public');
await build({entryPoints:[path.join(root,'frontend/barcode-entry.js')],bundle:true,minify:true,format:'iife',outfile:path.join(pub,'js/barcode.js'),legalComments:'linked'});
// Los iconos son recursos originales de la marca; el build no los sustituye.
const walk=async dir=>(await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(async e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat();
const files=await walk(pub);const cacheFiles=files.filter(p=>/\.(css|js|png|svg|jpg|json)$/.test(p)&&!p.endsWith('sw.js')).map(p=>'/'+path.relative(pub,p).split(path.sep).join('/'));
const version=process.env.RELEASE_VERSION||new Date().toISOString().replace(/\W/g,'');
const sw=`const CACHE=${JSON.stringify('stylingu-public-'+version)};const ASSETS=${JSON.stringify(cacheFiles)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('stylingu-public-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||!ASSETS.includes(u.pathname))return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));});`;
await fs.writeFile(path.join(pub,'sw.js'),sw);
await fs.cp(pub,path.join(root,'frontend/dist'),{recursive:true});await fs.writeFile(path.join(root,'frontend/dist/release.json'),JSON.stringify({version,builtAt:new Date().toISOString()})+'\n');console.log('Distribución creada en frontend/dist · '+version);
