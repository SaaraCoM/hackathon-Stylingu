# Despliegue en Cloudflare Containers

Estado: scaffolding listo y validado con `wrangler deploy --dry-run --containers-rollout=none`.
No se ha desplegado todavía: faltan Docker, sesión de Wrangler, plan Workers Paid y
las credenciales remotas de Postgres/Storage.

## Arquitectura

```
navegador
   │ HTTPS
   ▼
Worker  stylingu  (worker/index.js)
   │  Durable Object + Container
   ▼
Contenedor Node 22  (Dockerfile)
   ├── Express + frontend/public   :8080
   ├── ejecutor de trabajos (jobs.js)
   ├── sharp para normalizar fotos
   ├── Postgres remoto (DATABASE_URL)
   ├── Supabase Storage privado (fotos)
   └── Meta AI (análisis real)
```

- El Worker solo enruta; no reimplementa la app.
- El contenedor conserva Express, `pg`, `sharp`, las sesiones opacas y todos los
  endpoints `/api`.
- Una sola instancia (`max_instances: 1`) para que el ejecutor de trabajos no
  compita consigo mismo.
- `sleepAfter: 15m`: si nadie usa la app, el contenedor se duerme y se vuelve a
  arrancar con la siguiente petición.
- `PUBLIC_ORIGIN` se deriva del primer request HTTPS. También se puede fijar con
  el secreto `PUBLIC_ORIGIN` si se usa un dominio propio.

## Archivos

| Archivo | Función |
| --- | --- |
| `Dockerfile` | Imagen Node 22 con dependencias de producción, frontend y migrador. |
| `.dockerignore` | Deja fuera secretos, tests, docs y `node_modules` locales. |
| `docker/entrypoint.sh` | Arranca `jobs.js` y `server.js`; si el servidor muere, el contenedor se reinicia. |
| `worker/index.js` | Clase `StylinguContainer`, validación de secretos y ruteo al contenedor. |
| `wrangler.jsonc` | Worker, Container, Durable Object y límites. |
| `scripts/migrate.mjs` | Aplica `db/migrations/*.sql` contra `DATABASE_URL`. |

## Requisitos

1. Docker Desktop instalado y corriendo (`docker info` debe responder).
2. Cuenta de Cloudflare con plan **Workers Paid** (desde 5 USD/mes). Containers
   no funciona en el plan gratuito.
3. Wrangler instalado en el repo (`npm.cmd install` ya lo deja en
   `node_modules`).
4. Un Postgres remoto. Supabase es la opción documentada; también vale Neon,
   Railway o cualquier Postgres con SSL.
5. Un bucket privado de Supabase Storage llamado `stylingu-photos`.
6. La clave real de Meta AI.

## Secretos

Crea `.env.production` en la raíz. Está ignorado por Git; no lo subas.

```dotenv
DATABASE_URL=postgresql://USUARIO:PASSWORD@HOST:5432/postgres?sslmode=require
META_AI_API_KEY=...
SUPABASE_URL=https://PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=stylingu-photos
AI_PROVIDER=meta
ANALYSIS_DAILY_LIMIT=10
# Opcional: fija el origen exacto si usas dominio propio.
# PUBLIC_ORIGIN=https://stylingu.example
```

`SUPABASE_SERVICE_ROLE_KEY` solo se pasa al contenedor. Nunca llega al
navegador.

## 1. Preparar la base remota

Con `.env.production` cargado en la sesión de PowerShell:

```powershell
node --env-file=.env.production scripts/migrate.mjs
```

El migrador aplica `001_init.sql` y `002_birth_date.sql` y registra cada archivo
en `schema_migrations`. No crea tablas al arrancar el servidor.

En Supabase:

- Crea el bucket privado `stylingu-photos`.
- No añadas políticas de lectura anónima.
- El backend usa la clave `service_role` solo desde el contenedor.
- Si usas el pooler de Supabase, usa el modo sesión para migrar y para el
  runtime; el modo transacción puede romper sentencias de migración.

## 2. Iniciar sesión en Cloudflare

```powershell
npx.cmd wrangler login
npx.cmd wrangler whoami
```

Comprueba que la cuenta tiene Workers Paid:

```powershell
npx.cmd wrangler containers list
```

## 3. Preview aislada

```powershell
npx.cmd wrangler deploy --name stylingu-preview --secrets-file .env.production
```

- Wrangler construye la imagen con Docker y la sube al registro de Cloudflare.
- La primera construcción tarda varios minutos.
- La URL será `https://stylingu-preview.<TU_SUBDOMINIO>.workers.dev`.
- Cloudflare puede tardar varios minutos en aprovisionar el contenedor. Que la
  URL responda no significa que el contenedor ya esté listo.

Comprueba:

```powershell
$base = 'https://stylingu-preview.<TU_SUBDOMINIO>.workers.dev'
Invoke-RestMethod "$base/api/health"
Invoke-RestMethod "$base/api/ready"
```

`/api/health` devuelve `ok: true`. `/api/ready` devuelve `ready: true` solo si
Postgres responde. Si ves `DEPLOY_CONFIG`, faltan secretos. Si ves
`Producción requiere: ...`, el contenedor arrancó pero falta una variable.

Si el contenedor no arranca:

```powershell
npx.cmd wrangler tail stylingu-preview
npx.cmd wrangler containers list
```

## 4. Prueba funcional en la preview

1. Abre la URL en una ventana privada.
2. Registra una cuenta con fecha de nacimiento. Una fecha de menos de 16 años
   debe devolver `403 UNDERAGE`; sin fecha, `400 BIRTH_DATE_REQUIRED`.
3. Sube una foto de cara y otra de cuerpo.
4. Lanza el análisis. Debe devolver `source: "meta"`, `model:
   "muse-spark-1.3"`, `protocol` y `analyzedAt` reales.
5. Recarga y comprueba que el análisis sigue en la cuenta.
6. Cierra sesión y verifica que el contenido vuelve al gate.

No uses una foto real de una persona si no tienes permiso. Para la prueba de
humo sirve una imagen editorial del proyecto, como
`frontend/public/assets/editorial/hero-portrait.jpg`.

## 5. Producción

Cuando la preview pase salud y flujo:

```powershell
npx.cmd wrangler deploy --secrets-file .env.production
```

La URL de producción será `https://stylingu.<TU_SUBDOMINIO>.workers.dev`.
Si usas dominio propio:

```powershell
npx.cmd wrangler deploy --secrets-file .env.production --domain stylingu.example
```

Vuelve a comprobar `/api/health` y `/api/ready`. Después elimina la preview si
ya no la necesitas:

```powershell
npx.cmd wrangler delete --name stylingu-preview
```

## Coste y límites

- Workers Paid: desde 5 USD/mes.
- Containers se factura por memoria/CPU/tiempo de ejecución. Con `basic`
  (1/4 vCPU, 1 GiB, 4 GB disco) y `sleepAfter: 15m`, una demo de hackathon es
  barata, pero no es gratuita.
- El plan gratuito de Workers no permite Containers.
- La imagen debe ser `linux/amd64`; el Dockerfile parte de `node:22-bookworm-slim`.

## Seguridad

- No hay secretos en la imagen: se inyectan al arrancar el contenedor.
- `.env.production`, `.env`, `backend/.env` y `.dev.vars` están ignorados.
- El backend exige en producción `DATABASE_URL`, `PUBLIC_ORIGIN` HTTPS,
  proveedor de IA real y Supabase Storage.
- Las cookies de sesión son `HttpOnly`, `SameSite=Lax` y `Secure` en
  producción.
- El contenedor no publica Postgres; solo el Worker recibe tráfico.
- Rota la contraseña de MongoDB Atlas y la clave de Meta que estuvieron en el
  historial/árbol de trabajo antes de hacer público el repositorio.

## Rollback

```powershell
npx.cmd wrangler deployments list
npx.cmd wrangler rollback <VERSION_ID>
```

Un rollback del Worker no revierte las migraciones de Postgres. Las migraciones
son aditivas; si hay que deshacer datos, hazlo con un script revisado y una
copia de seguridad.
