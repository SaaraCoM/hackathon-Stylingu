# StylingU · freebuff Agent

Asistente de belleza, armario virtual y maquillaje. PWA mobile-first con tabs
(Colorimetría · Armario · Maquillaje · Skincare), pensada para empaquetar como APK con Capacitor.

> Referencia visual: `DESIGN.md` (sistema Warm Editorial Quiet Luxury portado del ZIP `stitch_stylingu_beauty_styling_app.zip`).

## Estructura

```text
frontend/public/   # Shell PWA estática (sin CDN, sin URLs externas)
backend/src/       # API Express (salud + placeholder IA con rate-limit)
DESIGN.md          # Tokens de diseño propios
docs/              # Notas de arquitectura
```

## Cómo correr

Frontend (sin dependencias, funciona con doble clic o servidor estático):

```bash
# Opción 1: abrir directo
start frontend/public/index.html

# Opción 2: servidor local
npx serve frontend/public
# o
python -m http.server -d frontend/public 8080
```

Backend (requiere Node 20+):

```bash
cd backend
npm install
cp .env.example .env
npm run dev
# GET http://localhost:3000/api/health
```

## Seguridad repo público

- `.env` siempre ignorado; solo se versiona `backend/.env.example` sin secretos.
- Rate-limit en `/api/*` (ver `backend/src/middleware/rateLimit.js`).
- Sin connection strings ni API keys en el código.
- Imágenes de usuario: no se versionan; en producción van a bucket privado con URLs firmadas.

## Versionado

Commits pequeños en español con Conventional Commits (`chore:`, `feat:`, `docs:`, `fix:`).
Rama principal: `main`.
