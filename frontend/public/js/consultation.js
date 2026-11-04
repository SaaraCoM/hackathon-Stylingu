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
let analysisAbort=null;
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
  consultationState.textContent = currentUser ? 'Tus fotos se guardan en tu cuenta. Comprobando el proveedor…' : 'Selecciona tus fotos e inicia sesión para guardarlas y analizarlas.';
  consultationAccountBtn.hidden = !!currentUser;
  analyzeBtn.disabled = !currentUser;
  document.getElementById('photoConsent').checked=false;
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
  if(currentUser) api('/personal/capabilities').then(c=>{consultationState.textContent=c.configured?(c.provider==='mock'?'Modo demostración: el resultado será simulado.':'Proveedor Meta configurado. El acceso efectivo se comprueba al analizar.'):'Proveedor no configurado. No se generará un resultado simulado.';analyzeBtn.disabled=!c.configured;}).catch(e=>showConsultationError(e.message));
  if(currentUser && store.getJob()?.id && !consultationBusy) resumeAnalysisJob(store.getJob().id);
}
function hideConsultation() {
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
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      showConsultationError('Usa PNG, JPEG o WebP de hasta 8 MB por foto.'); return;
    }
    try {
      const value = await preparePhotoFile(file, key);
      if (input.files?.[0] !== file) return;
      photoValues[key] = value; preview.src = value; preview.hidden = false;
      consultationError.hidden = true;
    } catch (err) { showConsultationError(err.message); }
  });
}
function renderAnalysis(analysis) {
  resultsSection.replaceChildren(); resultsSection.hidden = false;
  const title = document.createElement('h3'); title.textContent = 'Tu análisis está guardado · '+originLabel(analysis); resultsSection.appendChild(title);
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
async function resumeAnalysisJob(id) {
 if(consultationBusy)return;
 consultationBusy=true;analyzeBtn.disabled=true;
 const epoch=accountEpoch;
 try {
  for(let poll=0;poll<240;poll++) {
   if(analysisAbort?.signal.aborted)throw new Error('Consulta cancelada. El trabajo guardado se puede retomar.');
   const job=await api('/jobs/'+id,{signal:analysisAbort?.signal});
   if(epoch!==accountEpoch)return;
   if(job.state==='completed') {
    const analysis=job.result?.analysis;
    if(!hasCompleteAnalysis(analysis))throw new Error('El análisis está incompleto.');
    // Fetch the current profile result: an older completed job must not overwrite newer input.
    const latest=await api('/personal/analysis');
    store.applyAnalysis(latest.analysis);if(hasCompleteAnalysis(latest.analysis))renderAnalysis(latest.analysis);
    store.saveJob(null);consultationState.textContent='Resultado guardado en tu cuenta.';return;
   }
   if(['failed','uncertain'].includes(job.state)){store.saveJob(null);throw new Error(job.error?.message||'No se pudo completar el análisis.');}
   consultationState.textContent=job.state==='queued'?'Análisis en cola. Puedes cerrar esta ventana y volver después.':'Analizando tus fotos. Conservamos el resultado anterior.';
   await new Promise(resolve=>setTimeout(resolve,2000));if(epoch!==accountEpoch)return;
  }
  consultationState.textContent='El trabajo sigue pendiente. Vuelve a abrir la consulta para comprobarlo.';
 } catch(e){showConsultationError(e.message);}finally{consultationBusy=false;analyzeBtn.disabled=!currentUser;analyzeBtn.textContent='Analizar fotos';}
}
analyzeBtn.addEventListener('click',async()=>{
 if(consultationBusy)return;
 if(!document.getElementById('photoConsent').checked){showConsultationError('Confirma el envío a Meta antes de analizar tus fotos.');return;}
 if(!currentUser){showConsultationError('Inicia sesión para guardar tu análisis.');return;}
 const previous=store.getJob();if(previous?.id){resumeAnalysisJob(previous.id);return;}
 if((!photoValues.face||!photoValues.body)&&!store.getAnalysis()){showConsultationError('Sube una foto de cara y otra de cuerpo.');return;}
 if(!!photoValues.face!==!!photoValues.body){showConsultationError('Selecciona ambas fotos para sustituirlas.');return;}
 analysisAbort=new AbortController();requestScreen.controllers.add(analysisAbort);
 const releaseLoading=requestScreen.begin('Preparando tus fotos y tu análisis. Puede tardar hasta dos minutos…');
 consultationBusy=true;analyzeBtn.disabled=true;consultationError.hidden=true;
 try {
  if(photoValues.face&&photoValues.body){consultationState.textContent='Normalizando y guardando fotos…';await api('/personal/photos',{method:'POST',body:JSON.stringify(photoValues)});}
  const userMeta={};
  const key=previous?.key||crypto.randomUUID();store.saveJob({key});
  const job=await api('/personal/analysis-jobs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({userMeta})});
  store.saveJob({key,id:job.id});consultationBusy=false;await resumeAnalysisJob(job.id);
 } catch(e){consultationState.textContent='No se ha completado la solicitud; el resultado anterior se conserva.';showConsultationError(e.message);}
 finally{requestScreen.controllers.delete(analysisAbort);analysisAbort=null;releaseLoading();consultationBusy=false;analyzeBtn.disabled=!currentUser;}
});
consultationAccountBtn.addEventListener('click', () => { hideConsultation(); consultationPending = true; openAccount(); });
document.getElementById('openConsultBtn').addEventListener('click', ()=>{closeAccount();showConsultation();});
document.getElementById('closeConsultationBtn').addEventListener('click', hideConsultation);
consultationModal.addEventListener('click', e => { if (e.target === consultationModal) hideConsultation(); });
consultationModal.addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); hideConsultation(); }
  if (e.key === 'Tab') {
    const elements = [...consultationModal.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(el => el.getClientRects().length);
    const first = elements[0], last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
