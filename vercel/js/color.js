/* color.js — paleta nuclear, tonos a evitar y probador textil. Lee de
 * D (dataset) y persiste vía store. */

let currentHex = D.palette[0].hex;

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

renderPalette();
renderAvoid();
document.getElementById("copyHexBtn").addEventListener("click", copyHex);
document.querySelectorAll("[data-fabric]").forEach((btn) => {
  btn.addEventListener("click", () => selectFabric(btn.dataset.fabric, btn));
});
selectFabric("seda", document.querySelector('[data-fabric="seda"]'));
document.getElementById("savePaletteBtn").addEventListener("click", () => {
  store.savePalette();
  toast("Paleta guardada. Úsala al comparar prendas.");
});
