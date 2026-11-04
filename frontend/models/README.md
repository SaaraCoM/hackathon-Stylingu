# Face Landmarker

Modelo oficial de MediaPipe, descargado el 4 de noviembre de 2026 desde el enlace de la documentación de Google:
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task

SHA-256 del archivo fijado en este repositorio:
`64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`

Documentación y ficha del modelo: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker

Runtime fijado en package-lock: `@mediapipe/tasks-vision@0.10.22-rc.20250304` (Apache-2.0). El build copia su WASM y el modelo a `/vision/`; no descarga modelos durante la compilación. Las fotos se procesan en memoria en el navegador y no se transmiten al proveedor del modelo.

El build gratuito separa estos recursos del código Worker mediante VISION_ASSETS. La CSP permite compilar WebAssembly del mismo origen con `wasm-unsafe-eval`, sin permitir evaluación arbitraria de JavaScript ni scripts de un CDN.
