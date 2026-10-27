/* skincare.js — mapa facial, rutinas AM/PM y check-in semanal. */

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
  const n = store.getCheckins().length;
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
  store.addCheckin();
  renderCheckin();
  toast("Check-in registrado. Nos vemos el domingo.");
});
