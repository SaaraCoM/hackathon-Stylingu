# StylingU · freebuff Agent

Asistente de belleza, armario virtual y maquillaje. PWA mobile-first con tabs
(Colorimetría · Maquillaje · Vestuario & Armario · Recomendación de Compras), pensada para empaquetar como APK con Capacitor.

> Referencia visual: `DESIGN.md` (sistema Warm Editorial Quiet Luxury portado del ZIP `stitch_stylingu_beauty_styling_app.zip`).

## Estructura

```text
frontend/public/   # Shell PWA estática (tipografía Inter con fallback a sistema)
backend/src/       # API Express + sirve el frontend (un solo origen)
DESIGN.md          # Tokens de diseño propios
docs/              # Notas de arquitectura
```

## Despliegue seguro

La configuración vigente usa Supabase Auth con confirmación de correo, PostgreSQL
con RLS, Storage privado y despliegue azul/verde en Cloudflare Containers.
Consulta [la guía operativa](docs/despliegue-seguro.md) para desarrollo local,
bootstrap sin archivos de secretos, CI/CD, rotación y rollback.
Los [resultados de verificación](docs/verificacion-despliegue-seguro.md) distinguen
las pruebas locales de las comprobaciones remotas pendientes.

Los datos locales legacy no se importan automáticamente. Las instrucciones
históricas que siguen corresponden al arranque anterior; para una instalación
nueva utiliza el perfil Docker/Supabase local de la guía vigente.

## Cómo correr (histórico)

Requisitos: Node 22. La base de datos es Postgres (Supabase en producción).

> En PowerShell, `npm` está bloqueado por la política de ejecución de scripts.
> Usa `npm.cmd` (o ejecuta los comandos en `cmd.exe`).

```bash
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
cp backend/.env.example backend/.env   # rellena DATABASE_URL y las claves de Storage
npm.cmd start                          # → http://localhost:3000
# GET http://localhost:3000/api/health → {"ok":true,"service":"stylingu"}
```

Sin cuenta de Supabase, para desarrollo local:

```bash
npm.cmd run dev:db    # Postgres embebido en 127.0.0.1:5433 (datos en backend/.pgdata)
npm.cmd start         # en otra terminal
```

`dev:db` es idempotente: si el Postgres local ya está arrancado, lo detecta y
sale sin error. Si el puerto lo ocupa otro proceso, lo dice y sugiere
`PG_PORT=5434`.

`backend/.env` de desarrollo ya apunta a ese Postgres local. En producción,
cambia `DATABASE_URL` por la cadena directa de Supabase y define
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` para las fotos.

Migraciones: `npm run migrate --prefix backend` (idempotente; registra cada
archivo en `schema_migrations`). Limpieza diaria de sesiones caducadas:
`npm run prune --prefix backend`.

## Seguridad repo público

- `.env` siempre ignorado; solo se versiona `backend/.env.example` sin secretos.
- Rate-limit en `/api/*` (ver `backend/src/middleware/rateLimit.js`).
- Si una credencial llegó a publicarse, se rota: el historial de git no se
  puede considerar privado.
- Imágenes de usuario: no se versionan; en producción van a Supabase Storage
  (bucket privado) y en desarrollo a `backend/.photos/`.

## Versionado

Commits pequeños en español con Conventional Commits (`chore:`, `feat:`, `docs:`, `fix:`).
Rama principal: `main`.
