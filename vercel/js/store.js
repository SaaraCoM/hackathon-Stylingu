/* store.js — único dueño de los datos.
 * Dataset de solo lectura (window.STYLINGU_DATA) y acceso a localStorage
 * con claves centralizadas. Un valor corrupto vuelve al estado vacío
 * en vez de romper la UI. Ningún otro módulo toca localStorage directo.
 */
const D = window.STYLINGU_DATA;

const STORE_KEYS = {
  profile: "stylingu-profile",
  palette: "stylingu-palette",
  outfits: "stylingu-outfits"
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const val = JSON.parse(raw);
    return Array.isArray(fallback) ? (Array.isArray(val) ? val : fallback) : val;
  } catch {
    return fallback;
  }
}

function writeJSON(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    toast("No se pudo guardar en local.");
  }
}

// Por defecto cada runtime sirve la SPA y su API en el mismo origen.
const API = window.STYLINGU_API_BASE || '';
async function apiFetch(path, opts) {
  return fetch(API + '/api' + path, { credentials: 'include', signal: AbortSignal.timeout(30000), ...opts });
}
const exampleData = JSON.parse(JSON.stringify(D));
let accountAnalysis = null;
function hasCompleteAnalysis(a) {
  return !!(a?.analyzedAt && Number.isFinite(Date.parse(a.analyzedAt)) &&
    a.photos?.face && a.photos?.body && a.colorimetry?.season &&
    Array.isArray(a.colorimetry.palette) && a.colorimetry.palette.length &&
    Array.isArray(a.colorimetry.avoid) &&
    ['faceShape', 'eyeShape', 'eyelinerType', 'shadowPlacement', 'blushPlacement'].every(key => a.makeup?.[key]) &&
    a.outfit?.style && a.outfit?.silhouette);
}
function applyAnalysis(analysis) {
  accountAnalysis = hasCompleteAnalysis(analysis) ? analysis : null;
  // Bloquear antes de renderizar también protege frente a resultados incompletos.
  document.getElementById('appShell').hidden = true;
  Object.assign(D, JSON.parse(JSON.stringify(exampleData)));
  if (accountAnalysis) {
    const { colorimetry: c, makeup: m, outfit: o } = analysis;
    D.palette = c.palette.map(hex => ({ hex, name: hex, harmony: c.harmony, desc: 'Tono del análisis simulado de tu cuenta.' }));
    D.avoid = c.avoid;
    D.silhouette = [{ name: o.style, note: o.silhouette }];
    D.lipsticks = [{ name: m.look, hex: m.lipHex, finish: 'Simulación', use: o.style }];
    D.blush = [{ name: m.blushPlacement, hex: m.blushHex, texture: 'Simulación' }];
    for (const key of Object.keys(D.looks)) D.looks[key] = { badge: m.look, title: m.eyelinerType, desc: 'Rostro: ' + m.faceShape + ' · Ojos: ' + m.eyeShape + ' · Sombras: ' + m.shadowPlacement + ' · Colorete: ' + m.blushPlacement };
    D.eyes = c.palette.slice(0,4).map(hex => ({ hex, name: hex, role: m.shadowPlacement }));
  }
  renderPalette(); renderAvoid(); renderSilhouette(); renderProducts(); renderLooks(); renderCompras();
  selectLook('diario', document.querySelector('[data-look="diario"]'));
  const c = accountAnalysis?.colorimetry;
  document.getElementById('analysisSummary').textContent = c ? c.season + ' · Simulación guardada' : 'Dossier de ejemplo · Sin análisis';
  document.getElementById('seasonSummary').textContent = c ? c.season + ' · ' + c.palette.length + ' tonos · Simulación' : 'Otoño Cálido Suave · Paleta de ejemplo';
  document.getElementById('outfitSummary').textContent = accountAnalysis ? accountAnalysis.outfit.style + ' · ' + accountAnalysis.outfit.silhouette + ' · Simulación' : 'Siluetas de ejemplo';
  document.getElementById('colorSummary').textContent = c ? 'Subtono: ' + c.temperature + ' · Contraste: ' + c.contrast + ' · Croma: ' + c.chroma : 'Subtono cálido · Contraste medio-bajo · Ejemplo';
  if (currentUser) personalizeHero(currentUser.name);
  if (typeof renderDesign === 'function') renderDesign();
  renderAccess();
}

async function saveOutfitRemote(outfit) {
  const res = await apiFetch("/armario", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(outfit)
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  return res.json();
}

const store = {
  getAnalysis: () => accountAnalysis,
  applyAnalysis,
  getProfile: () => readJSON(STORE_KEYS.profile, null),
  saveProfile: (profile) => writeJSON(STORE_KEYS.profile, profile),
  getPalette: () => readJSON(STORE_KEYS.palette, null),
  savePalette: () => writeJSON(STORE_KEYS.palette, D.palette),
  getOutfits: () => readJSON(STORE_KEYS.outfits, []),
  addOutfit: (outfit) => {
    const all = readJSON(STORE_KEYS.outfits, []);
    all.push(outfit);
    writeJSON(STORE_KEYS.outfits, all);
    return all;
  },
};
