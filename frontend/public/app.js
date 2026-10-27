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

function switchTab(id) {
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === id));
  document.querySelectorAll(".bottomnav button").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.tab === id))
  );
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
  const saved = JSON.parse(localStorage.getItem("stylingu-outfits") || "[]");
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
  const saved = JSON.parse(localStorage.getItem("stylingu-outfits") || "[]");
  saved.push({ ...D.outfits[outfitIndex], at: new Date().toISOString() });
  localStorage.setItem("stylingu-outfits", JSON.stringify(saved));
  renderSaved();
  toast("Conjunto guardado en local.");
});

document.getElementById("savePaletteBtn").addEventListener("click", () => {
  localStorage.setItem("stylingu-palette", JSON.stringify(D.palette));
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

const zonesSimple = {
  "zona-t": "Zona T · Equilibrio 82%: tónico suave con PHA 2 veces/semana.",
  ojos: "Contorno periocular · Hidratación 74%: sérum de cafeína + masaje frío.",
  mejillas: "Mejillas · Barrera 68%: emulsión con escualano y ceramidas.",
  mandibula: "Mandíbula · Firmeza 91%: pases ascendentes en la selladora PM."
};
document.querySelectorAll("[data-zone]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("zoneText").textContent = zonesSimple[btn.dataset.zone];
  });
});

document.querySelectorAll(".bottomnav button").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

const modal = document.getElementById("consultModal");
document.getElementById("newConsultBtn").addEventListener("click", () => modal.classList.add("open"));
document.getElementById("closeConsultBtn").addEventListener("click", () => modal.classList.remove("open"));
document.getElementById("confirmConsultBtn").addEventListener("click", () => {
  modal.classList.remove("open");
  const name = document.getElementById("consultName").value.trim();
  toast(name ? `Dossier creado para ${name}.` : "Dossier de ejemplo creado.");
});
