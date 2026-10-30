/* Consulta conectada: nunca fabrica éxito si la API falla. */
const consultationModal = document.getElementById('consultationModal');
const consultationState = document.getElementById('consultationState');
const consultationError = document.getElementById('consultationError');
const resultsSection = document.getElementById('consultationResults');
const analyzeBtn = document.getElementById('analyzeBtn');
const consultationAccountBtn = document.getElementById('consultationAccountBtn');
let consultationPending = false;
let consultationLastFocus;
let consultationBusy = false;
const photoValues = { face: null, body: null };

function clearConsultation() {
  for (const key of ['face', 'body']) {
    document.getElementById(key + 'Input').value = '';
    const preview = document.getElementById(key + 'Preview');
    preview.removeAttribute('src'); preview.hidden = true;
    photoValues[key] = null;
  }
  resultsSection.replaceChildren(); resultsSection.hidden = true;
}
function showConsultation() {
  consultationPending = false;
  consultationLastFocus = document.activeElement;
  consultationModal.hidden = false;
  consultationModal.classList.add('open');
  consultationError.hidden = true;
  consultationState.textContent = currentUser ? 'Tus fotos se guardan en tu cuenta. Resultado simulado.' : 'Selecciona tus fotos e inicia sesión para guardarlas y analizarlas.';
  consultationAccountBtn.hidden = !!currentUser;
  analyzeBtn.disabled = !currentUser;
  const saved = store.getAnalysis();
  if (saved) {
    renderAnalysis(saved);
    for (const key of ['face', 'body']) {
      if (!photoValues[key] && /^\/api\/personal\/photos\/[a-f0-9]{64}$/.test(saved.photos[key])) {
        const preview = document.getElementById(key + 'Preview');
        preview.src = API + saved.photos[key]; preview.hidden = false;
      }
    }
  }
  else { resultsSection.hidden = true; resultsSection.replaceChildren(); }
  document.getElementById('faceInput').focus();
}
function hideConsultation() {
  if (consultationBusy) return;
  consultationModal.classList.remove('open'); consultationModal.hidden = true;
  if (!store.getAnalysis()) document.getElementById('gateContinueBtn').focus();
  else consultationLastFocus?.focus();
}
function showConsultationError(message) {
  consultationError.textContent = message; consultationError.hidden = false;
}
for (const key of ['face', 'body']) {
  const input = document.getElementById(key + 'Input');
  input.addEventListener('change', async () => {
    photoValues[key] = null;
    const preview = document.getElementById(key + 'Preview');
    preview.hidden = true; preview.removeAttribute('src');
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showConsultationError('Usa PNG, JPEG o WebP de hasta 2 MB por foto.'); return;
    }
    try {
      const value = await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo leer la foto.')); reader.readAsDataURL(file);
      });
      if (input.files?.[0] !== file) return;
      photoValues[key] = value; preview.src = value; preview.hidden = false;
      consultationError.hidden = true;
    } catch (err) { showConsultationError(err.message); }
  });
}
function renderAnalysis(analysis) {
  resultsSection.replaceChildren(); resultsSection.hidden = false;
  const title = document.createElement('h3'); title.textContent = 'Tu análisis está guardado · Simulación'; resultsSection.appendChild(title);
  const c = analysis.colorimetry, m = analysis.makeup, o = analysis.outfit;
  const groups = [
    ['Colorimetría', [['Temporada', c.season], ['Subtono', c.temperature], ['Paleta', c.palette.join(' · ')], ['Colores a evitar', c.avoid.map(a => a.name + ' ' + a.hex).join(' · ')]]],
    ['Maquillaje', [['Forma de rostro', m.faceShape], ['Forma de ojo', m.eyeShape], ['Delineado', m.eyelinerType], ['Sombras', m.shadowPlacement], ['Colorete', m.blushPlacement]]],
    ['Estilo de vestimenta', [['Estilo', o.style], ['Silueta', o.silhouette]]]
  ];
  for (const [heading, rows] of groups) {
    const card = document.createElement('section'); card.className = 'card';
    const h = document.createElement('h3'); h.textContent = heading; card.appendChild(h);
    for (const [label, value] of rows) {
      const p = document.createElement('p'); const strong = document.createElement('strong');
      strong.textContent = label + ': '; p.appendChild(strong); p.appendChild(document.createTextNode(value)); card.appendChild(p);
    }
    resultsSection.appendChild(card);
  }
  const done = document.createElement('button'); done.type = 'button'; done.className = 'btn primary';
  done.textContent = 'Ver mi dossier'; done.addEventListener('click', () => { hideConsultation(); switchTab('tab-color'); }); resultsSection.appendChild(done);
}
analyzeBtn.addEventListener('click', async () => {
  if (consultationBusy) return;
  if (!photoValues.face || !photoValues.body) { showConsultationError('Sube una foto de cara y otra de cuerpo.'); return; }
  if (!currentUser) { showConsultationError('Inicia sesión para guardar tu análisis.'); return; }
  consultationBusy = true; analyzeBtn.disabled = true; analyzeBtn.textContent = 'Analizando…';
  for (const key of ['face', 'body']) document.getElementById(key + 'Input').disabled = true;
  consultationError.hidden = true; resultsSection.hidden = true;
  try {
    consultationState.textContent = 'Guardando las dos fotos…';
    await api('/personal/photos', { method: 'POST', body: JSON.stringify(photoValues) });
    store.applyAnalysis(null);
    consultationState.textContent = 'Generando el análisis simulado…';
    const { analysis } = await api('/personal/analyze', { method: 'POST', body: '{}' });
    if (!hasCompleteAnalysis(analysis)) throw new Error('El análisis está incompleto. Vuelve a intentarlo.');
    store.applyAnalysis(analysis); renderAnalysis(analysis);
    consultationState.textContent = 'Fotos y análisis guardados en tu cuenta. Tu dossier está personalizado.';
    resultsSection.focus();
  } catch (err) {
    consultationState.textContent = 'No se ha completado el análisis. Puedes reintentarlo.';
    showConsultationError(err.message);
  } finally {
    consultationBusy = false; analyzeBtn.disabled = false; analyzeBtn.textContent = 'Analizar fotos';
    for (const key of ['face', 'body']) document.getElementById(key + 'Input').disabled = false;
  }
});
consultationAccountBtn.addEventListener('click', () => { hideConsultation(); consultationPending = true; openAccount(); });
document.getElementById('openConsultBtn').addEventListener('click', showConsultation);
document.getElementById('closeConsultationBtn').addEventListener('click', hideConsultation);
consultationModal.addEventListener('click', e => { if (e.target === consultationModal) hideConsultation(); });
consultationModal.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); hideConsultation(); }
  if (e.key === 'Tab') {
    const elements = [...consultationModal.querySelectorAll('button:not(:disabled), input:not(:disabled)')].filter(el => el.getClientRects().length);
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
