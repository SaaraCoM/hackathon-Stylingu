/* makeup.js — maquillaje del diseño: morfometría, probador virtual, pigmentos
 * (labiales, colorete, cuarteto) y looks editoriales por ocasión. */

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

function renderLooks() {
  const box = document.getElementById("looksGrid");
  box.innerHTML = "";
  Object.keys(D.looks).forEach((key) => {
    const l = D.looks[key];
    const card = document.createElement("article");
    card.className = "card look-option";
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.dataset.look = key;
    btn.textContent = l.badge;
    btn.addEventListener("click", () => selectLook(key, btn));
    card.appendChild(btn);
    const h = document.createElement("h3");
    h.textContent = l.title;
    card.appendChild(h);
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = l.desc;
    card.appendChild(p);
    box.appendChild(card);
  });
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

function updatePreviewFx() {
  const el = document.getElementById("lookColorPreview");
  const brillo = Number(document.getElementById("sliderBrillo").value) || 0;
  const opacidad = Number(document.getElementById("sliderOpacidad").value) || 0;
  const sombra = Number(document.getElementById("sliderSombra").value) || 0;
  el.style.filter = `brightness(${0.7 + brillo / 160}) saturate(${1 + sombra / 200})`;
  el.style.opacity = String(0.35 + opacidad / 155);
}

renderProducts();
renderLooks();
selectLook("diario", document.querySelector('[data-look="diario"]'));
for (const id of ["sliderBrillo", "sliderOpacidad", "sliderSombra"]) {
  document.getElementById(id).addEventListener("input", updatePreviewFx);
}
updatePreviewFx();
