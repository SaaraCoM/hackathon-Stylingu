// Contra el servidor real: node tests/http-flow.mjs http://localhost:3000
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const sharp = require('sharp');
const base = process.argv[2] || 'http://localhost:3000';
const port = new URL(base).port;
const dir = '.tmp-flow'; fs.mkdirSync(dir, { recursive: true });
let jar = `${dir}/cookies-${port}.txt`;
const results = [];
function call(method, path, payload, expected = 200, authenticated = true) {
  const maxTime = path.includes('/analyze') ? '130' : '35';
  const args = ['-sS', '--max-time', maxTime, '-X', method, '-w', '\n%{http_code}', base + path];
  if (authenticated) args.push('-b', jar, '-c', jar);
  if (payload !== undefined) {
    const file = `${dir}/payload-${port}.json`; fs.writeFileSync(file, JSON.stringify(payload));
    args.push('-H', 'Content-Type: application/json', '--data-binary', '@' + file);
  }
  const raw = execFileSync('curl.exe', args, { encoding: 'utf8' });
  const pos = raw.lastIndexOf('\n'), status = Number(raw.slice(pos + 1));
  const body = raw.slice(0,pos);
  assert.equal(status, expected, `${method} ${path}: ${body}`);
  results.push({ method, path, status });
  console.log(`${status} ${method} ${path}`);
  return body ? JSON.parse(body) : null;
}
// PNG sintético de prueba (32x32, el mínimo que acepta backend/src/images.js).
// No es una fotografía de una persona ni un análisis real.
const png = await sharp({
  create: { width: 32, height: 32, channels: 3, background: { r: 169, g: 80, b: 58 } }
}).png().toBuffer();
fs.writeFileSync(`${dir}/face.png`, png);
fs.writeFileSync(`${dir}/body.png`, png);
const faceBytes = process.env.FLOW_FACE ? fs.readFileSync(process.env.FLOW_FACE) : png;
const bodyBytes = process.env.FLOW_BODY ? fs.readFileSync(process.env.FLOW_BODY) : png;
const mimeFor = file => !file ? 'image/png' : file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
const data = 'data:' + mimeFor(process.env.FLOW_FACE) + ';base64,' + faceBytes.toString('base64');
const bodyData = 'data:' + mimeFor(process.env.FLOW_BODY) + ';base64,' + bodyBytes.toString('base64');
const health = call('GET', '/api/health'); assert.equal(health.ok,true);
const ready = call('GET', '/api/ready'); assert.equal(ready.ready,true);
call('POST', '/api/personal/photos', {}, 401, false);
const account = { name: 'Prueba flujo StylingU', email: `flow-${Date.now()}-${port}@example.test`, password: crypto.randomBytes(16).toString('hex'), birthDate: '1995-04-12' };
const registered = call('POST', '/api/auth/registro', account, 201);
fs.writeFileSync(`${dir}/account-${port}.json`, JSON.stringify(account));
call('GET', '/api/auth/yo');
call('POST', '/api/personal/photos', {}, 404);
call('POST', '/api/personal/analyze', {}, 400);
call('POST', '/api/personal/photos', { face: data }, 400);
call('POST', '/api/personal/photos', { face: 'blob:bad', body: data }, 400);
const uploaded = call('POST', '/api/personal/photos', { face: data, body: bodyData });
assert.ok(uploaded.photos.face.startsWith('/api/personal/photos/'));
assert.notEqual(uploaded.photos.face, uploaded.photos.body);
assert.deepEqual(call('POST', '/api/auth/personal/photos', {}), uploaded);
assert.deepEqual(call('POST', '/api/personal/photos'), uploaded);
const { analysis } = call('POST', '/api/auth/personal/analyze', {});
assert.deepEqual(analysis.photos,uploaded.photos);
assert.ok(['meta','mock'].includes(analysis.source), 'el análisis debe declarar su procedencia');
assert.equal(analysis.protocol,'arquitectura_y_protocolo_de_ia_app_de_belleza');
assert.ok(analysis.analyzedAt && Number.isFinite(Date.parse(analysis.analyzedAt)));
assert.ok(analysis.disclaimer);
assert.ok(analysis.colorimetry.palette.includes(analysis.colorimetry.primaryHex));
assert.ok(analysis.colorimetry.avoid.length && analysis.makeup.shadowPlacement && analysis.outfit.silhouette);
if (analysis.source === 'meta') {
  assert.ok(analysis.model, 'un análisis real debe declarar el modelo');
  assert.equal(analysis.colorimetry.harmony, 0, 'el contrato no inventa una puntuación de armonía');
}
const { items: catalog } = call('GET', '/api/products');
assert.ok(Array.isArray(catalog));
results.push({ catalogVariants: catalog.length, note: catalog.length ? 'referencias verificadas' : 'catálogo vacío: no se inventan marcas' });
for (const variant of catalog) {
  assert.ok(variant.source?.startsWith('https://'), 'cada variante debe enlazar su ficha de origen');
  assert.equal(variant.colorVerified, false);
  assert.equal(variant.hex, '', 'no se inventa un hex de producto sin verificar');
}
const profile = call('GET', '/api/auth/perfil'); assert.deepEqual(profile.analysis,analysis);
const saved = call('PUT', '/api/auth/perfil', { analysis, goals: ['saber_colores'], jewelry: 'dorado', styles: ['Natural'] });
assert.deepEqual(saved.analysis,analysis);
call('PUT', '/api/auth/perfil', { analysis: { photos: { face: 'foreign', body: 'foreign' } } }, 400);
const binary = execFileSync('curl.exe',['-sS','--max-time','15','-b',jar,base+uploaded.photos.face]);
assert.ok(binary.length > 100, 'la foto servida debe tener bytes');
assert.deepEqual([...binary.subarray(0,3)], [0xff,0xd8,0xff], 'la foto normalizada debe ser JPEG');
results.push({ method: 'GET', path: uploaded.photos.face, status: 200, bytesVerified: binary.length, magic: 'jpeg' });
call('GET', uploaded.photos.face, undefined, 401, false);
call('POST','/api/auth/logout',{});
call('POST','/api/auth/login',{ email:account.email,password:account.password });
assert.deepEqual(call('GET','/api/auth/perfil').analysis,analysis);
const ownJar = jar;
jar = `${dir}/cookies-other-${port}.txt`;
call('POST', '/api/auth/registro', { ...account, email: 'other-' + account.email }, 201);
call('GET', uploaded.photos.face, undefined, 404);
assert.equal(call('GET', '/api/auth/perfil').analysis, null);
jar = ownJar;
fs.mkdirSync('docs/evidencia/flujo-personal',{recursive:true});
fs.writeFileSync(`docs/evidencia/flujo-personal/http-${port}.json`,JSON.stringify({ base, at:new Date().toISOString(), userId:registered.user.id, checks:results, persistedAnalysis:analysis },null,2));
console.log('PASS: registro, sesión, fotos binarias privadas, análisis, PUT, logout/login y recuperación persistida.');
