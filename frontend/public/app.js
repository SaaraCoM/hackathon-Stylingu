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

/* ---- Armario (simple, se enriquece en el siguiente commit) ---- */
const outfitsSimple = D.outfits.map((o) => `${o.top} + ${o.bottom} + ${o.jacket}.`);
let outfitIndex = 0;

/* ---- Init ---- */
renderPalette();
renderAvoid();
document.getElementById("copyHexBtn").addEventListener("click", copyHex);
document.querySelectorAll("[data-fabric]").forEach((btn) => {
  btn.addEventListener("click", () => selectFabric(btn.dataset.fabric, btn));
});
selectFabric("seda", document.querySelector('[data-fabric="seda"]'));

document.getElementById("shuffleBtn").addEventListener("click", () => {
  outfitIndex = (outfitIndex + 1) % outfitsSimple.length;
  document.getElementById("outfitText").textContent = outfitsSimple[outfitIndex];
  toast("Nueva combinación calculada.");
});

document.getElementById("saveOutfitBtn").addEventListener("click", () => {
  const saved = JSON.parse(localStorage.getItem("stylingu-outfits") || "[]");
  saved.push({ text: document.getElementById("outfitText").textContent, at: new Date().toISOString() });
  localStorage.setItem("stylingu-outfits", JSON.stringify(saved));
  toast("Conjunto guardado en local.");
});

document.getElementById("savePaletteBtn").addEventListener("click", () => {
  localStorage.setItem("stylingu-palette", JSON.stringify(D.palette));
  toast("Paleta guardada en local.");
});

const looksSimple = {
  diario: "Diario luminoso: base translúcida, rubor melocotón y labio nude.",
  editorial: "Editorial noche: ahumado bronce cobrizo y labio baya tostada.",
  reunion: "Reunión ejecutiva: tez mate uniforme y labio terracota."
};
document.querySelectorAll("[data-look]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("lookText").textContent = looksSimple[btn.dataset.look];
  });
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
