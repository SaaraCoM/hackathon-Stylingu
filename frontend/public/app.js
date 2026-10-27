/* app.js — arranque del shell.
 * Mapa de módulos (scripts clásicos en este orden, sin bundler para
 * seguir abriendo con doble clic): data.js → js/store.js (único dueño
 * de datos y localStorage) → js/ui.js (toast, tabs, modal) →
 * js/color.js · js/wardrobe.js · js/makeup.js · js/skincare.js ·
 * js/onboarding.js (cada tab se autorenderiza) · js/account.js → este boot.
 */
switchTab("tab-color");
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
  else if (e.key === "Escape" && !onboardSheet.hidden) finishOnboarding(true);
});
