/* account.js — registro/login/logout contra /api/auth con cookie http-only.
 * Estado de sesión en memoria (nunca en localStorage): la cookie la guarda
 * el navegador. Al entrar, el armario se recarga desde la cuenta.
 */

// var, no let: wardrobe.js lo lee como global para etiquetar el armario
// (allí se protege con typeof porque este archivo corre después).
var currentUser = null;

const accountModal = document.getElementById("accountModal");
const accountState = document.getElementById("accountState");
const accountForm = document.getElementById("accountForm");
const accountOut = document.getElementById("accountOut");
const accountError = document.getElementById("accountError");
const accountPrefs = document.getElementById("accountPrefs");
let accountLastFocus = null;

async function api(path, opts) {
  const res = await apiFetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `backend ${res.status}`);
  return body;
}

function renderAccount() {
  const logged = !!currentUser;
  accountForm.hidden = logged;
  accountOut.hidden = !logged;
  if (accountPrefs) accountPrefs.hidden = !logged;
  accountError.hidden = true;
  if (logged) renderPrefs();
  document.getElementById("accountBtn").textContent = "Mi perfil";
  accountState.textContent = logged
    ? `Sesión de ${currentUser.name}. Tu armario es solo tuyo.`
    : "Entra o crea tu cuenta para guardar tus fotos y completar el análisis.";
  const heroMode = document.getElementById("heroMode");
  if (heroMode) {
    heroMode.textContent = logged
      ? "Cuenta activa · armario propio"
      : "Modo local · este dispositivo";
  }
  if (logged) {
    onboardSheet.hidden = true;
    personalizeHero(currentUser.name);
  }
}

function openAccount() {
  accountLastFocus = document.activeElement;
  const birth = document.getElementById("accountBirthDate");
  if (birth) {
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - 16);
    const pad = (n) => String(n).padStart(2, "0");
    birth.max = `${limit.getFullYear()}-${pad(limit.getMonth() + 1)}-${pad(limit.getDate())}`;
    birth.min = "1900-01-01";
  }
  renderAccount();
  if(currentUser && typeof loadPersonal==='function')loadPersonal();
  accountModal.classList.add("open");
  document.getElementById("appShell").inert=true;document.getElementById("analysisGate").inert=true;
  (currentUser ? document.getElementById("logoutBtn") : document.getElementById("accountEmail")).focus();
}

function closeAccount() {
  accountModal.classList.remove("open");
  document.getElementById("appShell").inert=false;document.getElementById("analysisGate").inert=false;
  if (accountLastFocus && accountLastFocus.focus) accountLastFocus.focus();
}

async function refreshSession() {
  if (localStorage.getItem("stylingu-session-locked") === "1") { currentUser=null;store.setUser(null);return null; }
  try {
    const { user } = await api("/auth/yo");
    currentUser = user;
    store.setUser(user);
  } catch {
    currentUser = null;store.setUser(null);
    accessError = 'No se pudo comprobar tu cuenta. Revisa la conexión y reintenta.';
  }
  renderAccount();
  return currentUser;
}

async function loadRemoteOutfits() {
  const { items } = await api("/armario");
  writeJSON(STORE_KEYS.outfits, items);
  renderSaved();
}

/* --- Dossier: sincronía con la cuenta ---
 * Regla de conflicto simple: si la cuenta ya tiene gustos, manda la cuenta
 * (así un dispositivo nuevo recupera el dossier); si la cuenta está vacía,
 * sube el dossier local. Sin backend todo sigue en localStorage.
 */
async function pushProfile() {
  const p = store.getProfile();
  if (!p || !currentUser) return;
  await api("/auth/perfil", {
    method: "PUT",
    body: JSON.stringify({
      goals: p.goals || [],
      jewelry: p.jewelry || "",
      styles: p.styles || []
    })
  });
}

async function pullProfile() {
  try {
    const { preferences, analysis } = await api("/auth/perfil");
    store.applyAnalysis(analysis);
    const remote = preferences || {};
    const hasRemote = (remote.goals && remote.goals.length) || remote.jewelry ||
      (remote.styles && remote.styles.length);
    const local = store.getProfile();
    const hasLocal = local && ((local.goals && local.goals.length) || local.jewelry ||
      (local.styles && local.styles.length));
    if (hasRemote) {
      store.saveProfile({
        ...(local || { name: currentUser ? currentUser.name : "", at: new Date().toISOString() }),
        goals: remote.goals || [],
        jewelry: remote.jewelry || "",
        styles: remote.styles || []
      });
    } else { store.saveProfile({name:currentUser.name,goals:[],jewelry:"",styles:[]}); }
    renderDossier();
    renderPrefs();
    return true;
  } catch {
    store.applyAnalysis(null);
    accessError = 'No se pudo recuperar tu análisis. Revisa la conexión y reintenta.';
    return false;
  }
}

function renderPrefs() {
  if (!accountPrefs) return;
  const p = store.getProfile() || {};
  const goals = Array.isArray(p.goals) ? p.goals : [];
  const styles = Array.isArray(p.styles) ? p.styles : [];
  document.querySelectorAll("[data-pgoal]").forEach((b) =>
    b.setAttribute("aria-pressed", String(goals.includes(b.dataset.pgoal))));
  document.querySelectorAll("[data-pstyle]").forEach((b) =>
    b.setAttribute("aria-pressed", String(styles.includes(b.dataset.pstyle))));
  document.querySelectorAll("[data-pjewelry]").forEach((b) =>
    b.setAttribute("aria-pressed", String(p.jewelry === b.dataset.pjewelry)));
}

function readPrefs() {
  const collect = (sel, key) => [...document.querySelectorAll(sel)]
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.dataset[key]);
  return {
    goals: collect("[data-pgoal]", "pgoal"),
    jewelry: collect("[data-pjewelry]", "pjewelry")[0] || "",
    styles: collect("[data-pstyle]", "pstyle")
  };
}

// Edad cumplida en la fecha local. Devuelve null si la fecha no existe.
function ageFromBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDelta = today.getMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

async function submitAuth(path, registration={}) {
  accountError.hidden = true;
  const name = document.getElementById("accountName").value.trim().slice(0, 60);
  const email = document.getElementById("accountEmail").value.trim();
  const password = document.getElementById("accountPassword").value;
  const birthDate = document.getElementById("accountBirthDate").value;
  if (path === "/auth/registro" && !name) {
    accountError.textContent = "Escribe tu nombre para crear la cuenta.";
    accountError.hidden = false;
    return;
  }
  if (path === "/auth/registro") {
    const age = ageFromBirthDate(birthDate);
    if (age === null) {
      accountError.textContent = "Indica tu fecha de nacimiento para crear la cuenta.";
      accountError.hidden = false;
      return;
    }
    if (age < 16) {
      accountError.textContent = "Debes tener al menos 16 años para crear una cuenta.";
      accountError.hidden = false;
      return;
    }
  }
  if (!email || !password) {
    accountError.textContent = "Email y contraseña son requeridos.";
    accountError.hidden = false;
    return;
  }
  try {
    accessChecking = true;
    accessError = '';
    renderAccess();
    const body = path === "/auth/registro"
      ? { name, email, password, birthDate, ...registration }
      : { email, password };
    const { user } = await api(path, { method: "POST", body: JSON.stringify(body) });
    currentUser = user;
    store.setUser(user);
    localStorage.removeItem("stylingu-session-locked");
    clearConsultation();
    store.applyAnalysis(null);
    document.getElementById("accountPassword").value = "";
    document.getElementById("accountBirthDate").value = "";
    renderAccount();
    toast(`Hola, ${user.name}. Comprobando tu análisis…`);
    await pullProfile();
    if (store.getAnalysis()) try {
      await loadRemoteOutfits();
      toast(`Armario de ${user.name} listo.`);
    } catch {
      toast("Sesión lista. Tu armario sigue en local.");
    }
    closeAccount();
    if(path!=='/auth/registro' && !accessError && (consultationPending || !store.getAnalysis())) showConsultation();
    return true;
  } catch (err) {
    accountError.textContent = err.message;
    accountError.hidden = false;
  } finally {
    accessChecking = false;
    renderAccess();
  }
}

document.getElementById("accountBtn").addEventListener("click", openAccount);
document.getElementById("closeAccountBtn").addEventListener("click", closeAccount);
document.getElementById("closeAccountBtn2").addEventListener("click", closeAccount);
accountModal.addEventListener("click", (e) => { if (e.target === accountModal) closeAccount(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && accountModal.classList.contains("open")) closeAccount();
});
document.getElementById("loginBtn").addEventListener("click", () => submitAuth("/auth/login"));
document.getElementById("registerBtn").addEventListener("click", () => openJourney());

// Edición del dossier desde Mi cuenta (chips con aria-pressed).
document.querySelectorAll("[data-pgoal]").forEach((b) => b.addEventListener("click", () => {
  b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
}));
document.querySelectorAll("[data-pjewelry]").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("[data-pjewelry]").forEach((x) => x.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
}));
document.querySelectorAll("[data-pstyle]").forEach((b) => b.addEventListener("click", () => {
  b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
}));
document.getElementById("savePrefsBtn").addEventListener("click", async () => {
  const prefs = readPrefs();
  const local = store.getProfile() || {
    name: currentUser ? currentUser.name : "",
    at: new Date().toISOString()
  };
  store.saveProfile({ ...local, ...prefs });
  renderDossier();
  try {
    await pushProfile();
    toast("Dossier guardado en tu cuenta.");
  } catch {
    toast("Dossier guardado en local (sin conexión a tu cuenta).");
  }
});
document.getElementById("logoutBtn").addEventListener("click", async () => {
  let revoked=false;
  try { await api('/auth/logout',{method:'POST',body:'{}'});revoked=true; } catch {}
  localStorage.setItem('stylingu-session-locked','1');
  currentUser=null;store.setUser(null);accessError='';store.applyAnalysis(null);clearConsultation();renderAccount();closeAccount();
  const message=revoked?'Sesión revocada y datos ocultos.':'Datos ocultos en este dispositivo. No se pudo revocar la sesión del servidor; vuelve a entrar y reintenta cerrar sesión.';
  toast(message);document.getElementById('gateStatus').textContent=message;document.getElementById('gateContinueBtn').focus();
});

async function restoreAccount() {
  accessChecking = true;
  accessError = '';
  renderAccess();
  const user = await refreshSession();
  if (user) await pullProfile();
  else store.applyAnalysis(null);
  accessChecking = false;
  renderAccess();
  if (store.getAnalysis() && user) loadRemoteOutfits().catch(() => {});
}
restoreAccount();
