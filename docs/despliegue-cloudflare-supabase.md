# StylingU: Cloudflare y Supabase

Estado: preparación local. El scaffolding de Cloudflare Containers está creado y
validado en dry-run; no hay despliegue ni migración remota todavía.

La guía operativa completa está en
[`despliegue-cloudflare-containers.md`](despliegue-cloudflare-containers.md).

## Arquitectura

La app es una SPA web/PWA con un backend Express + Postgres. No se publica solo
el frontend: el análisis, las fotos privadas, las sesiones y el armario viven en
el servidor.

La opción que conserva el runtime actual es **Cloudflare Containers**:

- Worker de entrada (`worker/index.js`) con un Durable Object.
- Contenedor Node 22 (`Dockerfile`) con Express, `sharp`, el frontend estático y
  el ejecutor de trabajos.
- Postgres remoto para usuarios, sesiones, perfiles, fotos (metadatos), armario,
  planes, catálogo, progreso y trabajos.
- Supabase Storage privado para los bytes de las fotos.
- Meta AI para el análisis real.

No se considera compatible el backend con Workers simplemente activando
`nodejs_compat`: `sharp` y el proceso de trabajos necesitan el contenedor.

## Datos y permisos

- Esquema: `db/migrations/001_init.sql` y `002_birth_date.sql`.
- La identidad sigue siendo la de Express (sesiones opacas en Postgres), no
  Supabase Auth.
- La conexión a Postgres es solo desde el servidor.
- RLS sin políticas públicas; permisos `anon`/`authenticated` revocados en las
  tablas de StylingU.
- La clave `service_role` se usa solo dentro del contenedor para Storage privado.
- El navegador nunca recibe `DATABASE_URL` ni claves privadas.

## Migración

1. Identificar el proyecto Supabase correcto; no usar proyectos por proximidad
   del workspace.
2. Revisar destino, backups y tablas existentes antes de aplicar SQL.
3. Aplicar las migraciones con `node --env-file=.env.production
   scripts/migrate.mjs`.
4. Crear el bucket privado `stylingu-photos`; no publicar objetos ni añadir
   lectura anónima.
5. Inventariar origen y destino, copiar datos y fotos si existen, verificar
   recuentos e integridad. No borrar el origen.
6. Configurar secretos y verificar auth, fotos, trabajos y recuperación con SMTP
   real.
7. Auditoría, commit, preview, health check, pruebas de flujo y promoción.

No se aplican migraciones en cada arranque del servidor.

## Validación

Pruebas locales ya ejecutadas:

- `npm.cmd test --prefix frontend`: 24/24.
- `npm.cmd test --prefix backend`: 16/16.
- `npm.cmd run check`: 48 archivos.
- `npm.cmd run build`: distribución generada.
- `node tests/browser.mjs`: 15/15.
- `node tests/http-flow.mjs`: flujo completo con Meta AI real, rechazo de una
  imagen no analizable y catálogo sin invenciones.

Pendiente sobre la preview remota: accesibilidad, flujo de registro con edad,
fotos privadas, análisis real, persistencia tras recarga y logout.

## Bloqueos actuales

- Docker no está instalado ni corriendo.
- Wrangler está instalado en el repo, pero no hay sesión iniciada.
- No está confirmado el plan Workers Paid.
- No hay `DATABASE_URL` remota ni credenciales de Supabase Storage.
- La contraseña de MongoDB Atlas del historial y la clave de Meta que estuvo en
  `backend/.env.example` deben rotarse antes de publicar el repositorio.

## Fuentes

- https://developers.cloudflare.com/containers/get-started/
- https://developers.cloudflare.com/containers/configuration/wrangler/
- https://developers.cloudflare.com/containers/api/container-class/
- https://developers.cloudflare.com/containers/platform/limits/
- https://developers.cloudflare.com/containers/platform/pricing/
- https://supabase.com/docs/guides/database/postgres/row-level-security
