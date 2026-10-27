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
  accountError.hidden = true;
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
document.getElementById("logoutBtn").addEventListener("click", async () => {
  try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch { /* igual se cierra */ }
  currentUser = null;
  renderAccount();
  closeAccount();
  toast("Sesión cerrada. Tu armario local sigue aquí.");
});

refreshSession().then((user) => {
  if (user) loadRemoteOutfits().catch(() => {});
});
