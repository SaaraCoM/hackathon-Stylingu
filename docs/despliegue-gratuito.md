# StylingU en planes gratuitos

## Arquitectura acordada

La usuaria ha elegido mantener Cloudflare gratuito y no copiar datos locales.
Se conservan la SPA editorial, navegación, contratos /api, sesiones de Express,
modelo Postgres y fotos privadas ya creados en el proyecto Stylingu. La base
empieza vacía. El staging existente con Supabase Auth queda independiente.

Cloudflare Worker sirve los 36 archivos públicos y reenvía /api a una Edge
Function de Supabase. No se usan Containers, Hyperdrive de pago ni Docker.
El build empaqueta los recursos del frontend; verifica tamaño comprimido dentro
del límite gratuito antes de desplegar. El Worker conserva el dominio propio
workers.dev y las cookies HttpOnly en ese origen.

La Edge Function reutiliza backend/src y shared. Supabase inyecta internamente
SUPABASE_DB_URL y claves de Storage; no es necesario exportarlas al ordenador.
META_AI_API_KEY se configura como secreto en Supabase. La aplicación valida
sesiones y propietarios; no se convierte el MCP en una API pública. La función
acepta invocaciones públicas porque implementa su propia autenticación; registro
y login siguen validados y los endpoints privados mantienen requireUser.

Adaptadores: imágenes Photon WASM en lugar de sharp; clientes pg de pool pequeño;
trabajos existentes con EdgeRuntime.waitUntil, cuota SQL e idempotencia. Se añade
un almacén privado de rate limits para cubrir instancias distintas. Las llamadas
AI conservan timeout menor que los 150 segundos del plan gratuito.

## Diseño y preview

Se conserva el diseño editorial, paleta, tipografía, componentes, navegación y
estados existentes. Preview previa: docs/evidencia/publicacion/preview.png.
La única adaptación del formulario es normalizar la foto en el navegador antes
de subirla; el servidor vuelve a decodificarla y rechaza dimensiones excesivas.
Se verificará la UI real en la preview Cloudflare para móvil y escritorio.

## Seguridad y despliegue

RLS permanece activo y las tablas son solo servidor. Los rate limits viven en
un esquema privado con acceso solo del propietario. La función no devuelve
claves, variables de entorno ni errores del driver. Las fotos se reencodifican
como JPEG y se guardan en el bucket privado; se comprueba su propietario siempre.

El Worker elimina cabeceras de proxy proporcionadas por el cliente y reconstruye
origen/IP desde la petición de Cloudflare. La función acepta solo los dos
orígenes conocidos (preview y producción) y conserva la comprobación de Origin.
Las respuestas /api son privadas y no entran en la caché del frontend.

Secuencia: código → tests → build → auditoría/commit → preview de función y
Worker → salud/flujo/auth/fotos → promoción del mismo artefacto a producción.
Se reutiliza el Worker hackathon-stylingu para producción. La reversión consiste
en restaurar las versiones anteriores de Worker y función; no elimina tablas.

## Límites

No se activan planes de pago. Cloudflare y Supabase aplican las cuotas de sus
planes gratuitos. Supabase puede pausar el proyecto tras inactividad. Edge:
256 MiB, 2 segundos de CPU y 150 segundos de vida; los errores se muestran sin
sustituir IA por simulaciones. Los tamaños y tiempos reales se validarán antes
de publicar. El transporte SMTP sigue requiriendo configuración para recuperar
cuentas; no se simula un correo enviado.

Fuentes:
- https://supabase.com/docs/guides/functions/routing
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/background-tasks
- https://supabase.com/docs/guides/functions/limits
- https://github.com/fineshopdesign/cf-wasm/tree/main/packages/photon

## Estado de datos

La copia de usuarios, sesiones, trabajos y fotografías locales está cancelada por instrucción de la usuaria. No ejecutar scripts/transfer-to-supabase.mjs --apply. El entorno publicado empieza con la base remota vacía. Las cuentas sintéticas utilizadas en la preview se eliminan al finalizar las pruebas.

## Verificación local

- Backend: 22 grupos de pruebas pasan con SQL, aislamiento y adaptadores gratuitos.
- Interfaz: 24/24 comprobaciones DOM y 15/15 en navegador real.
- Worker: 1,23 MB comprimido tras optimizar las fotos editoriales en el build.
- Meta: la usuaria confirma el secreto guardado en Supabase; se verificará en la preview.
- La auditoría exige documentar SUPABASE_DB_URL en la plantilla aunque la inyecte Supabase. Diff aprobado y aplicado.

Los comandos npm deploy, deploy:preview y deploy:dry usan wrangler.free.jsonc y ya no envían el archivo de secretos a Cloudflare. El despliegue de Edge Functions se realiza por MCP con los paquetes de deploy/free. Estos paquetes contienen código, nunca valores privados.
