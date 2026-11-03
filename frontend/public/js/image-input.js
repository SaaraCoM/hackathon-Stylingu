async function preparePhotoFile(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('Usa PNG, JPEG o WebP de hasta 8 MB.');
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let value;
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error('Usa una foto de hasta 20 megapíxeles.');
    const ratio = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la foto.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    value = canvas.toDataURL('image/jpeg', 0.82);
    if (value.length * 0.75 > 2 * 1024 * 1024) value = canvas.toDataURL('image/jpeg', 0.65);
    if (value.length * 0.75 > 2 * 1024 * 1024) throw new Error('La foto preparada sigue siendo demasiado grande. Elige otra.');
  } finally { bitmap.close(); }
  return value;
}
