# Conversión del SVG a interfaz funcional

## 1. Arquitectura

Objetivo: incorporar las cinco vistas del SVG a la web/PWA de StylingU. Plataforma de este cambio: web responsive. Stack: React + TypeScript para los componentes nuevos, Tailwind compilado y esbuild; servicios JavaScript actuales conservados.

El dominio sigue siendo cuenta, análisis, paleta, maquillaje, prendas, planes y evaluación de compras. No cambian tablas, migraciones, autenticación por cookie ni contratos HTTP. Un adaptador conecta React al store y a las acciones existentes. Los paneles especializados existentes se alojan en componentes React para conservar sus formularios, listeners y validaciones. React controla la navegación y la presentación; los servicios actuales siguen siendo dueños de los datos.

Estructura: frontend/src/design para componentes, tipos, adaptador y CSS; scripts/build-design.mjs para compilación; frontend/public/js/design-app.js y design-app.css como artefactos. Los dos builds existentes compilan esta entrada antes de empaquetar recursos. No se despliega en este cambio.

Riesgos: colisión de estilos (prefijo Tailwind y ausencia de preflight global), doble propiedad del DOM (React no reconcilia los hijos del contenedor de paneles heredados), exposición de datos ficticios (solo store de cuenta para resultados), navegación antigua (evento de sincronización). Las fotos del SVG solo sirven como imágenes editoriales claramente identificadas.

## 2. Diseño y preview

Referencia: source-preview.png, render del SVG proporcionado antes del desarrollo. Cinco vistas: Inicio, UColors, Makeup, Outfits, AIShoppie. Fondo #F6F2EC, tinta #373530, rosa #EAD8D3, salvia #E9ECDF, tarjetas claras, bordes discretos. Serif editorial para títulos y sans para controles. Reutilizar fuentes ya cargadas, sin nuevos servicios externos.

En móvil se apilan tarjetas y la navegación puede desplazarse horizontalmente; controles táctiles y foco visible. No se reproduce el clima, nombre, estadísticas ni afinidades ficticias del SVG. Estados: carga y errores mediante flujos existentes, vacíos explícitos por falta de datos, confirmaciones mediante status/toast. Imágenes con texto alternativo, navegación con nombre accesible y destino activo, títulos semánticos.

## 3. Desarrollo

Integración incremental siguiendo la adopción de React en páginas existentes: https://react.dev/learn/add-react-to-an-existing-project. Tailwind se compila localmente: https://tailwindcss.com/docs/installation/tailwind-cli.

## 4. Validación prevista

Build de producción, suite UX existente, prueba de navegación de cinco vistas, acciones conectadas, aislamiento de sesión, viewport móvil/escritorio y revisión básica con axe. Las comprobaciones locales no verifican inferencia IA ni despliegue.

## Resultado y reproducción

- [x] React y Tailwind compilados localmente, sin CDN de ejecución.
- [x] Cinco destinos funcionales; paneles existentes conservados dentro de React.
- [x] Fotos editoriales extraídas del SVG y optimizadas; resultados personales proceden del store.
- [x] TypeScript estricto, 58 archivos JavaScript con sintaxis válida.
- [x] Suite UX existente: 24/24 comprobaciones.
- [x] Prueba unitaria de rutas privadas: acepta únicamente el contrato actual y rechaza URLs externas, traversal y esquemas ejecutables.
- [x] Chromium: cinco vistas en 1440 y 390 px, sin desbordamiento horizontal; selección y descarga de paleta; escáner; privacidad tras cierre de sesión; sin errores JavaScript.
- [x] Axe WCAG A/AA en Inicio: sin infracciones detectadas. No equivale a una auditoría completa de todos los formularios heredados.

Comandos desde raíz: `npm run build`, `npm --prefix frontend run typecheck`, `npm --prefix frontend test`, `node --test tests/svg-design-unit.mjs`, `node tests/svg-design-browser.mjs`.

Capturas en `browser/`: contienen un perfil de prueba y respuestas HTTP simuladas. No acreditan una sesión real, inferencia IA, cámara física ni despliegue. La fidelidad al SVG se adapta a los datos disponibles: no se añaden porcentajes de afinidad, catálogo o prendas ficticias. Los formularios especializados siguen siendo JavaScript existente; la nueva composición, navegación y tarjetas son componentes React TypeScript.

Rendimiento: se conservan solo dos imágenes editoriales optimizadas, no se sirve el SVG original de 9 MB. React se empaqueta minificado, Tailwind genera CSS estático y las tarjetas inferiores cargan imágenes de forma diferida. Sin cambios en tablas ni endpoints; no hacen falta migraciones.
