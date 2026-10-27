const palette = [
  { name: "Terracota", hex: "#C98A7B" },
  { name: "Arcilla profunda", hex: "#865044" },
  { name: "Oliva suave", hex: "#58624B" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Borgoña", hex: "#800020" },
  { name: "Arena", hex: "#E6C280" }
];

const outfits = [
  "Blusa de seda marfil + pantalón terracota + blazer camel.",
  "Camisa de lino crudo + falda plisada salvia + cárdigan miel.",
  "Jersey rosa tierra + pantalón pana chocolate + trench alabastro."
];

const looks = {
  diario: "Diario luminoso: base translúcida, rubor melocotón y labio nude.",
  editorial: "Editorial noche: ahumado bronce cobrizo y labio baya tostada.",
  reunion: "Reunión ejecutiva: tez mate uniforme y labio terracota."
};

const zones = {
  "zona-t": "Zona T · Equilibrio 82%: tónico suave con PHA 2 veces/semana.",
  ojos: "Contorno periocular · Hidratación 74%: sérum de cafeína + masaje frío.",
  mejillas: "Mejillas · Barrera 68%: emulsión con escualano y ceramidas.",
  mandibula: "Mandíbula · Firmeza 91%: pases ascendentes en la selladora PM."
};

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2500);
}

function switchTab(id) {
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === id));
  document.querySelectorAll(".bottomnav button").forEach((b) =>
    b.setAttribute("aria-selected", String(b.dataset.tab === id))
  );
}

function renderSwatches() {
  const box = document.getElementById("swatches");
  const info = document.getElementById("swatchInfo");
  palette.forEach((c) => {
    const b = document.createElement("button");
    b.className = "swatch";
    b.type = "button";
    b.style.background = c.hex;
    b.title = `${c.name} ${c.hex}`;
    b.setAttribute("aria-label", `Copiar ${c.name} ${c.hex}`);
    b.addEventListener("click", async () => {
      info.textContent = `${c.name} · ${c.hex}`;
      try {
        await navigator.clipboard.writeText(c.hex);
        toast(`Copiado ${c.hex}`);
      } catch {
        toast(`${c.hex} listo para copiar`);
      }
    });
    box.appendChild(b);
  });
}

let outfitIndex = 0;
document.getElementById("shuffleBtn").addEventListener("click", () => {
  outfitIndex = (outfitIndex + 1) % outfits.length;
  document.getElementById("outfitText").textContent = outfits[outfitIndex];
  toast("Nueva combinación calculada.");
});

document.getElementById("saveOutfitBtn").addEventListener("click", () => {
  const saved = JSON.parse(localStorage.getItem("stylingu-outfits") || "[]");
  saved.push({ text: document.getElementById("outfitText").textContent, at: new Date().toISOString() });
  localStorage.setItem("stylingu-outfits", JSON.stringify(saved));
  toast("Conjunto guardado en local.");
});

document.getElementById("savePaletteBtn").addEventListener("click", () => {
  localStorage.setItem("stylingu-palette", JSON.stringify(palette));
  toast("Paleta guardada en local.");
});

document.querySelectorAll("[data-look]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("lookText").textContent = looks[btn.dataset.look];
  });
});

document.querySelectorAll("[data-zone]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("zoneText").textContent = zones[btn.dataset.zone];
  });
});

document.querySelectorAll(".bottomnav button").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

const modal = document.getElementById("consultModal");
document.getElementById("newConsultBtn").addEventListener("click", () => modal.classList.add("open"));
document.getElementById("closeConsultBtn").addEventListener("click", () => modal.classList.remove("open"));
document.getElementById("confirmConsultBtn").addEventListener("click", () => {
  modal.classList.remove("open");
  const name = document.getElementById("consultName").value.trim();
  toast(name ? `Dossier creado para ${name}.` : "Dossier de ejemplo creado.");
});

renderSwatches();
