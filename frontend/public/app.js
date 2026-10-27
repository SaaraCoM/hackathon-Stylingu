const D = window.STYLINGU_DATA;
let currentHex = D.palette[0].hex;

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

/* Almacenamiento seguro: un valor corrupto vuelve a estado vacío en vez de romper la UI. */
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

const tabBtns = [...document.querySelectorAll(".bottomnav button")];
function switchTab(id, focus) {
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === id));
  tabBtns.forEach((b) => {
    const selected = b.dataset.tab === id;
    b.setAttribute("aria-selected", String(selected));
    b.tabIndex = selected ? 0 : -1;
    if (selected && focus) b.focus();
  });
}
function stepTab(dir) {
  const i = tabBtns.findIndex((b) => b.getAttribute("aria-selected") === "true");
  const next = tabBtns[(i + dir + tabBtns.length) % tabBtns.length];
  switchTab(next.dataset.tab, true);
}

/* ---- Colorimetría ---- */
function renderPalette() {
  const box = document.getElementById("swatches");
  box.innerHTML = "";
  D.palette.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch-card";
    b.type = "button";
    b.setAttribute("aria-pressed", String(i === 0));
    b.setAttribute("aria-label", `${c.name} ${c.hex}, armonía ${c.harmony}%`);
    b.innerHTML = `<span class="chipdot" style="background:${c.hex}"></span>
      <span class="nm">${c.name}</span><span class="hx">${c.hex}</span>
      <span class="hm">${c.harmony}%</span>`;
    b.addEventListener("click", () => selectSwatch(c, b));
    box.appendChild(b);
  });
  selectSwatch(D.palette[0], box.firstChild, true);
}

function selectSwatch(c, btn, silent) {
  currentHex = c.hex;
  document.getElementById("swatchName").textContent = `${c.name} · ${c.hex} · ${c.harmony}%`;
  document.getElementById("swatchDesc").textContent = c.desc;
  document.getElementById("swatchPreviewDot").style.background = c.hex;
  document.querySelectorAll(".swatch-card").forEach((el) => el.setAttribute("aria-pressed", "false"));
  if (btn) btn.setAttribute("aria-pressed", "true");
  if (!silent) toast(`${c.name} seleccionado`);
}

async function copyHex() {
  try {
    await navigator.clipboard.writeText(currentHex);
    toast(`Copiado ${currentHex}`);
  } catch {
    toast(`${currentHex} listo para copiar`);
  }
}

function renderAvoid() {
  const box = document.getElementById("avoidList");
  box.innerHTML = "";
  D.avoid.forEach((a) => {
    const row = document.createElement("div");
    row.className = "avoid-row";
    row.innerHTML = `<span class="avoid-dot" style="background:${a.hex}"></span>
      <div><strong style="font-size:13px">${a.name} (${a.hex})</strong>
      <p class="muted" style="margin:2px 0;font-size:12px">${a.why} <strong>Alternativa: ${a.alt}</strong></p></div>`;
    box.appendChild(row);
  });
}

function selectFabric(key, btn) {
  const f = D.fabrics[key];
  if (!f) return;
  document.getElementById("fabricTitle").textContent = f.title;
  document.getElementById("fabricBody").textContent = f.desc;
  document.querySelectorAll("[data-fabric]").forEach((b) =>
    b.classList.toggle("primary", b === btn)
  );
}

/* ---- Vestuario ---- */
let outfitIndex = 0;
function renderSilhouette() {
  const box = document.getElementById("silhouetteGrid");
  box.innerHTML = "";
  D.silhouette.forEach((s) => {
    const d = document.createElement("div");
    d.className = "swatch-card";
    d.style.cursor = "default";
    d.innerHTML = `<span class="nm">${s.name}</span><span class="hx">${s.note}</span>`;
    box.appendChild(d);
  });
}
function renderOutfit() {
  const o = D.outfits[outfitIndex];
  const rows = [
    ["Arriba", `${o.top} — ${o.topDesc}`],
    ["Abajo", `${o.bottom} — ${o.bottomDesc}`],
    ["Abrigo", `${o.jacket} — ${o.jacketDesc}`],
    ["Accesorio", `${o.acc} — ${o.accDesc}`]
  ];
  document.getElementById("outfitList").innerHTML = rows
    .map(([k, v]) => `<li><strong>${k}:</strong> <span>${v}</span></li>`).join("");
  document.getElementById("outfitCounter").textContent =
    `Combinación ${outfitIndex + 1} de ${D.outfits.length}`;
}
function renderSaved() {
  const saved = readJSON("stylingu-outfits", []);
  document.getElementById("savedCount").textContent =
    `Armario local: ${saved.length} conjunto${saved.length === 1 ? "" : "s"}`;
  document.getElementById("savedList").innerHTML = saved.slice(-3).reverse()
    .map((s) => `<li><span>${s.top} + ${s.bottom} + ${s.jacket}</span></li>`).join("");
  document.getElementById("savedEmpty").hidden = saved.length > 0;
}

/* ---- Init ---- */
renderPalette();
renderAvoid();
document.getElementById("copyHexBtn").addEventListener("click", copyHex);
document.querySelectorAll("[data-fabric]").forEach((btn) => {
  btn.addEventListener("click", () => selectFabric(btn.dataset.fabric, btn));
});
selectFabric("seda", document.querySelector('[data-fabric="seda"]'));

renderSilhouette();
renderOutfit();
renderSaved();
document.getElementById("shuffleBtn").addEventListener("click", () => {
  outfitIndex = (outfitIndex + 1) % D.outfits.length;
  renderOutfit();
  toast("Nueva combinación lista. Guárdala si te favorece.");
});

document.getElementById("saveOutfitBtn").addEventListener("click", () => {
  const saved = readJSON("stylingu-outfits", []);
  saved.push({ ...D.outfits[outfitIndex], at: new Date().toISOString() });
  writeJSON("stylingu-outfits", saved);
  renderSaved();
  toast("Conjunto guardado. Lo verás en tu Armario.");
});

document.getElementById("savePaletteBtn").addEventListener("click", () => {
  writeJSON("stylingu-palette", D.palette);
  toast("Paleta guardada. Úsala al comparar prendas.");
});

/* ---- Maquillaje ---- */
function renderProducts() {
  document.getElementById("lipList").innerHTML = D.lipsticks.map((l) =>
    `<div class="prod-row"><span class="prod-dot" style="background:${l.hex}"></span>
    <span class="meta"><strong>${l.name}</strong><span>${l.finish}</span></span>
    <span class="tag">${l.use}</span></div>`).join("");
  document.getElementById("blushList").innerHTML = D.blush.map((b) =>
    `<div class="prod-row"><span class="prod-dot" style="background:${b.hex}"></span>
    <span class="meta"><strong>${b.name}</strong><span>${b.texture}</span></span></div>`).join("");
  document.getElementById("eyesQuad").innerHTML = D.eyes.map((e) =>
    `<div class="cell"><div class="bar" style="background:${e.hex}"></div>
    <strong>${e.name}</strong><span>${e.role}</span></div>`).join("");
}
function selectLook(key, btn) {
  const l = D.looks[key];
  if (!l) return;
  document.getElementById("lookBadge").textContent = l.badge;
  document.getElementById("lookTitle").textContent = l.title;
  document.getElementById("lookDesc").textContent = l.desc;
  document.querySelectorAll("[data-look]").forEach((b) =>
    b.classList.toggle("primary", b === btn));
}
renderProducts();
selectLook("diario", document.querySelector('[data-look="diario"]'));
document.querySelectorAll("[data-look]").forEach((btn) => {
  btn.addEventListener("click", () => selectLook(btn.dataset.look, btn));
});

/* ---- Skincare ---- */
function selectZone(key, btn) {
  const z = D.zones[key];
  if (!z) return;
  document.getElementById("zoneName").textContent = z.name;
  document.getElementById("zoneScore").textContent = z.score;
  document.getElementById("zoneDesc").textContent = z.desc;
  document.querySelectorAll("[data-zone]").forEach((b) =>
    b.classList.toggle("primary", b === btn));
}
function renderRoutine() {
  document.getElementById("routineAM").innerHTML = D.routineAM
    .map(([t, d]) => `<li><strong>${t}.</strong> <span>${d}</span></li>`).join("");
  document.getElementById("routinePM").innerHTML = D.routinePM
    .map(([t, d]) => `<li><strong>${t}.</strong> <span>${d}</span></li>`).join("");
}
function renderCheckin() {
  const n = readJSON("stylingu-checkins", []).length;
  document.getElementById("checkinInfo").textContent = n
    ? `${n} check-in${n === 1 ? "" : "s"} en local. El próximo, este domingo.`
    : "Aún sin check-ins. Registra el primero y sigue tu progreso aquí.";
}
renderRoutine();
renderCheckin();
selectZone("zona-t", document.querySelector('[data-zone="zona-t"]'));
document.querySelectorAll("[data-zone]").forEach((btn) => {
  btn.addEventListener("click", () => selectZone(btn.dataset.zone, btn));
});
document.getElementById("checkinBtn").addEventListener("click", () => {
  const all = readJSON("stylingu-checkins", []);
  all.push({ at: new Date().toISOString() });
  writeJSON("stylingu-checkins", all);
  renderCheckin();
  toast("Check-in registrado. Nos vemos el domingo.");
});

tabBtns.forEach((btn, i) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); stepTab(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stepTab(-1); }
    else if (e.key === "Home") { e.preventDefault(); switchTab(tabBtns[0].dataset.tab, true); }
    else if (e.key === "End") { e.preventDefault(); switchTab(tabBtns[tabBtns.length - 1].dataset.tab, true); }
    void i;
  });
});

const modal = document.getElementById("consultModal");
const consultName = document.getElementById("consultName");
let lastFocus = null;
function openModal() {
  lastFocus = document.activeElement;
  modal.classList.add("open");
  consultName.focus();
}
function closeModal() {
  modal.classList.remove("open");
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
document.getElementById("newConsultBtn").addEventListener("click", openModal);
document.getElementById("closeConsultBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  else if (e.key === "Escape" && !onboardSheet.hidden) finishOnboarding(true);
});
document.getElementById("saveFirstBtn").addEventListener("click", () => {
  document.getElementById("saveOutfitBtn").click();
});

/* ---- Primera vez: onboarding en 4 pasos ---- */
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
function finishOnboarding(skipped) {
  if (!skipped && obDraft.name) {
    writeJSON("stylingu-profile", { ...obDraft, at: new Date().toISOString() });
    personalizeHero(obDraft.name);
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
const existingProfile = readJSON("stylingu-profile", null);
if (existingProfile && existingProfile.name) personalizeHero(existingProfile.name);
else { onboardSheet.hidden = false; renderObStep(); }

const consultError = document.getElementById("consultError");
consultName.addEventListener("input", () => { consultError.hidden = true; });
document.getElementById("confirmConsultBtn").addEventListener("click", () => {
  const name = consultName.value.trim().slice(0, 60);
  if (!name) {
    consultError.hidden = false;
    consultName.focus();
    return;
  }
  consultError.hidden = true;
  closeModal();
  toast(`Dossier creado para ${name}. Míralo en Colorimetría.`);
});
