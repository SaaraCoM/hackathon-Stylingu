# DESIGN.md — StylingU Atelier

Sistema propio portado de `stitch_stylingu_beauty_styling_app.zip` (`code.html` + `DESIGN.md` original).
Se elimina Tailwind por CDN y las imágenes externas (`googleusercontent`) para que el shell abra offline.

## Paleta (tokens CSS en `frontend/public/styles.css`)

| Rol | Hex | Uso |
| --- | --- | --- |
| `--bg` | `#FFF8F6` | Base alabastro cálido |
| `--surface` | `#FFFFFF` | Cards elevadas |
| `--sand` | `#F5EFEB` | Paneles anidados |
| `--line` | `#E4DDD7` | Bordes hairline `1px solid` |
| `--ink` | `#211A17` | Texto (espresso, nunca negro puro) |
| `--muted` | `#524340` | Texto secundario |
| `--primary` | `#865044` | Acento terracota profundo |
| `--primary-soft` | `#C98A7B` | Terracota focos, barras activas |
| `--blush` | `#E8D5CE` | Chips, fondos suaves |
| `--olive` | `#58624B` | Acento secundario botánico |
| `--olive-soft` | `#D4DEC2` | Fondo afirmaciones |

Sombras: reposo `0 4px 24px -2px rgba(45,37,34,.04)`; modal `0 16px 40px -4px rgba(45,37,34,.08)`.
Glass topbar: `rgba(255,248,246,.85) + blur(16px)`.

## Tipografía

- Display: `Playfair Display, Georgia, serif` — 56/44/36/28/22px, tracking -0.02em.
- UI/Texto: `Plus Jakarta Sans, system-ui, sans-serif` — 20/18/15/13px + labels 12/10px uppercase 0.08em.
- Sin fuentes externas: se usan stacks del sistema para abrir offline; si hay red, el shell no las exige.

## Layout

- Mobile-first: topbar 64px sticky + bottom nav fija (5 destinos: Inicio, Color, Armario, Makeup, Piel).
- Desktop: contenedor `max-width 1120px`, grid 12 cols, hero editorial asimétrico 5+7.
- Secciones con `56px` de ritmo vertical, radios `8/12px`, pill `9999px` solo en chips y botones primarios.
- Tabs con crossfade `translateY(4px)` 200ms; contenido con scroll interno, sin scroll infinito.

## Componentes

- Botón primario: pill espresso `#211A17` + texto `#FFF8F6`; hover terracota.
- Botón fantasma: borde hairline, hover wash `#F5EFEB`.
- Card: superficie blanca, borde hairline, padding `20px`.
- Swatch: círculo 36px con borde interior, tooltip con nombre+hex.
- Chip: pill `#E8D5CE` 40% + texto espresso.
- Input: fondo `#FDFCFC`, borde `#E4DDD7`, foco anillo `rgba(201,138,123,.18)`.
- Toast + modal de nueva consulta incluidos en el shell.

## Reglas (web-design-guidelines)

- Contraste AA en texto; foco visible en tabs, botones y nav.
- Sin gradientes decorativos salvo scrim sobre foto local; fotos actuales son placeholders SVG locales.
- Un `h1` por vista; cada tab con heading propio; iconos con `aria-label`.
