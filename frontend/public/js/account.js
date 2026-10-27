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
  document.getElementById("accountBtn").textContent = logged ? currentUser.name : "Mi cuenta";
  accountState.textContent = logged
    ? `Sesión de ${currentUser.name}. Tu armario es solo tuyo.`
    : "Tu armario vive en este dispositivo.";
  const heroMode = document.getElementById("heroMode");
  if (heroMode) {
    heroMode.textContent = logged
      ? "Cuenta activa · armario propio"
      : "Modo local · este dispositivo";
  }
  if (logged) personalizeHero(currentUser.name);
}

function openAccount() {
  accountLastFocus = document.activeElement;
  renderAccount();
  accountModal.classList.add("open");
  (currentUser ? document.getElementById("logoutBtn") : document.getElementById("accountEmail")).focus();
}

function closeAccount() {
  accountModal.classList.remove("open");
  if (accountLastFocus && accountLastFocus.focus) accountLastFocus.focus();
}

async function refreshSession() {
  try {
    const { user } = await api("/auth/yo");
    currentUser = user;
  } catch {
    currentUser = null;
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
    const { preferences } = await api("/auth/perfil");
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
    } else if (hasLocal && currentUser) {
      await pushProfile();
    }
    renderDossier();
    renderPrefs();
  } catch { /* sin backend: el dossier sigue en local */ }
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

async function submitAuth(path) {
  accountError.hidden = true;
  const name = document.getElementById("accountName").value.trim().slice(0, 60);
  const email = document.getElementById("accountEmail").value.trim();
  const password = document.getElementById("accountPassword").value;
  if (path === "/auth/registro" && !name) {
    accountError.textContent = "Escribe tu nombre para crear la cuenta.";
    accountError.hidden = false;
    return;
  }
  if (!email || !password) {
    accountError.textContent = "Email y contraseña son requeridos.";
    accountError.hidden = false;
    return;
  }
  try {
    const body = path === "/auth/registro"
      ? { name, email, password }
      : { email, password };
    const { user } = await api(path, { method: "POST", body: JSON.stringify(body) });
    currentUser = user;
    document.getElementById("accountPassword").value = "";
    renderAccount();
    toast(`Hola de nuevo, ${user.name}. Cargando tu armario…`);
    await pullProfile();
    try {
      await loadRemoteOutfits();
      toast(`Armario de ${user.name} listo.`);
    } catch {
      toast("Sesión lista. Tu armario sigue en local.");
    }
    closeAccount();
  } catch (err) {
    accountError.textContent = err.message;
    accountError.hidden = false;
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
document.getElementById("registerBtn").addEventListener("click", () => submitAuth("/auth/registro"));

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
  try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch { /* igual se cierra */ }
  currentUser = null;
  renderAccount();
  closeAccount();
  toast("Sesión cerrada. Tu armario local sigue aquí.");
});

refreshSession().then(async (user) => {
  if (!user) return;
  await pullProfile();
  loadRemoteOutfits().catch(() => {});
});
