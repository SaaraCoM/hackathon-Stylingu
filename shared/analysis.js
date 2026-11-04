/* analysis.js — contrato único de análisis para StylingU.

Este es el centro del flujo pedido: app pide foto de cara y cuerpo → agente
analiza → devuelve colorimetría + maquillaje (forma de rostro, forma de ojo,
tipo de delineado, colocación de sombras y colocación de colorete) + estilo
de vestimenta → la app se personaliza → se persiste con la cuenta.

Ambos runtimes reexportan este módulo puro, sin copiar lógica ni vocabulario. */

import { PROTOCOL_ID } from './ai-protocol.js';
import { COSMETIC_DISCLAIMER } from './ai-contract.js';

export const FACE_SHAPES = [
  "redonda",
  "oval",
  "alargada",
  "corazón",
  "cuadrada"
];

export const EYE_SHAPES = [
  "almendrada",
  "redonda",
  "encapotada",
  "no determinado",
  "caída"
];

export const EYELINER_TYPES = [
  "catliner",
  "doggyliner",
  "muñeca",
  "fox",
  "clásico",
  "sin delineado"
];

export const SHADOW_PLACEMENTS = [
  "arco bajo a contorno",
  "brillo alto en pómulo",
  "difuminado entero",
  "foco en cuenca",
  "sombra cenital suave"
];

export const BLUSH_PLACEMENTS = [
  "manzana del pómulo ascendente",
  "hacia la sien oblicua",
  "difuminado suave sobre mejilla",
  "en pómulo alto",
  "difuso sobre mejilla"
];

export const MAKEUP_LOOKS = [
  "Diario luminous",
  "Editorial noche",
  "Reunión ejecutiva",
  "Desfile"
];

export const OUTFIT_STYLES = [
  "Elegante",
  "Minimalista",
  "Natural"
];

export const SEASONS = [
  "Primavera Clara",
  "Primavera Cálida",
  "Primavera Brillante",
  "Verano Claro",
  "Verano Frío",
  "Verano Suave",
  "Otoño Cálido Suave",
  "Otoño Cálido",
  "Otoño Profundo",
  "Invierno Profundo",
  "Invierno Frío",
  "Invierno Claro"
];

export const AVOID = [
  { name: "Negro puro", hex: "#000000", why: "Absorbe la luz facial y marca surcos.", alt: "Café espresso o carbón cálido." },
  { name: "Azul glacial", hex: "#0033FF", why: "Su frialdad apaga el subtono cálido.", alt: "Azul petróleo apagado." },
  { name: "Fucsia neón", hex: "#FF007F", why: "Contraste estridente que compite con la mirada.", alt: "Baya canela o coral empolvado." }
];

export const CHORD_HEX = [
  "#C98A7B",
  "#C49A45",
  "#865044",
  "#58624B",
  "#D5B5AB",
  "#EEDFDA",
  "#A4503E",
  "#4F777A"
];

export const SILHOUETTES = [
  "Escotes en V y tiro fluido",
  "Cintura marcada con drapeados",
  "Tiro alto recto con pernera ancha",
  "Sastrería desestructurada"
];

/**
 * Analyzer mock determinista. Recibe las dos referencias de foto y una
 * identidad (email + nombre) y devuelve el resultado completo
 * que el usuario pidió. Determinista para que un mismo usuario obtenga el
 * mismo resultado antes de conectar un agente real.
 */
export function analyzeSimulated({ photos, user, analyzedAt = new Date().toISOString() }) {
  const seed = JSON.stringify([String(user.email).toLowerCase(), user.name, photos.face, photos.body]);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const pick = (arr) => arr[Math.abs(h) % arr.length] || arr[0];

  const season = pick(SEASONS);
  const temperature = "cálido";
  const contrast = "medio-bajo";
  const chroma = "suave";
  const harmony = 92 + (Math.abs(h) % 7);

  const faceShape = pick(FACE_SHAPES);
  const eyeShape = pick(EYE_SHAPES);
  const eyelinerType = pick(EYELINER_TYPES);
  const shadowPlacement = pick(SHADOW_PLACEMENTS);
  const blushPlacement = pick(BLUSH_PLACEMENTS);
  const look = pick(MAKEUP_LOOKS);
  const outfitStyle = pick(OUTFIT_STYLES);
  const silhouette = pick(SILHOUETTES);
  const accent = outfitStyle === "Elegante" ? "terracota" : outfitStyle === "Minimalista" ? "arena" : "miel";

  const primaryHex = pick(CHORD_HEX);
  const palette = CHORD_HEX.slice(Math.abs(h) % CHORD_HEX.length)
    .concat(CHORD_HEX.slice(0, Math.abs(h) % CHORD_HEX.length));

  return {
    source: "mock",
    protocol: PROTOCOL_ID,
    disclaimer: COSMETIC_DISCLAIMER,
    photos: { face: photos.face, body: photos.body },
    colorimetry: {
      season,
      temperature,
      contrast,
      chroma,
      harmony,
      palette,
      primaryHex,
      avoid: AVOID.map(color => ({ ...color }))
    },
    makeup: {
      faceShape,
      eyeShape,
      eyelinerType,
      shadowPlacement,
      blushPlacement,
      look,
      lipHex: primaryHex,
      blushHex: "#E29B88"
    },
    outfit: {
      style: outfitStyle,
      silhouette,
      accent
    },
    analyzedAt
  };
}
