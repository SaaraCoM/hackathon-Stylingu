# vercel/api — Function package

Este directorio empaqueta la función Vercel que ejecuta el backend de StylingU:

- **Entrada**: `api/index.js` (CJS) re-exporta `handler(req, res)` y carga dinámicamente
  `api/worker/index.js` al primer uso.
- **Worker**: `api/worker/index.js` (ESM) importa `backend/src/index.js` (Express) y
  lo adapta al modelo Request/Response de Vercel Functions.
- **Origen del backend**: el código real vive en `backend/src/`; este paquete NO
  modifica ese código. Solo hace dos cosas:
  1. Copia `backend/src/` a `api/worker/.vercel-validate/backend/src/` para que la
     validación local de sintaxis de `worker/index.js` pueda importar el app sin
     top-level await problemático para `require()` del script de validación.
  2. En tiempo de despliegue, Vercel ejecuta el `backend/src/index.js` real (con su
     `await connectDB(process.env.MONGODB_URI)` y `app.listen`) dentro del runtime
     `nodejs@22`. El worker expone `fetch/handler/handle` para que la función lo invoque
     por petición.

## Pre-requisitos

- Node ≤ 22 con `esbuild` y `wrangler` instalados dentro de `backend/node_modules`
  (el worker importa mongoose/y hono desde el root del proyecto).
- Vercel CLI (`npx vercel`).
- `MONGODB_URI` configurado como **secret de entorno** en Vercel para el entorno
  preview/production (nunca en el código).

## Validación local

Desde `vercel/`:

```bash
node --check api/index.js
node --check api/worker/index.js
node -e "require('./api/worker/index.js'); console.log('require OK')"
node -e "const w=require('./api/worker/index.js'); const r=w.validateBuild(); if(!r.ok){throw new Error(r.error);} console.log('validate OK:', r.appType)"
```

## Despliegue preview

```bash
cd vercel
npx vercel login          # si no hay sesión local
npx vercel deploy --cwd vercel --prebuilt --env preview --token <VERCEL_TOKEN>
```

## Variables de entorno (preview)

Necesaria: `MONGODB_URI` (Atlas connection string con ?retryWrites=true).

Agregar como **Environment Variable** pública/privada en Vercel para el entorno preview:

- Panel → Settings → Environment Variables → Add
- Key: `MONGODB_URI`
- Value: el connection string
- Environment: Preview (y Production cuando se decida)

Alternativa CLI:

```bash
npx vercel env add MONGODB_URI preview
```

## Verificación post-despliegue

1. Obtener el URL de preview del receipt (`vercel deploy` lo imprime).
2. Ejecutar `vercel/verify.cmd` con `set BASE=<url>`.
3. Si D1/R2 o otras bindings se añaden en el futuro, validar ese lado aparte.

## Nota sobre conexión a Atlas

El backend hace `await connectDB(process.env.MONGODB_URI)` en top-level await del
módulo `backend/src/index.js`. En Vercel Functions esto se ejecuta por invocación:

- La primera petición paga el handshake TLS + resolución DNS de Atlas.
- Las peticiones siguientes dentro del mismo isolado reusan la conexión.
- Si el runtime esfría el isolado, la siguiente invocación vuelve a conectar.

Por eso el worker hace **lazy connect**: `guardDB()` conecta solo si no está ya
`conectado`, y las rutas devuelven 503 cuando no hay base, igual que en Express.

## Frontend estático

El frontend va como assets estáticos en `vercel/js/*`, `vercel/styles.css` e
`vercel/index.html`. `vercel.json` los sirve directamente (sin función) para las
rutas que no empiezan por `/api/`.

## Lo que NO va aquí

- `MONGODB_URI` con valor real (secreto).
- `node_modules` de backend (se instalan en la raíz del proyecto y resueltos por el
  worker al importar `backend/src/index.js` desde el root).
- `.env.local` (fichero de desarrollo local, ignorado por .gitignore).
