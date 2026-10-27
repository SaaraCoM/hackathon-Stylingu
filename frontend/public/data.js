/* StylingU — dataset local. Una sola fuente de verdad; la UI renderiza desde aquí. */
window.STYLINGU_DATA = {
  palette: [
    { name: "Terracota", hex: "#C98A7B", harmony: 99, desc: "Eleva la calidez natural del rubor y unifica el tono labial." },
    { name: "Chocolate", hex: "#865044", harmony: 97, desc: "Aporta profundidad sin la dureza óptica del negro absoluto." },
    { name: "Salvia", hex: "#58624B", harmony: 95, desc: "Neutraliza rojeces y enfatiza destellos miel del iris." },
    { name: "Crema", hex: "#EEDFDA", harmony: 98, desc: "El iluminador textil idóneo; no compite con el blanco ocular." },
    { name: "Ocre", hex: "#C49A45", harmony: 94, desc: "Luminosidad instantánea en pañuelos y joyería." },
    { name: "Rosa palo", hex: "#D5B5AB", harmony: 92, desc: "Sutileza sedosa para blusas de escote cercanas al cuello." }
  ],
  avoid: [
    { name: "Negro puro", hex: "#000000", why: "Absorbe la luz facial y marca surcos.", alt: "Café espresso o carbón cálido." },
    { name: "Azul glacial", hex: "#0033FF", why: "Su frialdad apaga el subtono cálido.", alt: "Azul petróleo apagado." },
    { name: "Fucsia neón", hex: "#FF007F", why: "Contraste estridente que compite con la mirada.", alt: "Baya canela o coral empolvado." }
  ],
  fabrics: {
    seda: { title: "Seda salvaje · terracota y nácar", desc: "Lustre suave que difumina el escote y potencia el subtono cálido sin destellos fríos." },
    lino: { title: "Lino rústico · crudo y arena", desc: "Mate microtexturizado que absorbe la luz y realza la estética relajada del Otoño Suave." },
    lana: { title: "Lana merino · cachemira camel", desc: "Calidez envolvente con volumen táctil, sin la severidad de paños rígidos." }
  },
  looks: {
    diario: { badge: "Diario luminoso", title: "Second skin + labio canela", desc: "Base acuosa translúcida, rubor melocotón en pómulos altos, máscara café y nude melocotón con bálsamo." },
    editorial: { badge: "Editorial noche", title: "Ahumado bronce + baya tostada", desc: "Cuarzo bronce y café profundo, pómulos en coral cálido y labial baya canela satinado." },
    reunion: { badge: "Reunión ejecutiva", title: "Mate sedoso estructurado", desc: "Tez uniforme, cuenca en taupe cálido, cejas pelo a pelo y terracota de larga duración." }
  },
  lipsticks: [
    { name: "Nude melocotón", hex: "#D38875", finish: "Gloss húmedo", use: "Diario" },
    { name: "Terracota", hex: "#A4503E", finish: "Satín sedoso", use: "Firma" },
    { name: "Baya canela", hex: "#8C3E36", finish: "Mate confort", use: "Noche" }
  ],
  blush: [
    { name: "Melocotón empolvado", hex: "#E29B88", texture: "Crema bálsamo" },
    { name: "Coral tostado", hex: "#BA6C56", texture: "Polvo mineral" },
    { name: "Rosa tierra", hex: "#B5796E", texture: "Gel iluminador" }
  ],
  eyes: [
    { name: "Vainilla nácar", hex: "#F3E5D8", role: "Iluminador arco" },
    { name: "Taupe cálido", hex: "#A98C7F", role: "Transición cuenca" },
    { name: "Bronce cobrizo", hex: "#9C5D3F", role: "Párpado" },
    { name: "Café espresso", hex: "#4A332D", role: "Delineado suave" }
  ],
  silhouette: [
    { name: "Escotes en V", note: "Elongan cuello y pecho" },
    { name: "Cintura marcada", note: "Cinturones finos y drapeados" },
    { name: "Tiro alto fluido", note: "Recto o wide leg" },
    { name: "Sastrería suave", note: "Blazers desestructurados" }
  ],
  outfits: [
    { top: "Blusa de seda marfil", topDesc: "Corte en V, caída natural.", bottom: "Pantalón sastre terracota", bottomDesc: "Tiro alto, pernera ancha.", jacket: "Blazer camel", jacketDesc: "Solapa corrida, lana fina.", acc: "Mocasín nude + bolso cuero", accDesc: "Marrón tostado, herraje dorado." },
    { top: "Camisa lino crudo", topDesc: "Cuello mao, arena suave.", bottom: "Falda plisada salvia", bottomDesc: "Midi, vuelo ligero.", jacket: "Cárdigan cachemira miel", jacketDesc: "Punto grueso sedoso.", acc: "Botines + foulard", accDesc: "Ante flexible, seda estampada." },
    { top: "Jersey rosa tierra", topDesc: "Merino extrafino.", bottom: "Pantalón pana chocolate", bottomDesc: "Recto, elonga figura.", jacket: "Trench alabastro", jacketDesc: "Gabardina con cinturón.", acc: "Tote + bronce", accDesc: "Pendientes dorados cepillados." }
  ],
  zones: {
    "zona-t": { name: "Zona T · frente y nariz", score: "Equilibrio 82%", desc: "Leve brillo al mediodía. Tónico PHA + niacinamida 2 veces/semana." },
    ojos: { name: "Contorno periocular", score: "Hidratación 74%", desc: "Sombra vascular leve. Sérum de cafeína + masaje con jade frío." },
    mejillas: { name: "Mejillas y pómulos", score: "Barrera 68%", desc: "Deshidratación estacional. Emulsión con escualano y ceramidas." },
    mandibula: { name: "Mandíbula y cuello", score: "Firmeza 91%", desc: "Tono óptimo. Pases ascendentes con selladora PM." }
  },
  routineAM: [
    ["Limpieza gel sin espuma", "Centella asiática, sin tirantez."],
    ["Sérum hialurónico + C 10%", "Antioxidante, unifica tono dorado."],
    ["Emulsión con ectoína", "Película permeable anti-deshidratación."],
    ["SPF 50+ invisible", "Sin residuo blanco; bruma a las 4 h."]
  ],
  routinePM: [
    ["Doble limpieza", "Bálsamo oleoso + leche, sin fricción."],
    ["Niacinamida 5% + pantenol", "Calma rojeces, refuerza barrera."],
    ["Bálsamo 3 ceramidas", "Restaura lípidos durante la noche."],
    ["Contorno cafeína", "Cerámica fría, de lagrimal hacia fuera."]
  ]
};
