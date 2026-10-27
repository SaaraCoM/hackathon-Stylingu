/* store.js — único dueño de los datos.
 * Dataset de solo lectura (window.STYLINGU_DATA) y acceso a localStorage
 * con claves centralizadas. Un valor corrupto vuelve al estado vacío
 * en vez de romper la UI. Ningún otro módulo toca localStorage directo.
 */
const D = window.STYLINGU_DATA;

const STORE_KEYS = {
  profile: "stylingu-profile",
  palette: "stylingu-palette",
  outfits: "stylingu-outfits",
  checkins: "stylingu-checkins"
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

const API = location.protocol === "file:" ||
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : "";

async function apiFetch(path, opts) {
  return fetch(`${API}/api${path}`, { credentials: "include", ...opts });
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
  getCheckins: () => readJSON(STORE_KEYS.checkins, []),
  addCheckin: () => {
    const all = readJSON(STORE_KEYS.checkins, []);
    all.push({ at: new Date().toISOString() });
    writeJSON(STORE_KEYS.checkins, all);
    return all;
  }
};
