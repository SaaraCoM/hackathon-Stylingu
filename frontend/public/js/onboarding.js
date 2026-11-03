const onboardSheet=document.getElementById('onboardSheet');
function personalizeHero(name){document.getElementById('heroTitle').textContent=name+' · Tu atelier personal';}
const GOAL_LABELS = { saber_colores: "Mis colores", compras: "Comprar mejor", maquillaje: "Maquillaje" };
const JEWELRY_LABELS = { dorado: "Oro", plateado: "Plata", ambos: "Oro y plata" };

// renderDossier — el hero muestra los gustos elegidos y la joyería pinta
// el acento (pulse + wave) vía data-joya en <html>. Sin perfil, oculto.
function renderDossier() {
  const line = document.getElementById("dossierLine");
  const p = store.getProfile();
  const parts = [];
  if (p) {
    (p.goals || []).forEach((g) => parts.push(GOAL_LABELS[g] || g));
    if (p.jewelry) parts.push(JEWELRY_LABELS[p.jewelry] || p.jewelry);
    (p.styles || []).forEach((s) => parts.push(s));
  }
  if (line) {
    line.textContent = parts.join(" · ");
    line.hidden = parts.length === 0;
  }
  if (document.documentElement) {
    if (p && p.jewelry) document.documentElement.dataset.joya = p.jewelry;
    else delete document.documentElement.dataset.joya;
  }
}


renderDossier();
