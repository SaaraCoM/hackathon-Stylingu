# Flujo personal: arquitectura y contrato

1. Objetivo: cuenta → fotos de cara y cuerpo → análisis simulado → personalización → recuperación desde Postgres (Supabase).
2. Plataforma: SPA web responsive existente, también utilizable desde su contenedor móvil. Se conservan JavaScript y Express; la persistencia usa `pg` directo y las fotos Supabase Storage.
3. Dominio: la tabla `users` tiene preferencias y analysis opcional; `photos` guarda metadatos (los bytes viven en Storage), propietario y MIME; `sessions` conserva token opaco hasheado y caducidad. El análisis conserva photos, colorimetry (incluido avoid), makeup y outfit, source=mock y analyzedAt.
4. Arquitectura: shared/analysis.js y shared/personal-service.js sin HTTP; el repositorio SQL (`backend/src/db/repo.js`) concentra las consultas y el almacenamiento se inyecta (`shared/storage.js`). backend/src es el adaptador de transporte. No hacen falta clases adicionales.
5. Contrato: POST /api/personal/photos recibe {face, body} como data URLs PNG/JPEG/WebP (máximo 2 MiB cada una), devuelve {photos:{face,body}} con URLs privadas persistentes. Cuerpo vacío devuelve fotos actuales o 404. GET de cada referencia exige su sesión propietaria. Alias /api/auth/personal/* por compatibilidad.
6. POST /api/personal/analyze recibe {} y utiliza únicamente las fotos persistidas del usuario autenticado. Devuelve {analysis} y guarda atómicamente el resultado. GET /api/auth/perfil devuelve preferences y analysis completos; PUT acepta preferencias y/o un análisis válido asociado a las fotos propias. GET /api/auth/yo recupera la sesión.
7. Registro primero, finalización del análisis después: el formulario indica cuándo iniciar sesión. Sin agente externo: resultado determinista dependiente del usuario y las dos referencias, identificado siempre como simulación. Una fecha de ejecución no afecta las recomendaciones.
8. Seguridad: cookies HttpOnly/SameSite, fotos no públicas, límites de tamaño y firma, sin blob URLs persistidas ni secretos en frontend, errores visibles sin simular éxito, invalidación del análisis al cambiar fotos. Las fotos se guardan en Supabase Storage (bucket privado) en producción y en disco local solo en desarrollo.
9. Despliegue: Express sirve frontend/public en el mismo origen. `DATABASE_URL` y las claves de Storage viven solo en el entorno privado. No se despliega ni se hace commit.

## Diseño previo a desarrollo

Se extiende el modal existente «Nueva consulta»: dos campos etiquetados, previsualizaciones, aviso de simulación, acción Analizar fotos y resultados en tres bloques. Sin pestañas nuevas. Paleta y tipografía existentes (fondo crema, tinta oscura, acento terracota, sans del sistema). Dos columnas en escritorio y una en móvil; modal con scroll, foco visible, Escape y retorno del foco.

Estados: vacío pide ambas fotos; sin sesión permite abrir Mi cuenta; carga desactiva el envío y anuncia progreso; error conserva archivos y permite reintento; éxito confirma persistencia y ofrece volver al dossier. La foto de preview se documenta en evidencia/flujo-personal/preview.png.

## Validación prevista

### Acceso condicionado al análisis

Se oculta el shell completo mediante `hidden` desde el HTML inicial. Un único estado de acceso comprueba sesión, perfil recuperado y análisis completo; errores y cierre de sesión mantienen el bloqueo. El perfil local y el antiguo onboarding nunca conceden acceso. Se conservan los formularios existentes de cuenta y fotos, sobre un fondo sin contenido de la app. La pantalla previa usa los mismos colores y tipografía y solo ofrece iniciar sesión o subir las fotos; la vista previa es `evidencia/flujo-personal/preview-gate.png`. Se comprobarán carga lenta, cuenta sin análisis, fallo, éxito, recarga y logout en navegador.

Contrato determinista y validadores con node:test; HTTP con curl (registro, cookie, upload, análisis, perfil y aislamiento); navegación real con playwright-cli y snapshots; recarga de cuenta, móvil, consola y fallos de red. Postgres real (embebido en tests), sin sustituir persistencia por mocks.
