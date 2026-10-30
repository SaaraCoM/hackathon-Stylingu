import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSimulated as backend, FACE_SHAPES, EYE_SHAPES } from '../backend/src/analysis.js';
import { analyzeSimulated as shared } from '../shared/analysis.js';
import { decodePhoto, analysisForProfile } from '../shared/personal-service.js';
const input = { user: { name: 'Prueba', email: 'test@example.test' }, photos: { face: '/api/personal/photos/a', body: '/api/personal/photos/b' }, analyzedAt: '2026-10-27T00:00:00.000Z' };
test('la función determinista compartida se ejecuta igual en backend', () => {
  assert.equal(backend, shared);
  assert.deepEqual(backend(input), shared(input));
  assert.deepEqual(backend(input), backend(input));
  assert.notDeepEqual(backend(input), backend({ ...input, photos: { ...input.photos, body: 'different' } }));
});
test('contrato completo, vocabulario y paleta sin duplicados', () => {
  const a = backend(input);
  assert.equal(a.source, 'mock');
  assert.ok(FACE_SHAPES.includes(a.makeup.faceShape));
  assert.ok(EYE_SHAPES.includes(a.makeup.eyeShape));
  for (const key of ['eyelinerType','shadowPlacement','blushPlacement']) assert.ok(a.makeup[key]);
  assert.ok(a.outfit.style && a.outfit.silhouette);
  assert.ok(a.colorimetry.avoid.length);
  assert.equal(new Set(a.colorimetry.palette).size, a.colorimetry.palette.length);
  assert.ok(a.colorimetry.palette.every(hex => /^#[0-9A-F]{6}$/.test(hex)));
});
test('rechaza blob URLs, SVG, bytes falsos, tipos incorrectos e imágenes excesivas', () => {
  for (const bad of ['blob:http://localhost/x', 'https://external/photo.jpg', {}, '', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,YWJjZA==']) assert.throws(() => decodePhoto(bad));
  assert.throws(() => decodePhoto('data:image/png;base64,' + Buffer.alloc(2 * 1024 * 1024 + 1).toString('base64')), e => e.status === 413);
});
test('PUT no admite referencias ajenas y recalcula resultados del servidor', () => {
  const user = { ...input.user, analysis: { photos: input.photos, analyzedAt: new Date(input.analyzedAt) } };
  assert.throws(() => analysisForProfile(user, { photos: { face: 'foreign', body: 'foreign' } }));
  // El servidor recalcula el contenido (la inyección del cliente se ignora)
  // y conserva los metadatos ya guardados: fotos con prendas, userMeta e inputVersion.
  assert.deepEqual(analysisForProfile(user, { photos: input.photos, makeup: { faceShape: '<script>' } }), { ...backend(input), photos: { face: input.photos.face, body: input.photos.body, garments: [] }, userMeta: undefined, inputVersion: '' });
});
