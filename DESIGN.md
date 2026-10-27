---
name: StylingU Atelier — Warm Editorial Quiet Luxury
description: Sistema propio del shell PWA (frontend/public). Base alabastro cálida, tinta espresso, terracota como único acento, serif editorial + sans humanista, hairlines y sombras escasas. Sin CDN ni imágenes externas: abre offline.
archetypes:
  primary: claude — warm-canvas editorial (tinted cream canvas, serif display 400 + humanist sans, hairline borders, shadow rare, radius md 8 / lg 12 / pill)
  secondary: oura — warm-paper wellness (earth-tone accents kept off buttons, pill CTAs, hairline rules, photography restraint)
colors:
  bg: "#FFF8F6"
  surface: "#FFFFFF"
  sand: "#F5EFEB"
  line: "#E4DDD7"
  ink: "#211A17"
  muted: "#524340"
  primary: "#865044"
  primary-soft: "#C98A7B"
  blush: "#E8D5CE"
  olive: "#58624B"
  olive-soft: "#D4DEC2"
  input: "#FDFCFC"
  error: "#93000A"
  focus-ring: "rgba(201,138,123,.18)"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(28px,4vw,44px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.01em"
  h2:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "~22px (1.5em base navegador)"
    fontWeight: 700
    lineHeight: 1.25
  h3:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: 17px
    fontWeight: 400
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.55
  small: 13px
  tiny: 12px
  micro: 11px
  label: 10px
rounded:
  card: 12px
  inner: 10px
  bar: 6px
  modal: 16px
  sheet: 20px
  pill: 9999px
spacing:
  base: 4px
  card-padding: 20px
  gap: 16px
  gap-sm: 8px
  gap-md: 10px
  gap-lg: 12px
  row: 20px
  section: 24px
  max-width: 1120px
  topbar: 64px
  main-bottom: 96px
---

## Overview

Warm Editorial Quiet Luxury para un atelier personal: santuario editorial, lujo silencioso, estética spa/atelier. La tensión que lo hace propio (regla de una sola marca por artefacto): **tinta espresso + terracota sobre alabastro**, con el oliva botánico solo en datos secundarios — nunca en botones.

Referencias del catálogo (tokens y proporciones, jamás sus marcas, logos o copy):
- Primaria `claude`: canvas crema teñido, display serif en 400 con tracking negativo, hairlines en vez de sombras, coral escaso en CTAs, radios jerárquicos (botón 8 / card 12 / pill).
- Acento `oura`: tierras (oliva/salvia/mostaza) fuera de los botones, pills totalmente redondeadas, mundo crema + mundo tinta solo en overlays.

Diferencias deliberadas con ambas: sin modo oscuro, sin fotografía (campos planos de color locales), un solo acento de datos (terracota) y un solo botón primario por pantalla.

## Colors

### Superficie
- **Base** `#FFF8F6`: fondo de página. Cálido, nunca blanco puro.
- **Surface** `#FFFFFF`: cards elevadas y sheet/modal.
- **Sand** `#F5EFEB`: paneles anidados (`card sand`), pistas de barra, estados vacíos.
- **Input** `#FDFCFC`: fondo de campos de texto.
- **Line** `#E4DDD7`: hairline `1px solid` en cards, filas, inputs y tracks.

### Texto
- **Ink** `#211A17`: titulares y texto principal. Espresso, nunca negro puro.
- **Muted** `#524340`: texto secundario y descripciones.
- Contraste AA verificado por inspección sobre base y surface (tinta, muted y primario).

### Acento (presupuesto: un solo hue en datos + una acción primaria)
- **Primary** `#865044`: terracota profundo. Kicker, armonías `%`, tags, foco de selección, `zoneScore`. Texto sobre base/surface.
- **Primary-soft** `#C98A7B`: rellenos de barra y subrayado del tab activo. Nunca como texto (no pasa AA sobre claro).
- **Blush** `#E8D5CE`: chips y fondos suaves (mezclado al 45% con blanco en `.pill`).
- **Olive** `#58624B` / **Olive-soft** `#D4DEC2`: acento botánico secundario (un swatch nuclear, fondos de afirmación). Nunca en botones.
- **Error** `#93000A`: solo texto de error inline (`consultError`, `obError`).

### Sombras (escasas, como `claude`: color-block primero)
- Reposo card: `0 4px 24px -2px rgba(45,37,34,.04)`.
- Overlay (modal): `0 16px 40px -4px rgba(45,37,34,.08)`; sheet: `-8px` ascendente equivalente.
- Topbar glass: `rgba(255,248,246,.85) + blur(16px)` — única superficie glass, es la barra sticky.

## Typography

Dos familias, como en ambas referencias (serif para sentir, sans para leer):
- **Display/encabezados**: `Playfair Display, Georgia, serif`. H1 con `clamp(28px,4vw,44px)` y `text-wrap:balance`; H2 serif ≈22px; H3 serif 17px. Nunca en negrita decorativa extra.
- **UI/texto**: `Plus Jakarta Sans, system-ui, sans-serif`. Cuerpo 15px/1.55; pequeña 13px; mini 12px; micro 11px; label 10px negrita.
- Mayúsculas con tracking (`0.06–0.12em`) solo en kicker, bottomnav y micro-etiquetas; el resto en caja oración.
- Cifras comparables (`%` armonía, scores) con `font-variant-numeric:tabular-nums`.
- Sin fuentes externas: stacks del sistema para abrir offline; nada se exige por red.

## Layout

- Mobile-first: topbar 64px sticky + bottomnav fija de **4 destinos** (Color, Armario, Makeup, Piel) con `padding-bottom:env(safe-area-inset-bottom)`; contenido con `padding-bottom:96px` para que el footer fijo nunca tape el foco.
- Desktop: columna centrada `max-width:1120px`, márgenes 20px; hero editorial asimétrico 5+7 (`grid cols-5-7`); pares 1+1 (`grid cols-2`); swatches 6-up (3-up en móvil).
- Ritmo: gap único 16px entre cards/bloques, 8–12px dentro; card padding 20px.
- Secciones con `scroll-margin-top:80px` por la topbar sticky.
- Tabs con crossfade `translateY(4px)` 200ms; contenido con scroll de página (sin scroll infinito ni paneles con scroll interno).

## Shapes

| Token | Valor | Uso |
| --- | --- | --- |
| `card` | 12px | Cards, topbar-inner no aplica, sheet desktop |
| `inner` | 10px | Swatch-card, detail, prod-row, avoid-row, cell |
| `bar` | 6px | Barras de croma/temperatura y quad |
| `modal` | 16px | Diálogo de consulta |
| `sheet` | 20px (móvil: solo arriba) | Onboarding primera vez |
| `pill` | 9999px | Botones, chips, toast, badge, dot de preview (24–40px) |

## Components (estados incluidos)

- **Topbar** (64px, sticky, glass): marca `stylingu Atelier` (`translate=no`) + `Guardar paleta` (fantasma) + `Nueva consulta` (primario). Foco visible siempre.
- **Hero**: kicker de temporada + H1 personalizable (`heroTitle`) + subtítulo (`heroSub`) + pill de estación. El H1 es el único por vista.
- **Bottomnav**: 4 tabs (`role=tab`, `aria-controls`, roving `tabindex`), activo en primario con indicador `primary-soft` 2px; resto en muted. Navegables con ←/→/Home/End.
- **Tabpanel**: `role=tabpanel`, etiquetado por su tab, `tabindex=0` para scroll por teclado.
- **Botón primario**: pill espresso + texto base; hover terracota + elevación 1px; foco anillo primario.
- **Botón fantasma/chip**: borde hairline; seleccionado (`aria-pressed=true`) invierte a espresso.
- **Card / card sand**: surface o sand, hairline, padding 20px, radio 12px.
- **Swatch-card**: radio 10px sobre sand; dot 40px; nombre 12px + hex 11px + armonía 10px en primario; seleccionada (`aria-pressed`) fondo blanco + borde primario.
- **Detail**: dot 24px + nombre/desc + acción a la derecha.
- **Avoid-row**: dot 28px + causa 12px + alternativa en negrita.
- **Prod-row** (labiales/colorete): dot 24px + nombre 13px + acabado 12px + tag 11px en primario.
- **Quad** (mirada): 2 columnas, barra 28px + nombre 12px + rol 11px.
- **Outfit list**: filas `Etiqueta: detalle` 13px sobre surface con hairline.
- **Bars/track**: pista 8px en sand, relleno terracota (72% croma, 84% temperatura) con `role=img` y lectura para AT.
- **Chips/pills**: blush al 45% + borde hairline + texto espresso 12px.
- **Input**: `#FDFCFC`, hairline, radio 8px, `focus-visible` con anillo `rgba(201,138,123,.18)`; error inline `role=alert` + foco al campo.
- **Empty**: borde dashed sobre sand, título 14px + copy 13px + CTA primario (armario vacío).
- **Toast**: pill espresso con texto base, `role=status` + `aria-live=polite`, transición explícita `opacity/transform .25s`; mensajes con siguiente paso.
- **Modal consulta**: overlay con `overscroll-behavior:contain`, caja 16px máx 420px; Esc/overlay cierran, foco al input y retorno al invocador; exige nombre (error inline, sin dossier vacío).
- **Sheet onboarding**: bottom-sheet móvil / centrado desktop, radio 20px; 4 pasos con `aria-live` en el indicador, validación en paso 1, chips con `aria-pressed`, `Esc` = omitir; guarda `stylingu-profile` en local.
- **Skiplink**: oculto hasta `:focus-visible`, salta a `#contenido`.

## Do / Don't (de la casa)

- Un acento en datos (terracota) + una acción primaria por pantalla; el oliva nunca es botón.
- Separación por tono (base/surface/sand) y hairlines; nada de bordes negros ni sombras duras.
- Sin gradientes decorativos; sin iconos en pastillas teñidas; sin mayúsculas diminutas fuera de kickers/labels.
- Proporción, no decoración: el H1 clamp manda; las cards respiran a 20px.

## Responsive

- ≤700px: swatches 3-up; sheet a ancho completo pegado abajo; bottomnav 4 columnas 11px.
- ≥700px: sheet centrado con radio 20px completo.
- ≥900px: grids 5+7 y 1+1; hero hasta 44px.
- Touch: `touch-action:manipulation`, tap-highlight transparente con foco visible retenido, dianas ≥44px (cards/swatches/filas completas clicables).
- `prefers-reduced-motion:reduce` apaga animación, transición y hover-lift sin perder contenido.

## Datos (fuente única)

Toda la UI renderiza desde `frontend/public/data.js` (`window.STYLINGU_DATA`): paleta 6 + evitar 3 + tejidos 3 + looks 3 + labiales 3 + coloretes 3 + cuarteto 4 + silueta 4 + conjuntos 3×4 piezas + zonas 4 + rutinas AM/PM 4+4. Persistencia solo en `localStorage` (`stylingu-profile`, `stylingu-palette`, `stylingu-outfits`, `stylingu-checkins`) con lectura segura ante JSON corrupto.

## Reglas de puerta

- `lint.mjs --app`: 0 FAIL (WARN vigentes solo de marca: kicker editorial, un glass en topbar, sombras en topbar/cards/overlays, guiones en copy español).
- `inspect.mjs --app`: no corre en este entorno (Chrome sale con código 0); pendiente con navegador real.
- `web-design-guidelines`: skip link, tabs con teclado, live regions, labels, `theme-color`, `color-scheme:light`, foco visible, sin `outline:none`, zoom intacto.
