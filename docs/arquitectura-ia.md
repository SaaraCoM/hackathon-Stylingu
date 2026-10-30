# Integración IA de StylingU — 28/10/2026

## 1. Arquitectura

Objetivo: sustituir el analizador simulado por visión real sobre cara y cuerpo; conservar la SPA web y la API compartida Express/Hono. No se migra el stack ni se crean pestañas. La navegación y el bloqueo previo al análisis se mantienen. No se prepara una app nativa en esta entrega.

Dominio: cuenta, fotos privadas, cuestionario cosmético declarado, análisis, conjuntos, segmentaciones y vistas generadas. MongoDB almacena fotos y resultados vinculados a la cuenta. Extensión aditiva del subdocumento `analysis`: source/meta, modelo, cuestionario, notas, tres outfits, rutinas, instrucciones visuales, segmentaciones y previews. Los campos colorimetry/makeup/outfit/photos existentes siguen siendo canónicos. Los análisis mock antiguos se pueden leer, siempre etiquetados.

Módulos: `shared/ai-contract.js` (schema, validación, prompt), `shared/meta-client.js` (HTTP oficial, límites, errores), `shared/personal-service.js` (orquestación/persistencia), rutas finas por runtime y `frontend/public/js/ai.js` para acciones de la consulta. Claves únicamente en configuración del servidor. No se envían email, contraseña ni nombre al modelo; sí las fotos y respuestas necesarias del cuestionario.

API: se conservan POST /api/personal/photos, /analyze y GET /analysis; se añaden GET /capabilities, POST /segment y /preview con equivalentes /api/auth/personal. Todas requieren sesión. Las fotos opcionales de prendas se añaden como `garments` (hasta 2). Análisis recibe `userMeta` (tipo de piel declarado, alergias y preferencias). La app avisa del envío a Meta antes de analizar.

Servicios: Muse Spark para análisis JSON validado; SAM 3.1 para cajas y máscaras codificadas; Muse Image para imágenes editadas. La orquestación es código servidor; Muse Code es un agente de desarrollo y no se ejecuta en peticiones web. SAM y generación se activan a petición desde la consulta; su fallo no borra un análisis válido. Los errores del proveedor no se sustituyen por un mock. Modo mock exclusivamente por AI_PROVIDER=mock.

Autenticación: cookies HttpOnly existentes, acceso a imágenes por userId. Persistencia condicional sobre referencias de fotos evita sobrescribir análisis de otra subida. Los resultados del proveedor se validan y se presentan como texto, nunca HTML. Respuestas y imágenes con límites de tamaño/tiempo; llamadas solo al origen oficial, sin redirecciones. Rate limit de operaciones IA. Sin migración destructiva, commit ni despliegue; ambos runtimes publican el mismo frontend.

Riesgos: inferencias visuales inciertas, iluminación, alergias sin catálogo INCI verificable, costes y tiempos de generación, cuotas del proveedor. No se infiere identidad, etnia ni diagnósticos. Con alergias declaradas se retienen rutinas de ingredientes y se requiere revisión de composición; nunca se garantiza seguridad de derivados ni se presenta bakuchiol como seguro universalmente. Los valores clínicos o erróneos del vocabulario legacy no se solicitan al modelo real.

## Verificación del proveedor

- https://dev.meta.ai/docs/overview — base https://api.meta.ai/v1, Bearer, modelos Muse Spark/Image/SAM.
- https://dev.meta.ai/docs/structured-output — Responses usa text.format; JSON Schema estricto y validación local.
- https://dev.meta.ai/docs/image-understanding — imágenes inline en mensaje user.
- https://dev.meta.ai/docs/media-segmentation y /sam/reading-segmentation — SSE, cajas y máscaras; cero coincidencias es válido.
- https://dev.meta.ai/docs/image-generation — edición JSON con images[].image_url; mask y seed no soportados. No se pasan esos parámetros ni sintaxis ficticia --mask.
- GET /v1/models real: HTTP 200 con la clave existente; presentes muse-spark-1.3, muse-image-1.0, sam-3.1. Nunca se imprime la clave.

## 2. Diseño

Se conserva Figma: paleta salvia/lavanda, Outfit y Playfair Display, modal de consulta. Se añaden tipo de piel declarado, alergias y preferencias, prendas opcionales; estados comprobando proveedor, enviando fotos, analizando, error recuperable, resultado IA y generación pendiente. La consulta muestra botones para segmentar una zona o generar referencias de maquillaje/vestimenta, con resultados privados. Las recomendaciones de Piel pasan al resultado IA; las muestras se etiquetan si no hay datos reales. Preview previa a código en `docs/preview-ia.html` y `docs/evidencia/ia/preview.png`.
