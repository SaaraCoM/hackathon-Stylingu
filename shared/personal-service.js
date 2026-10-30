import { createHash, randomUUID } from 'node:crypto';
import { analyzeSimulated } from './analysis.js';
import { PersonalError } from './personal-error.js';
import { cleanUserMeta } from './ai-contract.js';
import { aiConfig, metaClient } from './meta-client.js';
export { PersonalError } from './personal-error.js';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export function decodePhoto(value, maxBytes = MAX_PHOTO_BYTES) {
  if (typeof value !== 'string') throw new PersonalError('Selecciona una imagen válida.');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new PersonalError('Usa imágenes PNG, JPEG o WebP; no enlaces temporales.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > maxBytes) throw new PersonalError('La imagen supera el tamaño permitido.', 413);
  const mime = match[1];
  const valid = mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid || bytes.length < 16) throw new PersonalError('El contenido no corresponde al formato de imagen.');
  return { bytes, mime };
}

// `repo` y `storage` se inyectan: el servicio no sabe si los bytes están en
// Supabase Storage o en disco, ni construye SQL.
export function personalService({ repo, storage, normalizePhoto = async value => value }) {
  async function findUser(id) {
    const user = await repo.userById(id, { includeDeleting: true });
    if (!user || user.deleting) throw new PersonalError('Sesión sin cuenta.', 401);
    return user;
  }

  async function storeImage(id, kind, decoded) {
    await findUser(id);
    const { bytes, mime } = decoded;
    const key = createHash('sha256').update(String(id)).update(kind).update(bytes).digest('hex');
    const storageKey = 'photos/' + key;
    await storage.put(storageKey, bytes, mime);
    try {
      await repo.upsertPhoto({ id: key, userId: id, mime, storageKey, bytes: bytes.length });
    } catch (error) {
      await storage.remove([storageKey]).catch(() => {});
      throw error;
    }
    try {
      await findUser(id);
    } catch (error) {
      await repo.deleteAccount(id).then(keys => storage.remove(keys)).catch(() => {});
      throw error;
    }
    return '/api/personal/photos/' + key;
  }

  async function imageData(id, ref) {
    if (typeof ref !== 'string' || !/^\/api\/personal\/photos\/[a-f0-9]{64}$/.test(ref)) {
      throw new PersonalError('Referencia de foto no válida.');
    }
    const photo = await repo.photoForUser(ref.split('/').pop(), id);
    if (!photo) throw new PersonalError('No se encuentra una de tus fotos. Vuelve a subirlas.', 404);
    const bytes = await storage.get(photo.storageKey);
    if (!bytes) throw new PersonalError('No se encuentra una de tus fotos. Vuelve a subirlas.', 404);
    return 'data:' + photo.mime + ';base64,' + bytes.toString('base64');
  }

  async function savePhotos(id, payload = {}) {
    const user = await findUser(id);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new PersonalError('Cuerpo JSON no válido.');
    }
    const input = user.photoInput || user.analysis;
    if (payload.face == null && payload.body == null) {
      if (!input?.photos?.face || !input?.photos?.body) {
        throw new PersonalError('Todavía no has subido las dos fotos.', 404);
      }
      return { photos: input.photos };
    }
    const garments = payload.garments ?? [];
    if (!Array.isArray(garments) || garments.length > 2) {
      throw new PersonalError('Puedes añadir hasta dos fotos de prendas.');
    }
    const decodedGarments = await Promise.all(garments.map(value => normalizePhoto(decodePhoto(value))));
    const decoded = { face: await normalizePhoto(decodePhoto(payload.face)), body: await normalizePhoto(decodePhoto(payload.body)) };
    const photos = {};
    for (const kind of ['face', 'body']) photos[kind] = await storeImage(id, kind, decoded[kind]);
    photos.garments = [];
    for (let i = 0; i < decodedGarments.length; i++) {
      photos.garments.push(await storeImage(id, 'garment' + i, decodedGarments[i]));
    }
    const changed = photos.face !== input?.photos?.face
      || photos.body !== input?.photos?.body
      || JSON.stringify(photos.garments) !== JSON.stringify(input?.photos?.garments ?? []);
    if (changed) await repo.saveUser(id, { photoInput: { photos, inputVersion: randomUUID() } });
    return { photos };
  }

  async function analyze(id, payload = {}, env = {}) {
    const user = await findUser(id);
    const input = user.photoInput || user.analysis;
    const photos = input?.photos;
    if (payload.expectedInputVersion
      && (payload.expectedInputVersion !== input?.inputVersion || payload.expectedProfileVersion !== (user.profile?.version || 0))) {
      throw new PersonalError('Las entradas del trabajo han cambiado.', 409, 'STALE_INPUT');
    }
    if (!photos?.face || !photos?.body) {
      throw new PersonalError('Sube una foto de cara y otra de cuerpo antes de analizar.');
    }
    const config = aiConfig(env);
    const refs = { face: photos.face, body: photos.body, garments: [...(photos.garments ?? [])] };
    const d = user.profile?.declared || {};
    const userMeta = cleanUserMeta({
      ...payload.userMeta,
      skinType: d.skinType || payload.userMeta?.skinType,
      allergies: d.restrictions || payload.userMeta?.allergies,
      stylePreferences: d.style || payload.userMeta?.stylePreferences
    });
    userMeta.declared = { ...d };
    let analysis;
    if (config.provider === 'mock') {
      analysis = { ...analyzeSimulated({ photos: refs, user }), photos: refs, userMeta };
    } else {
      const images = [];
      for (const [kind, ref] of [['face', refs.face], ['body', refs.body], ...refs.garments.map(ref => ['garment', ref])]) {
        images.push({ kind, dataUrl: await imageData(id, ref) });
      }
      analysis = await metaClient(env).analyze({ images, photos: refs, userMeta });
    }
    analysis.inputVersion = input.inputVersion || randomUUID();
    analysis.analysisId = randomUUID();
    analysis.schemaVersion = 2;
    analysis.profileVersion = user.profile?.version || 0;
    analysis.visualVersion = user.profile?.visualVersion || 0;
    const saved = await repo.updateAnalysisVersioned(id, {
      expectedProfileVersion: user.profile?.version || 0,
      expectedInputVersion: input.inputVersion || '',
      analysis
    });
    if (!saved) throw new PersonalError('Las fotos han cambiado. Vuelve a analizar.', 409);
    return { analysis: saved.analysis };
  }

  async function visual(id, payload, env, kind) {
    const user = await findUser(id);
    const a = user.analysis;
    if (a?.source !== 'meta' || !a.analyzedAt) {
      throw new PersonalError('Completa primero el análisis con Meta AI.', 409);
    }
    const client = metaClient(env);
    if (kind === 'segment') {
      const regions = {
        skin_base: ['face', 'face skin'], eyes_canvas: ['face', 'eyes'], upper_eyelid: ['face', 'upper eyelid'],
        cheeks: ['face', 'cheeks'], lips: ['face', 'lips'],
        torso_upper: ['body', 'upper body clothing'], torso_lower: ['body', 'lower body clothing']
      };
      const region = payload.region;
      if (!Object.hasOwn(regions, region)) throw new PersonalError('Zona no válida.');
      const [photo, concept] = regions[region];
      const matches = await client.segment(await imageData(id, a.photos[photo]), concept);
      // Reemplazo por zona conservando las demás: se recalcula en JS y se
      // escribe con el mismo control de versión que el resto del análisis.
      const segments = [...(a.segments ?? []).filter(segment => segment.region !== region), { region, matches }];
      const saved = await repo.updateAnalysisJsonVersioned(id, {
        inputVersion: a.inputVersion,
        analyzedAt: a.analyzedAt,
        analysis: { ...a, segments }
      });
      if (!saved) throw new PersonalError('El análisis cambió. Reintenta.', 409);
      return { segment: { region, matches }, analysis: saved.analysis };
    }
    const target = payload.kind;
    if (!['makeup', 'outfit'].includes(target)) throw new PersonalError('Vista no válida.');
    const inputs = [await imageData(id, a.photos[target === 'makeup' ? 'face' : 'body'])];
    if (target === 'outfit') for (const ref of a.photos.garments ?? []) inputs.push(await imageData(id, ref));
    const prompt = a.agenticInstructions?.[target + 'Prompt'];
    if (!prompt) throw new PersonalError('Faltan instrucciones visuales. Repite el análisis.', 409);
    const generated = decodePhoto(await client.preview(inputs, prompt), 10 * 1024 * 1024);
    const ref = await storeImage(id, 'generated-' + target, generated);
    const saved = await repo.updateAnalysisJsonVersioned(id, {
      inputVersion: a.inputVersion,
      analyzedAt: a.analyzedAt,
      analysis: { ...a, previews: { ...(a.previews ?? {}), [target]: ref } }
    });
    if (!saved) throw new PersonalError('El análisis cambió. Reintenta.', 409);
    return { preview: ref, analysis: saved.analysis };
  }

  return { savePhotos, analyze, findUser, visual };
}

// PUT finaliza únicamente resultados ligados a las fotos de esta cuenta.
// El servidor vuelve a calcular el mock: el cliente no puede inventar referencias.
export function analysisForProfile(user, candidate) {
  const photos = user.analysis?.photos;
  if (!candidate || !photos?.face || !photos?.body
    || candidate.photos?.face !== photos.face || candidate.photos?.body !== photos.body) {
    throw new PersonalError('El análisis debe corresponder a las fotos guardadas en tu cuenta.');
  }
  if (user.analysis.source === 'meta') return user.analysis;
  // El mock se recalcula en el servidor (el cliente no fabrica resultados),
  // conservando los metadatos ya guardados: fotos con prendas, userMeta e inputVersion.
  const stored = user.analysis;
  const analyzedAt = typeof stored.analyzedAt === 'string'
    ? stored.analyzedAt
    : stored.analyzedAt?.toISOString?.();
  return {
    ...analyzeSimulated({ photos, user, analyzedAt }),
    photos: { face: photos.face, body: photos.body, garments: [...(photos.garments ?? [])] },
    userMeta: stored.userMeta,
    inputVersion: stored.inputVersion || ''
  };
}

export function cleanPrefs(body) {
  const goals = new Set(['saber_colores', 'compras', 'maquillaje']);
  const styles = new Set(['Elegante', 'Minimalista', 'Natural']);
  return {
    goals: Array.isArray(body.goals) ? [...new Set(body.goals.filter(g => goals.has(g)))] : [],
    jewelry: ['dorado', 'plateado', 'ambos'].includes(body.jewelry) ? body.jewelry : '',
    styles: Array.isArray(body.styles) ? [...new Set(body.styles.filter(s => styles.has(s)))] : []
  };
}
