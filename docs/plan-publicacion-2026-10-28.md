# StylingU: arquitectura de la primera web publicable

Fecha: 2026-10-28. Estado: diseño previo a implementación. El informe aportado es el alcance; la evidencia ejecutable determina el estado de cada entrega.

## 1. Objetivo y plataformas
Web responsive móvil y escritorio: cuenta, preferencias corregibles, análisis fotográfico, tutoriales, inventario y calendario, catálogo verificable y escáner con recomendación explicada. PWA con caché solo de recursos públicos. iOS/Android nativos quedan para una entrega posterior.

## 2. Stack y estructura
Conservar JavaScript ESM, frontend/public (fuente única), shared (contratos y dominio), MongoDB/Mongoose y backend/src (Express). Evitar una migración a TypeScript/React que no aporta valor a este alcance. Express sirve API y frontend bajo el mismo origen; backend/src/server.js inicia HTTP, backend/src/index.js exporta la aplicación sin efectos al importar. Un proceso Node separado ejecuta trabajos persistidos en MongoDB. Worker y Vercel son adaptadores secundarios, no destinos anunciados para esta entrega.

Añadir shared/product-domain.js (validadores y reglas), shared/product-models.js (persistencia), shared/product-service.js (casos de uso); backend/src/routes/product.js (adaptador), backend/src/jobs.js (ejecutor); frontend/public/js/product.js (perfil/armario/tutoriales) y scanner.js (cámara). Tests por dominio e integración HTTP. docs/evidencia contiene previews y resultados; scripts genera distribución y comprueba sintaxis.

## 3. Modelo de dominio y datos
User conserva sesión y preferencias heredadas; profile contiene versión, declaraciones (cabello, ojos, párpado, estilo, acabado, intensidad, presupuesto/moneda, restricciones), correcciones y fecha. Analysis conserva identificador, versión de esquema/perfil, procedencia, atributos inferidos, limitaciones y fecha. Las fotos vigentes se separan del análisis anterior para poder mantenerlo visible mientras se actualiza.

Garment pertenece a usuario: categoría, colores, temporada, ocasiones, disponibilidad y restricciones. OutfitPlan pertenece a usuario/fecha local/zona horaria: referencias a prendas, firma canónica de combinación, versión de perfil y estado. Índice único usuario-fecha; no inventar prendas propias. Si no existen siete combinaciones válidas, devolver capacidad insuficiente y las disponibles.

Product, ProductVariant y ProductOffer separan familia, tono y oferta. Cada dato comercial lleva fuente y revisión; un dato ausente queda desconocido. OwnedCosmetic, RecommendationFeedback y TutorialProgress son privados por propietario. AnalysisJob lleva estado durable, clave idempotente, hash de solicitud, versión de entrada, tiempos y resultado/error. Índice único usuario-clave. No reintentar automáticamente un trabajo cuyo proceso murió tras llamar al proveedor: estado incierto evita cobrar dos veces.

## 4. Contratos, autenticación y navegación
Mantener cookies HttpOnly/SameSite y obtener siempre usuario desde sesión. Todas las consultas privadas filtran propietario; errores estables y no-store en API. Conservar rutas existentes; añadir PATCH /api/profile; POST /api/personal/analysis-jobs; GET /api/jobs/:id; CRUD /api/garments; GET/POST /api/outfit-plans; GET /api/products; POST /api/scans; POST /api/purchase-recommendations; POST /api/recommendation-feedback; GET/POST /api/owned-cosmetics; tutoriales y borrado de cuenta. No permitir HTML/CSS/JS del modelo.

Cuatro destinos estables: Color, Maquillaje, Armario, Compras. Perfil corregible en Color; inventario y semana en Armario; pasos y progreso en Maquillaje; escáner independiente en Compras. Acceso a cuenta y privacidad siempre predecibles. Estado local separado por usuario; evitar migrar datos anónimos a cuentas. Las respuestas tardías se descartan por identidad y generación de solicitud.

## 5. Servicios y consistencia
Proveedor Meta existente detrás de meta-client; capacidades significan configuración, no credencial verificada. Mantener respuesta anterior y marcar obsolescencia mediante versiones. Presupuesto cambia recomendaciones de compra sin volver a procesar fotografías; cambios visuales invalidan recomendaciones visuales. Jobs se guardan antes de responder 202 y se reclaman atómicamente por un proceso separado; sin promesas en segundo plano después de HTTP.

El catálogo inicial será pequeño y con referencias oficiales verificadas. Reconocimiento produce candidatos, requiere confirmación de variante y nunca fabrica identificadores. Código de barras nativo si está disponible, captura deliberada y búsqueda manual como alternativas; cámara trasera, cierre de tracks y exclusión de resultados antiguos. Sin envío continuo de vídeo. Reglas deterministas para presupuesto/duplicidad/preferencias; ingredientes incompletos nunca significan apto para alergias.

## 6. Seguridad, despliegue y riesgos
Renderizar contenido variable con textContent. Decodificar y normalizar fotografías, limitar píxeles/tamaño y eliminar EXIF. Borrado cubre fotos, análisis, inventarios, historial, trabajos y sesiones. Logs sin imágenes, credenciales o prompts personales. Mock prohibido en producción. Recuperación de contraseña requiere transporte de correo configurado y tokens de un solo uso; no se simulará un envío exitoso.

Node 22, lockfile y npm ci; HTTP y ejecutor durable separados, MongoDB compartido, HTTPS y secretos de servidor. Liveness independiente de readiness de base de datos. Índices reproducibles, distribución generada, versión de release y rollback documentado. Limitador por IP en proceso no equivale a cuota global: añadir control persistente al trabajo costoso y documentar protección de borde necesaria al escalar.

Riesgos principales: acceso efectivo a Meta, catálogo incompleto por mercado, costes de IA, concurrencia entre perfil/fotos/jobs, pruebas de cámara en dispositivos reales, conservación y eliminación durante trabajos en curso. No declarar despliegue, envío de correo ni integración externa verificados sin ejecutarlos.

## 7. Validación
Tests de contratos y reglas (incertidumbre, preferencias, siete combinaciones únicas), aislamiento de usuarios, idempotencia y resultados tardíos, renderizado seguro, logout fallido, errores de proveedor y DB. Integración HTTP y Mongo local cuando exista runtime disponible. Navegador: teclado, responsive, estados vacíos/error y cámara denegada/alternativa. Verificación real de proveedor/cámara móvil/publicación se informa por separado.

## Fuentes consultadas
- https://dev.meta.ai/docs/api-reference/responses/schemas
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API
- https://vercel.com/docs/frameworks/backend/express
- https://www.maybelline.com/lip-makeup/lip-gloss/pink-lip-gloss
