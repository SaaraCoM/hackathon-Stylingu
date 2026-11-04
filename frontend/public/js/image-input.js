const REQUIRED_FILE_VERSION = 'v2.0';
window.STYLINGU_FILE_SPEC = Object.freeze({
  version: REQUIRED_FILE_VERSION,
  schemaVersion: 2,
  badge: 'Archivo v2.0',
  label: 'Formato Dossier/Foto v2.0 · PNG/JPEG/WebP ≤ 8 MB · 20 MP',
  acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
  maxBytes: 8 * 1024 * 1024,
  maxPixels: 20000000
});

function normalizeCanvasLighting(context, width, height) {
  try {
    const frame = context.getImageData(0, 0, width, height);
    const data = frame.data;
    const step = Math.max(4, Math.floor(data.length / 4096) * 4);
    let sum = 0, min = 255, max = 0, count = 0;
    for (let i = 0; i < data.length; i += step) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      count += 1;
    }
    const mean = count ? sum / count : 128;
    const range = Math.max(48, max - min);
    const contrast = Math.min(1.14, Math.max(0.97, 212 / range));
    const shift = Math.max(-14, Math.min(18, (132 - mean) * 0.3));
    for (let i = 0; i < data.length; i += 4) {
      const r = (data[i] - 128) * contrast + 128 + shift + 3;
      const g = (data[i + 1] - 128) * contrast + 128 + shift + 1;
      const b = (data[i + 2] - 128) * contrast + 128 + shift - 1;
      data[i] = r < 0 ? 0 : r > 255 ? 255 : Math.round(r);
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : Math.round(g);
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : Math.round(b);
    }
    context.putImageData(frame, 0, 0);
  } catch {
    /* Canvas pixel access optional in restricted environments */
  }
}

async function preparePhotoFile(file, kind = 'general') {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw new Error('Usa PNG, JPEG o WebP de hasta 8 MB (Especificación ' + REQUIRED_FILE_VERSION + ').');
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let value;
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) {
      throw new Error('Usa una foto de hasta 20 megapíxeles (' + REQUIRED_FILE_VERSION + ').');
    }
    let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
    if (kind === 'face') {
      const targetAspect = 1;
      const currentAspect = bitmap.width / bitmap.height;
      if (currentAspect > targetAspect * 1.15) {
        sw = Math.max(1, Math.round(bitmap.height * targetAspect));
        sx = Math.max(0, Math.round((bitmap.width - sw) * 0.5));
      } else if (currentAspect < targetAspect * 0.85) {
        sh = Math.max(1, Math.round(bitmap.width / targetAspect));
        sy = Math.max(0, Math.round((bitmap.height - sh) * 0.35));
      }
    }
    const maxDim = kind === 'avatar' ? 512 : 1600;
    const ratio = Math.min(1, maxDim / sw, maxDim / sh);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * ratio));
    canvas.height = Math.max(1, Math.round(sh * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la foto.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#fbf6ef';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if (kind === 'face' || kind === 'avatar') {
      normalizeCanvasLighting(context, canvas.width, canvas.height);
    }
    value = canvas.toDataURL('image/jpeg', 0.84);
    if (value.length * 0.75 > 2 * 1024 * 1024) value = canvas.toDataURL('image/jpeg', 0.65);
    if (value.length * 0.75 > 2 * 1024 * 1024) throw new Error('La foto preparada sigue siendo demasiado grande. Elige otra.');
  } finally { bitmap.close(); }
  return value;
}
