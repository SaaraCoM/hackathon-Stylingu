# Despliegue en Vercel (legado)

> El destino recomendado es el servicio `backend` (Express + Postgres).
> Esta carpeta conserva el adaptador `api/index.js`, que re-exporta el mismo
> backend. No hay worker propio ni lógica duplicada.

## Estructura

- `api/index.js` — función Node que exporta `backend/src/index.js`.
- `vercel.json` — runtime `nodejs@22` y rewrite de `/api/*`.
- El resto (`index.html`, `styles.css`, `js/`) es la copia estática antigua.

## Variables de entorno

Configura en Vercel, para preview y producción:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres/Supabase (cadena directa) |
| `SUPABASE_URL` | proyecto de Storage |
| `SUPABASE_SERVICE_ROLE_KEY` | escritura/lectura privada de fotos |
| `PUBLIC_ORIGIN` | origen HTTPS exacto (CSRF) |
| `AI_PROVIDER` / `MODEL_API_KEY` | proveedor real de análisis |

## Notas

- Las migraciones se aplican con `npm run migrate --prefix backend`; no hay
  creación implícita de esquema al arrancar.
- Las sesiones viven en la tabla `sessions`, no en memoria del servidor.
- El build no necesita secretos; el runtime sí.
