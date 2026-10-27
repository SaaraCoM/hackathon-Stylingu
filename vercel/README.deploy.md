# Despliegue de StylingU en Vercel (preview)

Este directorio contiene el paquete listo para desplegar en Vercel:

- `vercel.json` — v2 + función `api/*.js` en runtime `nodejs@22`, rewrite `/api/:path+ → /api/:path`.
- `api/index.js` — Vercel Function (CJS) que dynamic-importa el worker ESM.
- `api/worker/index.js` — worker ESM que re-expone el backend existente (`backend/src/index.js`).
- `js/*.js`, `styles.css`, `index.html` — frontend estático.

## Prerequisitos

- Node.js 22.x (la misma versión usada localmente).
- CLI de Vercel: `npm i -g vercel` o `npx vercel`.
- Cuenta Vercel conectada a GitHub (o token personal) y el repo vinculado.
- Variable de entorno `MONGODB_URI` configurada en Vercel (ver más abajo).

## Build local (opcional, para depurar antes de deploy)

Desde la raíz del proyecto:

```bash
cd vercel
npm ci            # o npm install, según tu lockfile
npx vercel build  # empaqueta función + frontend en .vercel/output
```

Si el build local falla por falta de `MONGODB_URI`, ese es un problema de runtime de preview, no de build; el build en sí puede completarse sin esa variable.

## Deploy a preview

```bash
cd vercel
npx vercel --env preview --yes
```

Vercel devolverá un URL de preview. Ese es el entorno de pruebas; no afecta producción.

Si la CLI no está logueada, primero:

```bash
npx vercel login
```

y luego el `vercel --env preview`.

## Variable MONGODB_URI

El backend necesita `MONGODB_URI` para conectarse a Atlas. Configúrala en Vercel como **Environment Variable** del proyecto, en el entorno `preview` (y luego `production` cuando corresponda), con el valor de tu URI de conexión.

No commits la URI en el repo. Este README no la incluye.

## Verificación rápida de preview

1. Abre el URL de preview en el navegador.
2. Prueba registro/login/cambio de preferencias/armario/dossier.
3. Confirma que:
   - el frontend carga sin errores de consola que impidan usar la app;
   - el registro crea usuario en Atlas (revisando tu cluster);
   - la cookie de sesión se establece y funciona en peticiones siguientes;
   - dos cuentas son independientes (aislamiento).

## Rollback

En el dashboard de Vercel puedes revertir a un deployment anterior desde la pestaña de despliegues del proyecto.

## Notas de arquitectura rápida

- El backend es un Hono app servido desde una Vercel Function.
- Las sesiones viven en la base de datos (Mongoose), no en memoria del servidor.
- No hay estado en el servidor entre invocaciones; cada request puede ser una función fría.
