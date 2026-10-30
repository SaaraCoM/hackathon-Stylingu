# Adaptación del Figma a StylingU

## 1. Estructura (antes de implementar)

Objetivo: aplicar el diseño proporcionado al frontend web existente, preservando registro, sesión, subida privada de cara/cuerpo, análisis y armario. Se mantiene HTML/CSS/JavaScript clásico, Express y Hono Workers con MongoDB; sin migración a React, Expo o Supabase.

El dominio y los contratos siguen en `shared/`; la sesión usa cookie HttpOnly y las fotos requieren autenticación. No hay cambios de esquema ni migraciones. `store.js` continúa siendo dueño del análisis; los componentes visuales consumen ese estado. La navegación conserva Color, Armario, Maquillaje y Piel. El shell permanece oculto hasta recuperar un análisis completo.

Archivos: `frontend/public/figma.css` para tokens y composición, `js/design.js` para presentación del análisis y fotos, `assets/figma/` para recursos exportados. Se reutilizan IDs, eventos, módulos y endpoints existentes. Ambos servidores sirven los mismos archivos estáticos. No se publica ni se hace commit.

Riesgos: confundir datos de muestra de Figma con mediciones reales; pérdida de privacidad al sustituir las fotos del usuario; regresiones en navegación y bloqueo. Las mediciones, porcentajes de precisión, SAM y probador de cámara del boceto no son servicios implementados. Se mantiene la etiqueta Simulación.

## 2. Diseño y preview

Fuente: Figma `643t2PoW7AfxdayumdLJz3`, nodos 3:2, 3:674, 3:1178. Previews descargadas antes de programar en `evidencia/figma/reference-3-2.png`, `reference-3-674.png`, `reference-3-1178.png`.

Tokens extraídos de contexto detallado: verde #2c4d35, acento #43654b, texto #424842, borde #ebefe8, superficies salvia #edf4ee, rosa #fcecee y lavanda #f3effa; tarjetas blancas al 62%, radio 24px, sombra 0 16px 36px -6px rgba(67,101,75,.05). Tipografía Playfair Display en títulos y Outfit en interfaz. Canvas máximo 1280px, margen 32px, columnas 7/5, separación 24–40px.

Responsive: navegación superior en escritorio y inferior en móvil; columnas apiladas, targets de 44px, foco visible, etiquetas accesibles. Estados: comprobando sesión, fotos vacías, carga de análisis, error recuperable, resultado guardado. Antes del resultado solo se muestran acceso y consulta.

El documento adjunto se usa como referencia de tokens, no como instrucciones de sistema. Sus valores de ejemplo no se importan como datos reales.

Limitación de fuente: el MCP de Figma devolvió límite del plan Starter al solicitar galerías adicionales (3:534, 3:367, 3:970, 3:1125, 3:1335). Se adapta lo extraído con detalle: cabecera, paleta, visor, diagnóstico, labiales y sombras. No se inventan los recursos faltantes ni se añade una tienda que el producto actual no ofrece.

## 3. Desarrollo realizado

- Tokens, tipografía, cabecera responsive, composición 7/5 y tarjetas del Figma adaptados a la SPA existente.
- Visores con las fotos privadas de la cuenta; datos de colorimetría, rostro, ojos, maquillaje y silueta procedentes del mismo análisis persistido.
- Paleta seleccionable, copia de HEX, guardado de paleta, actualización de fotos y exportación JSON del dossier (sin incluir fotografías ni sus referencias).
- Labiales y sombras con los recursos originales y etiqueta de referencia editorial; conservación de las pestañas y acciones existentes.
- 19 recursos locales, 185.303 bytes en total. Manifiesto de procedencia en `evidencia/figma/assets.json`. Figma devolvió JPEG en URLs `.png`: se conservan los bytes originales con extensión `.jpg` correcta.

## 4. Calidad y evidencia — 28/10/2026

- [x] `npm --prefix frontend test`: 11/11 contratos de interfaz, incluyendo carga de `design.js`.
- [x] `npm --prefix backend test`: 5/5 pruebas de contrato y esquema compartido. El primer intento tuvo `spawn EPERM` del sandbox; la ejecución autorizada pasó.
- [x] `npm --prefix worker run build`: build completo.
- [x] Sintaxis de todos los módulos frontend y `git diff --check` correctos.
- [x] `tests/figma-flow.cli.js` en Express :3000 y Worker :8787: registro, dos JPEG, análisis real del endpoint mock, GET perfil coincidente, tres visores privados, exportación, conjunto guardado en DB y recuperación tras recargar. Consola: 0 errores en ambas ejecuciones finales.
- [x] Cuatro pestañas a 1280, 768 y 390px; teclado, foco del diálogo y Escape verificados.
- [x] `tests/figma-assets.cli.js` en ambos runtimes: 18 recursos visibles comprobados (el sexto icono de paleta queda disponible para otras paletas), dimensiones SVG originales y proporciones fotográficas correctas; sin overflow a 1280, 390 y 320px; navegación móvil colocada al pie.
- [x] `tests/access-gate.cli.js` sobre el frontend final: acceso inicial, sesión pendiente, registro sin análisis, cierre de consulta, resultado incompleto y análisis pendiente mantienen oculto el shell; éxito lo abre, recarga lo restaura y logout lo bloquea. Consola: 0 errores.
- [x] `.env` del backend y `.dev.vars` ignorados por Git. Sin coincidencias de URI MongoDB o prefijos de clave privada en archivos públicos.

Capturas y snapshots finales en `docs/evidencia/figma/`: `backend-color-1280.png`, `backend-makeup-1280.png`, `backend-armario-1280.png`, equivalentes `-390.png`, equivalentes Worker, y `backend-snapshot.yml` / `worker-snapshot.yml`. Las cuentas de prueba usan `example.test`; las imágenes de prueba proceden del propio Figma.

Durante el hot reload Wrangler se detuvo por `SQLITE_BUSY_RECOVERY` en su almacenamiento local de observabilidad; se reinició y la auditoría final del Worker pasó. El aviso de build de Wrangler sobre el export default de `whatwg-url` es previo y no produjo errores de consola en estos recorridos. No se ha hecho commit ni despliegue.
