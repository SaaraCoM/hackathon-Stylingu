/* wardrobe.js — silueta, generador de conjuntos y armario local. */

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
  const saved = store.getOutfits();
  document.getElementById("savedCount").textContent =
    `Armario local: ${saved.length} conjunto${saved.length === 1 ? "" : "s"}`;
  document.getElementById("savedList").innerHTML = saved.slice(-3).reverse()
    .map((s) => `<li><span>${s.top} + ${s.bottom} + ${s.jacket}</span></li>`).join("");
  document.getElementById("savedEmpty").hidden = saved.length > 0;
}

renderSilhouette();
renderOutfit();
renderSaved();
document.getElementById("shuffleBtn").addEventListener("click", () => {
  outfitIndex = (outfitIndex + 1) % D.outfits.length;
  renderOutfit();
  toast("Nueva combinación lista. Guárdala si te favorece.");
});
document.getElementById("saveOutfitBtn").addEventListener("click", () => {
  store.addOutfit({ ...D.outfits[outfitIndex], at: new Date().toISOString() });
  renderSaved();
  toast("Conjunto guardado. Lo verás en tu Armario.");
});
document.getElementById("saveFirstBtn").addEventListener("click", () => {
  document.getElementById("saveOutfitBtn").click();
});
