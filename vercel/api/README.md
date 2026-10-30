# Adaptador Vercel (legado)

`index.js` re-exporta `backend/src/index.js`. No hay worker intermedio ni
copia de la lógica: la función de Vercel ejecuta el mismo Express que
`backend`.

## Variables de entorno

En Vercel (preview y production):

- `DATABASE_URL` — cadena directa de Postgres/Supabase.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — almacenamiento de fotos.
- `PUBLIC_ORIGIN` — origen HTTPS exacto.
- `AI_PROVIDER` y `MODEL_API_KEY` — proveedor real; `mock` no vale en producción.

No se usa MongoDB.

## Validación

```bash
node --check api/index.js
node -e "import('./api/index.js').then(m=>console.log(typeof m.default))"
```
