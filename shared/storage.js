// Almacenamiento de fotos. Supabase Storage en producción; disco local en
// desarrollo y tests, para no depender de red al ejecutar la suite.
// Los bytes nunca se guardan en Postgres: la tabla `photos` solo tiene metadatos.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LOCAL_DIR = fileURLToPath(new URL('../backend/.photos/', import.meta.url));

function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'stylingu-photos';
  return url && key ? { url, key, bucket } : null;
}

export const storageMode = () => (supabaseConfig() ? 'supabase' : 'local');

function headers(config, extra = {}) {
  return {
    apikey: config.key,
    Authorization: 'Bearer ' + config.key,
    ...extra
  };
}

function assertKey(key) {
  // Claves internas: sha256 hex + prefijo. Nada de rutas del usuario.
  if (typeof key !== 'string' || !/^[a-z0-9/_-]{8,200}$/i.test(key) || key.includes('..')) {
    throw new Error('Clave de almacenamiento no válida.');
  }
  return key;
}

export async function put(key, bytes, mime) {
  assertKey(key);
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${key}`, {
      method: 'POST',
      headers: headers(config, { 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' }),
      body: bytes
    });
    if (!response.ok) throw new Error('No se pudo guardar la foto (' + response.status + ').');
    return key;
  }
  const target = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  return key;
}

export async function get(key) {
  assertKey(key);
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${key}`, {
      headers: headers(config)
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('No se pudo leer la foto (' + response.status + ').');
    return Buffer.from(await response.arrayBuffer());
  }
  try {
    return await fs.readFile(path.join(LOCAL_DIR, key));
  } catch {
    return null;
  }
}

export async function remove(keys = []) {
  const clean = keys.filter(Boolean).map(assertKey);
  if (!clean.length) return;
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}`, {
      method: 'DELETE',
      headers: headers(config, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ prefixes: clean })
    });
    if (!response.ok && response.status !== 404) throw new Error('No se pudieron borrar las fotos (' + response.status + ').');
    return;
  }
  await Promise.all(clean.map(key => fs.rm(path.join(LOCAL_DIR, key), { force: true })));
}
