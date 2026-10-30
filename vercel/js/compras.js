/* compras.js — pestaña Recomendación de Compras del diseño: looks basados en
 * tu foto, diagnóstico fotográfico y feed de referencias visuales. */

let feedFilter = "todas";

function renderCompras() {
  const a = store.getAnalysis();
  const c = a?.colorimetry;
  document.getElementById("comprasStatus").textContent =
    c ? `${c.season} · Simulación` : "Sin análisis todavía";
  document.getElementById("comprasPrec").textContent =
    "Lectura facial: " + (a ? a.makeup.faceShape : "pendiente");
  document.getElementById("comprasColor").textContent =
    "Estilo & color: " + (a ? `${a.outfit.style} · ${c.season}` : "pendiente");

  const looks = document.getElementById("comprasLooks");
  looks.innerHTML = "";
  D.outfits.forEach((o, i) => {
    const card = document.createElement("article");
    card.className = "card outfit-card";
    const rows = [
      ["Color principal", c ? c.primaryHex : D.palette[0].hex],
      ["Subtono", c ? c.temperature : "cálido"],
      ["Silueta", a ? a.outfit.silhouette : D.silhouetteStyle]
    ];
    card.innerHTML = `<span class="pill">Look ${String(i + 1).padStart(2, "0")}</span>
      <h3>${o.top} & ${o.bottom}</h3>
      <p class="muted">${o.jacket} · ${o.acc}</p>
      <dl class="face-metrics">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <p class="fine">Recomendación de estilo; no es una compra disponible.</p>`;
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "Ver detalles";
    const detail = document.createElement("p");
    detail.className = "muted look-detail";
    detail.hidden = true;
    detail.textContent = `${o.topDesc} ${o.bottomDesc} ${o.jacketDesc} ${o.accDesc}`;
    btn.addEventListener("click", () => { detail.hidden = !detail.hidden; });
    card.appendChild(btn);
    card.appendChild(detail);
    looks.appendChild(card);
  });

  const diag = document.getElementById("comprasDiagnostico");
  diag.innerHTML = "";
  D.compraDiagnostico.forEach((d) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<span class="pill lavender">${d.meta}</span>
      <h3>${d.title}</h3><p class="muted">${d.body}</p>`;
    diag.appendChild(card);
  });

  renderFeed(feedFilter);
}

function renderFeed(cat) {
  const box = document.getElementById("comprasFeed");
  box.innerHTML = "";
  D.compraFeed.filter((f) => cat === "todas" || f.cat === cat).forEach((f) => {
    const card = document.createElement("article");
    card.className = "card reference-card";
    card.innerHTML = `<div class="reference-image feed-image"><img src="${f.img}" alt="Referencia editorial: ${f.title}" loading="lazy" /></div>
      <span class="pill">Referencia editorial</span>
      <h3>${f.title}</h3><p class="muted">${f.desc}</p>`;
    const btn = document.createElement("button");
    btn.className = "text-button";
    btn.type = "button";
    btn.textContent = "Guardar referencia ↗";
    btn.addEventListener("click", () => toast("Referencia guardada en local."));
    card.appendChild(btn);
    box.appendChild(card);
  });
}

document.querySelectorAll("[data-feed]").forEach((btn) => {
  btn.addEventListener("click", () => {
    feedFilter = btn.dataset.feed;
    document.querySelectorAll("[data-feed]").forEach((b) =>
      b.classList.toggle("primary", b === btn));
    renderFeed(feedFilter);
  });
});
document.getElementById("comprasShootBtn").addEventListener("click", () => showConsultation());
document.getElementById("comprasUploadBtn").addEventListener("click", () => showConsultation());
document.getElementById("comprasFilterBtn").addEventListener("click", () => openAccount());
document.getElementById("thumbUpBtn").addEventListener("click", () => toast("Gracias por tu valoración."));
document.getElementById("thumbDownBtn").addEventListener("click", () => toast("Gracias: tu valoración ajusta las recomendaciones."));
renderCompras();
