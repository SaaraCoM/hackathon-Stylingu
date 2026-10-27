/* ui.js — piezas compartidas: toast, tabs y modal de consulta. */

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
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
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); stepTab(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stepTab(-1); }
    else if (e.key === "Home") { e.preventDefault(); switchTab(tabBtns[0].dataset.tab, true); }
    else if (e.key === "End") { e.preventDefault(); switchTab(tabBtns[tabBtns.length - 1].dataset.tab, true); }
  });
});

const modal = document.getElementById("consultModal");
const consultName = document.getElementById("consultName");
const consultError = document.getElementById("consultError");
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
consultName.addEventListener("input", () => { consultError.hidden = true; });
document.getElementById("confirmConsultBtn").addEventListener("click", () => {
  const name = consultName.value.trim().slice(0, 60);
  if (!name) {
    consultError.hidden = false;
    consultName.focus();
    return;
  }
  consultError.hidden = true;
  closeModal();
  toast(`Dossier creado para ${name}. Míralo en Colorimetría.`);
});
