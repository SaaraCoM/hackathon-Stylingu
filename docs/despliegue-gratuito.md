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

## Producci?n publicada el 3 de noviembre de 2026

URL: https://hackathon-stylingu.castellanomateossara.workers.dev

- Release del backend: 4dbdf0bfdb32aeba. C?digo validado: bcba012.
- Worker: d237082c-aabd-4a4c-8c81-4f4e03eddef2 (100 %).
- Funci?n stylingu-api: versi?n 1, ACTIVE, proyecto zbfxwbuuuzjzmsrraxkf.
- Home, cuatro hojas CSS, health y ready: HTTP 200. Rutas privadas sin sesi?n: 401; origen ajeno: 403; /.env: 404.
- Preview: 40 peticiones de prueba, fotos privadas, aislamiento, an?lisis real Meta, calendario persistente y accesibilidad sin infracciones detectadas.
- No se importaron datos locales ni se activaron planes de pago. Las cuentas sint?ticas se eliminan; las dem?s cuentas se conservan.
- SMTP pendiente: la recuperaci?n de contrase?a necesita un transporte real.

### Operaci?n

Logs, desde este repositorio con Wrangler autenticado:

```powershell
npx.cmd wrangler tail --config wrangler.free.jsonc
```

Reversi?n del Worker (sintaxis comprobada con la CLI local):

```powershell
npx.cmd wrangler rollback 906549ca-a1ed-4c90-80ce-1778a72c3765 --config wrangler.free.jsonc
```

La versi?n anterior era el scaffold de Containers y no presta el backend gratuito: esta reversi?n deshace c?digo pero no garantiza servicio funcional. Preferir redesplegar una release gratuita conocida. Ninguna reversi?n del Worker elimina tablas o fotos. La funci?n de producci?n es su primera versi?n; conservar deploy/free/stylingu-api.json para restaurarla por MCP.

Para futuras subidas por MCP al Worker existente, incluir en metadata `exports: {StylinguContainer: {type: "durable-object", storage: "sqlite"}}` y conservar la vinculaci?n durable_object_namespace. Se mantiene el namespace anterior sin invocarlo ni borrarlo. BACKEND_URL apunta a stylingu-api; las claves permanecen solo en Supabase.

### Resultado final comprobado

Registro, login, logout desde la UI, recarga sin sesion y acceso autenticado: correctos en produccion. Fotos privadas entre dos cuentas: correcto. Inferencia Meta real y calendario persistente: correctos. Cuentas QA eliminadas al terminar.

La prueba integral de produccion se detuvo en accesibilidad: axe detecto color-contrast serio en 36 nodos una vez cargadas imagenes y fuentes. Es un pendiente visual confirmado; el informe no declara passed=true. El informe previo sin infracciones se obtuvo antes de completar la animacion y no demuestra conformidad de contraste. SMTP y esta correccion de contraste quedan pendientes.

Evidencia: [informe integral](evidencia/despliegue/production-report.json), [autenticacion](evidencia/despliegue/production-auth-report.json), [movil](evidencia/despliegue/production-mobile.png), [escritorio](evidencia/despliegue/production-desktop.png). Las capturas muestran una cuenta sintetica y fotografias ficticias generadas para pruebas.
