/* makeup.js — looks por ocasión y pigmentos (labiales, colorete, cuarteto). */

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
