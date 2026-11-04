/* Editorial copy for the shell. All personal data still comes from the saved analysis. */
const designViews = {
  'tab-color': {
    kicker: '01 / Colorimetría',
    title: a => a?.colorimetry?.season ? `Hoy, ${a.colorimetry.season.toLocaleLowerCase('es')} muy tú.` : 'Hoy, tu paleta muy tú.',
    description: 'Tu guía de color: estación, subtono y contraste leídos en tus fotos. Úsala para elegir ropa, maquillaje y accesorios.'
  },
  'tab-makeup': {
    kicker: '02 / Maquillaje',
    title: () => 'Hoy, tu rostro en primer plano.',
    description: 'Tus tonos y pasos de maquillaje, con un probador orientativo sobre tu foto.'
  },
  'tab-armario': {
    kicker: '03 / Armario',
    title: () => 'Hoy, lo que ya es tuyo.',
    description: 'Tu semana con las prendas que ya tienes, el conjunto de hoy y las propuestas externas del análisis.'
  },
  'tab-compras': {
    kicker: '04 / Compras',
    title: () => 'Hoy, elegir con criterio.',
    description: 'Escanea un producto, confirma el tono y consulta su afinidad con tu paleta antes de comprar.'
  }
};

function renderDesign(view) {
  const active = view || document.querySelector('.tab.active')?.id || 'tab-color';
  const copy = designViews[active] || designViews['tab-color'];
  const a = store.getAnalysis();

  document.getElementById('viewKicker').textContent = copy.kicker;
  document.getElementById('viewTitle').textContent = copy.title(a);
  document.getElementById('viewDescription').textContent = copy.description;

  document.querySelectorAll('[data-analysis-photo]').forEach(img => {
    const ref = a?.photos?.[img.dataset.analysisPhoto];
    if (ref && /^\/api\/personal\/photos\/[a-f0-9]{64}$/.test(ref)) {
      if (img.getAttribute('src') !== API + ref) img.setAttribute('src', API + ref);
    } else img.removeAttribute('src');
  });

  document.querySelectorAll('[data-analysis-palette]').forEach(box => {
    box.replaceChildren();
    for (const hex of a?.colorimetry?.palette || []) {
      if (!/^#[a-f0-9]{6}$/i.test(hex)) continue;
      const dot = document.createElement('span');
      dot.style.backgroundColor = hex;
      dot.title = hex;
      box.appendChild(dot);
    }
  });

  const lip = document.getElementById('lookColorPreview');
  const blush = document.getElementById('lookBlushPreview');
  const lipHex = a?.makeup?.lipHex;
  const blushHex = a?.makeup?.blushHex;
  if (lip) lip.style.background = /^#[a-f0-9]{6}$/i.test(lipHex || '') ? lipHex : '';
  if (blush) blush.style.background = /^#[a-f0-9]{6}$/i.test(blushHex || '') ? blushHex : '';

  if (!a) return;

  const c = a.colorimetry;
  const m = a.makeup;
  const fields = {
    seasonName: c.season,
    photoSeason: c.season + ' · ' + originLabel(a),
    paletteCount: c.palette.length + ' tonos',
    metricContrast: c.contrast,
    metricTemperature: c.temperature,
    metricChroma: c.chroma,
    faceShape: m.faceShape,
    eyeShape: m.eyeShape,
    eyelinerType: m.eyelinerType,
    shadowPlacement: m.shadowPlacement,
    outfitStyle: a.outfit.style,
    fitSeason: c.season,
    fitTemperature: c.temperature,
    fitContrast: c.contrast,
    fitPalette: c.palette.length + ' tonos'
  };
  for (const [id, value] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
  const link = document.createElement('a');
  link.href = url;
  link.download = 'stylingu-dossier.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Dossier exportado · ' + originLabel(analysis));
});
