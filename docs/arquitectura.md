# Arquitectura mínima

PWA estática (`frontend/public`) + API Express (`backend/src`).

- Frontend guarda paleta y conjuntos en `localStorage`; la sincronización Mongo llega después.
- Backend expone `GET /api/health` y `POST /api/ai/analyze-colorimetry` (501 sin `META_AI_API_KEY`).
- Seguridad: `.env` ignorado, `backend/.env.example` sin secretos, rate-limit 60/min API y 5/min IA.
- Deuda: vendorar fotos reales, conectar Mongoose, auth por cookies `HttpOnly/Secure/SameSite`, tests e2e.
