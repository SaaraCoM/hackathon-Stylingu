/* color.js — paleta nuclear, tonos a evitar, comparador de reactividad e
 * inspiración. Lee de D (dataset) y persiste vía store. */

let currentHex = D.palette[0].hex;

function renderPalette() {
  const box = document.getElementById("swatches");
  box.innerHTML = "";
  const third = Math.ceil(D.palette.length / 3);
  D.palette.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch-card";
    b.type = "button";
    b.dataset.pfilter = i < third ? "base" : i < 2 * third ? "media" : "acento";
    b.setAttribute("aria-pressed", String(i === 0));
    b.setAttribute("aria-label", `Seleccionar ${c.name} ${c.hex}`);
    const icons = ['6877d.svg', '6defe.svg', '81327.svg', '5bad9.svg', '7d41a.svg', '2d0af.svg'];
    b.innerHTML = `<span class="swatch-top"><span>TONO ${String(i + 1).padStart(2, '0')}</span><span>${c.hex}</span></span>
      <span class="chipdot" style="background:${c.hex}"><span class="swatch-icon"><img src="./assets/figma/${icons[i % icons.length]}" alt="" /></span></span>
      <span class="nm">${c.name === c.hex ? 'Matiz ' + String(i + 1).padStart(2, '0') : c.name}</span><span class="hx">${c.desc}</span>
      <span class="swatch-footer">Seleccionar color ↗</span>`;
    b.addEventListener("click", () => selectSwatch(c, b));
    box.appendChild(b);
  });
  selectSwatch(D.palette[0], box.firstChild, true);
  setPaletteFilter(paletteFilter);
}

function selectSwatch(c, btn, silent) {
  currentHex = c.hex;
  document.getElementById("swatchName").textContent = c.name === c.hex ? c.hex : `${c.name} · ${c.hex}`;
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

function renderComparator() {
  const box = document.getElementById("comparatorGrid");
  box.innerHTML = "";
  D.skinComparator.forEach((s) => {
    const card = document.createElement("div");
    card.className = "card comparator-card";
    const swatch = document.createElement("div");
    swatch.className = "comparator-swatch";
    swatch.style.background = s.hex;
    card.appendChild(swatch);
    const h = document.createElement("h3");
    h.textContent = s.name + " · " + s.hex;
    card.appendChild(h);
    const bar = document.createElement("div");
    bar.className = "match-bar";
    bar.innerHTML = `<span style="width:${s.match}%"></span>`;
    card.appendChild(bar);
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = `Coincidencia de ejemplo ${s.match}% con tu paleta.`;
    card.appendChild(p);
    box.appendChild(card);
  });
}

function renderInspiracion() {
  const box = document.getElementById("inspiracionGrid");
  box.innerHTML = "";
  D.outfits.forEach((o) => {
    const card = document.createElement("article");
    card.className = "card reference-card";
    card.innerHTML = `<span class="pill">Referencia editorial</span>
      <h3>${o.top} & ${o.jacket}</h3>
      <p class="muted">${o.bottom} · ${o.acc}</p>`;
    const btn = document.createElement("button");
    btn.className = "text-button";
    btn.type = "button";
    btn.textContent = "Ver paleta asociada ↗";
    btn.addEventListener("click", () => {
      document.getElementById("paletteTitle").scrollIntoView?.({ behavior: "smooth" });
      toast("Paleta asociada a este estilo.");
    });
    card.appendChild(btn);
    box.appendChild(card);
  });
}

let paletteFilter = "todas";
function setPaletteFilter(key) {
  paletteFilter = key;
  document.querySelectorAll("[data-pfilter]").forEach((btn) =>
    btn.classList.toggle("primary", btn.dataset.pfilter === key));
  document.querySelectorAll(".swatch-card").forEach((card) => {
    card.hidden = key !== "todas" && card.dataset.pfilter !== key;
  });
}

renderPalette();
renderAvoid();
renderComparator();
renderInspiracion();
document.getElementById("copyHexBtn").addEventListener("click", copyHex);
document.querySelectorAll("[data-pfilter]").forEach((btn) => {
  btn.addEventListener("click", () => setPaletteFilter(btn.dataset.pfilter));
});
document.getElementById("savePaletteBtn").addEventListener("click", () => {
  store.savePalette();
  toast("Paleta guardada. Úsala al comparar prendas.");
});
