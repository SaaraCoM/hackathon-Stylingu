/* Adaptación visual de Figma: datos dinámicos siempre desde el análisis guardado. */
const designViews = {
  'tab-color': ['Diagnóstico Cromático de Alta Fidelidad', 'Tu guía de colores personalizada basada en tu estación, subtono y proporciones faciales.'],
  'tab-makeup': ['Arquitectura de Rostro & Maquillaje', 'Técnicas de delineado, mapeo de maquillaje y guía de tonos, elevadas a la precisión de la IA y la belleza sensorial.'],
  'tab-armario': ['Vestuario & Armario Virtual', 'Tu guardarropa real con prendas analizadas por IA y los estilos más completos con recomendaciones inteligentes.'],
  'tab-compras': ['Tu Asesor de Imagen en Tiempo Real', 'Sube una foto y la IA descompone tus proporciones, contrastes y armonía para recomendar estilos y visuales de moda.']
};
function renderDesign(view) {
  const active = view || document.querySelector('.tab.active')?.id || 'tab-color';
  const [title, description] = designViews[active] || designViews['tab-color'];
  document.getElementById('viewTitle').textContent = title;
  document.getElementById('viewDescription').textContent = description;
  const a = store.getAnalysis();
  document.querySelectorAll('[data-analysis-photo]').forEach(img => {
    const ref = a?.photos[img.dataset.analysisPhoto];
    if (ref && /^\/api\/personal\/photos\/[a-f0-9]{64}$/.test(ref)) {
      if (img.getAttribute('src') !== API + ref) img.setAttribute('src', API + ref);
    } else img.removeAttribute('src');
  });
  document.querySelectorAll('[data-analysis-palette]').forEach(box => {
    box.replaceChildren();
    for (const hex of a?.colorimetry.palette || []) {
      if (!/^#[a-f0-9]{6}$/i.test(hex)) continue;
      const dot = document.createElement('span'); dot.style.backgroundColor = hex;
      dot.title = hex; box.appendChild(dot);
    }
  });
  if (!a) return;
  const c = a.colorimetry, m = a.makeup;
  const fields = {
    seasonName: c.season, photoSeason: c.season + ' · Simulación',
    paletteCount: c.palette.length + ' tonos', metricContrast: c.contrast,
    metricTemperature: c.temperature, metricChroma: c.chroma,
    faceShape: m.faceShape, eyeShape: m.eyeShape, eyelinerType: m.eyelinerType,
    shadowPlacement: m.shadowPlacement, outfitStyle: a.outfit.style
  };
  for (const [id, value] of Object.entries(fields)) document.getElementById(id).textContent = value;
  if (/^#[a-f0-9]{6}$/i.test(m.lipHex) && /^#[a-f0-9]{6}$/i.test(m.blushHex)) {
    document.getElementById('lookColorPreview').style.background = `linear-gradient(110deg, ${m.lipHex}, ${m.blushHex})`;
  }
}
document.querySelectorAll('[data-open-consult]').forEach(button => {
  button.addEventListener('click', () => showConsultation());
});
document.getElementById('exportAnalysisBtn').addEventListener('click', () => {
  const analysis = store.getAnalysis();
  if (!analysis) return;
  const blob = new Blob([JSON.stringify({ ...analysis, photos: undefined }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'stylingu-dossier.json';
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Dossier exportado. Resultado simulado de tu cuenta.');
});
