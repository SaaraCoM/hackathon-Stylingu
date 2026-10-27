/* onboarding.js — primera vez en 4 pasos con progreso y guardado local. */

const onboardSheet = document.getElementById("onboardSheet");
const obTitle = document.getElementById("obTitle");
const obStep = document.getElementById("obStep");
const obName = document.getElementById("obName");
const obError = document.getElementById("obError");
const obNextBtn = document.getElementById("obNextBtn");
const obBackBtn = document.getElementById("obBackBtn");
const obSteps = [...document.querySelectorAll(".ob-step")];
const obTitles = ["¿Cómo te llamamos?", "¿Qué quieres lograr?", "Sol, joyas y estilo", "Tu dossier está listo"];
let obIndex = 0;
const obDraft = { name: "", goals: [], jewelry: "", styles: [] };

function renderObStep() {
  obTitle.textContent = obTitles[obIndex];
  obStep.textContent = `Paso ${obIndex + 1} de 4 · ${["Tu nombre", "Tus objetivos", "Tus gustos", "Confirmar"][obIndex]}`;
  obSteps.forEach((s) => { s.hidden = Number(s.dataset.step) !== obIndex + 1; });
  obName.style.display = obIndex === 0 ? "" : "none";
  obError.hidden = true;
  obBackBtn.disabled = obIndex === 0;
  obNextBtn.textContent = obIndex === 3 ? "Empezar" : "Continuar";
  (obIndex === 0 ? obName : obNextBtn).focus();
}

function personalizeHero(name) {
  document.getElementById("heroTitle").textContent = `${name} — Atelier de Armonía Óptica`;
  document.getElementById("heroSub").textContent =
    "Tu dossier vive en este dispositivo. Explora tu paleta, arma conjuntos y registra tu progreso cada domingo.";
}

const GOAL_LABELS = { saber_colores: "Mis colores", compras: "Comprar mejor", maquillaje: "Maquillaje" };
const JEWELRY_LABELS = { dorado: "Oro", plateado: "Plata", ambos: "Oro y plata" };

// renderDossier — el hero muestra los gustos elegidos y la joyería pinta
// el acento (pulse + wave) vía data-joya en <html>. Sin perfil, oculto.
function renderDossier() {
  const line = document.getElementById("dossierLine");
  const p = store.getProfile();
  const parts = [];
  if (p) {
    (p.goals || []).forEach((g) => parts.push(GOAL_LABELS[g] || g));
    if (p.jewelry) parts.push(JEWELRY_LABELS[p.jewelry] || p.jewelry);
    (p.styles || []).forEach((s) => parts.push(s));
  }
  if (line) {
    line.textContent = parts.join(" · ");
    line.hidden = parts.length === 0;
  }
  if (document.documentElement) {
    if (p && p.jewelry) document.documentElement.dataset.joya = p.jewelry;
    else delete document.documentElement.dataset.joya;
  }
}

function finishOnboarding(skipped) {
  if (!skipped && obDraft.name) {
    store.saveProfile({ ...obDraft, at: new Date().toISOString() });
    personalizeHero(obDraft.name);
    renderDossier();
    // Si hay sesión abierta, el dossier sube a la cuenta (best-effort).
    if (typeof currentUser !== "undefined" && currentUser && typeof pushProfile === "function") {
      pushProfile().catch(() => {});
    }
  }
  onboardSheet.hidden = true;
  switchTab("tab-color");
  toast(skipped ? "Explora el Atelier a tu ritmo." : `Hola, ${obDraft.name}. Empieza por tu paleta.`);
}

document.querySelectorAll("[data-goal]").forEach((b) => {
  b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") === "true";
    b.setAttribute("aria-pressed", String(!on));
    const g = b.dataset.goal;
    obDraft.goals = on ? obDraft.goals.filter((x) => x !== g) : [...obDraft.goals, g];
  });
});
document.querySelectorAll("[data-jewelry]").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-jewelry]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    obDraft.jewelry = b.dataset.jewelry;
  });
});
document.querySelectorAll("[data-style]").forEach((b) => {
  b.addEventListener("click", () => {
    const on = b.getAttribute("aria-pressed") === "true";
    b.setAttribute("aria-pressed", String(!on));
    const s = b.dataset.style;
    obDraft.styles = on ? obDraft.styles.filter((x) => x !== s) : [...obDraft.styles, s];
  });
});
obName.addEventListener("input", () => { obError.hidden = true; });
obNextBtn.addEventListener("click", () => {
  if (obIndex === 0) {
    const name = obName.value.trim().slice(0, 60);
    if (!name) {
      obError.textContent = "Escribe tu nombre para personalizar tu dossier.";
      obError.hidden = false;
      obName.focus();
      return;
    }
    obDraft.name = name;
  }
  if (obIndex < 3) { obIndex += 1; renderObStep(); }
  else finishOnboarding(false);
});
obBackBtn.addEventListener("click", () => { if (obIndex > 0) { obIndex -= 1; renderObStep(); } });
document.getElementById("obSkipBtn").addEventListener("click", () => finishOnboarding(true));

const existingProfile = store.getProfile();
if (existingProfile && existingProfile.name) personalizeHero(existingProfile.name);
else { onboardSheet.hidden = false; renderObStep(); }
renderDossier();
