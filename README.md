# StylingU · freebuff Agent

Asistente de belleza, armario virtual y maquillaje. PWA mobile-first con tabs
(Colorimetría · Armario · Maquillaje · Skincare), pensada para empaquetar como APK con Capacitor.

> Referencia visual: `DESIGN.md` (sistema Warm Editorial Quiet Luxury portado del ZIP `stitch_stylingu_beauty_styling_app.zip`).

## Estructura

```text
frontend/public/   # Shell PWA estática (tipografía Inter con fallback a sistema)
backend/src/       # API Express + sirve el frontend (un solo origen)
DESIGN.md          # Tokens de diseño propios
docs/              # Notas de arquitectura
```

## Cómo correr

Un solo comando (Node 20+): el backend sirve también el frontend, así que
registro, login y armario funcionan sin configurar CORS ni puertos:

```bash
cd backend
npm install
cp .env.example .env   # pon aquí tu MONGODB_URI de Atlas
npm start
# → http://localhost:3000  (app completa)
# GET http://localhost:3000/api/health → {"ok":true,"db":"conectado"}
```

Sin `MONGODB_URI` la app arranca igual pero guarda en localStorage (fallback
visible). En desarrollo se acepta cualquier origen localhost, así que servir
el frontend por separado (p. ej. `python -m http.server -d frontend/public 8099`)
también funciona.

## Seguridad repo público

- `.env` siempre ignorado; solo se versiona `backend/.env.example` sin secretos.
- Rate-limit en `/api/*` (ver `backend/src/middleware/rateLimit.js`).
- Sin connection strings ni API keys en el código.
- Imágenes de usuario: no se versionan; en producción van a bucket privado con URLs firmadas.

## Versionado

Commits pequeños en español con Conventional Commits (`chore:`, `feat:`, `docs:`, `fix:`).
Rama principal: `main`.
