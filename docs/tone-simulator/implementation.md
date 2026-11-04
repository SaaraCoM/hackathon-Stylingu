# Probador de tonos sobre la foto

## 1. Arquitectura

Se sustituye la muestra de color por un componente React TypeScript con Tailwind, integrado en Makeup. El store sigue siendo propietario del análisis y la URL privada de la foto. No se cambian tablas, autenticación ni endpoints. MediaPipe Face Landmarker detecta una sola cara; Canvas aplica color exclusivamente a contornos detectados. Dos caras, falta de rostro, fotos pequeñas, errores de descarga y cambios de cuenta invalidan el resultado. No hay estimación fija de posiciones ni resultados ficticios.

El modelo y WASM se sirven desde la aplicación. No se envían fotos a Google ni a Meta para este probador. Los recursos se cargan al pulsar Preparar mi foto, se procesan en memoria y no se persiste el resultado. El usuario compara con el original y puede reintentar. Las coordenadas normalizadas se convierten a la resolución real de la foto para mantener alineación al redimensionar.

Modelo: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker
Integración: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js

## 2. Diseño

Preview previa al desarrollo: preview.png. Foto completa a la izquierda, controles a la derecha; una columna en móvil. Paleta visual de la interfaz existente: crema, rosa y tinta. Controles con etiquetas, indicadores numéricos, estado anunciado y comparación con aria-pressed. Carga, error y ausencia de foto explícitos. La simulación es orientativa, no garantiza un resultado cosmético idéntico.

## 3. Desarrollo

Componente de simulación separado del render de máscaras y del cargador facial. Reutilizar fotos privadas validadas; cargar el modelo bajo demanda. Mantener los IDs de los controles heredados para no romper renderizadores. Proteger resultados asíncronos frente a cambio de cuenta/foto y desmontaje.

## 4. Validación

Pruebas unitarias de geometría y composición; navegador con detección real sobre una foto editorial de prueba, cambio de intensidad, comparación de píxeles, móvil, fallo sin cara, acceso y limpieza de sesión. Las APIs de cuenta se simulan en la prueba; el detector y el render no. Build normal y gratuito, tipos, UX y revisión de CSP. No publicar por indicación expresa del usuario.

## Resultado verificado

- [x] Detección real en Chromium sobre la imagen editorial suministrada, con la CSP de producción.
- [x] Máscara de labios ajustada, color configurable, sombras, brillo y comparación con original.
- [x] Intensidades a cero devuelven exactamente los píxeles originales; el fondo no cambia.
- [x] Cambio de foto elimina el resultado anterior; imagen sin cara muestra error y desactiva controles.
- [x] Cierre de sesión oculta la interfaz privada.
- [x] Escritorio y móvil sin desbordamiento horizontal. Axe A/AA del probador: cero infracciones detectadas.
- [x] 24 comprobaciones UX existentes; cuatro pruebas de rutas privadas, geometría, transformación y recursos del runtime.
- [x] TypeScript, lint de archivos modificados y sintaxis correctos. Builds normal y gratuito correctos; Worker comprimido ~2,34 MB, recursos del detector separados como assets estáticos.
- [x] Sin despliegue.

Capturas: working-desktop.png y working-mobile.png. La persona de estas capturas es una referencia editorial del SVG, no la foto de una cuenta real. La detección de esa foto sí es real. No se ha probado en Safari/iOS o con la foto privada del usuario.

Reproducir desde raíz: `npm run build`, `npm --prefix frontend run typecheck`, `npm --prefix frontend test`, `node --test tests/svg-design-unit.mjs tests/tone-runtime.test.mjs`, `npm --prefix frontend run test:tryon`.

Limitaciones: vista orientativa 2D sobre una foto; no modifica la foto guardada ni genera una imagen mediante IA externa. Requiere una cara completa y suficiente resolución. Descarga inicial de modelo/WASM bajo demanda; no se incluyen en la precarga PWA para evitar una descarga grande al entrar. No se garantizan acabados cosméticos reales ni un ajuste perfecto en fotos ocluidas o muy de perfil.
