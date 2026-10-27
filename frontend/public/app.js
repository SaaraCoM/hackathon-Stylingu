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
  toast("Nueva combinación calculada.");
});

document.getElementById("saveOutfitBtn").addEventListener("click", () => {
  const saved = readJSON("stylingu-outfits", []);
  saved.push({ ...D.outfits[outfitIndex], at: new Date().toISOString() });
  writeJSON("stylingu-outfits", saved);
  renderSaved();
  toast("Conjunto guardado en local.");
});

document.getElementById("savePaletteBtn").addEventListener("click", () => {
  writeJSON("stylingu-palette", D.palette);
  toast("Paleta guardada en local.");
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
    ? `${n} check-in${n === 1 ? "" : "s"} registrados en local.`
    : "Sin check-ins todavía.";
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
  toast("Check-in semanal registrado.");
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
});
document.getElementById("confirmConsultBtn").addEventListener("click", () => {
  const name = consultName.value.trim().slice(0, 60);
  closeModal();
  toast(name ? `Dossier creado para ${name}.` : "Dossier de ejemplo creado.");
});
