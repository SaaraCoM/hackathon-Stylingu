# Ejecutar StylingU con Docker

La imagen contiene Express, el ejecutor de trabajos, la web React/Tailwind y el detector facial local. No requiere Node instalado en el servidor. Se conserva Postgres y Supabase Storage: no se introducen bases de datos ni copias de datos adicionales. La interfaz mantiene las previews ya aprobadas en `svg-design` y `tone-simulator`; esta fase no cambia su diseño.

## Preparación

1. Instalar Docker Engine/Desktop con Compose.
2. Copiar `backend/.env.example` a `backend/.env` si no existe; nunca sobrescribir un archivo con credenciales.
3. Configurar `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `PUBLIC_ORIGIN=https://tu-dominio`, `AI_PROVIDER=meta`, `MODEL_API_KEY`, `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET`. Configurar SMTP si se necesita recuperación de contraseña. Autorizar el dominio en el widget Turnstile.
4. Poner un proxy HTTPS del servidor delante de `127.0.0.1:8080`. Usar `TRUST_PROXY=1` únicamente si el contenedor solo recibe tráfico desde ese proxy de confianza.

Desde la raíz:

```sh
docker compose build
docker compose run --rm web node scripts/migrate.mjs
docker compose up -d
docker compose ps
docker compose logs --tail=100 web
```

La migración modifica la base configurada: hacer copia de seguridad antes de aplicarla a producción. No se ejecuta automáticamente al arrancar. La imagen no contiene `.env`, claves, datos locales ni dependencias copiadas del equipo. Los dos procesos terminan juntos si uno falla; Compose reinicia el servicio. El healthcheck comprueba la conexión a Postgres, no la disponibilidad de Meta o SMTP.

También puede ejecutarse sin Compose: `docker build -t stylingu:local .` y `docker run --env-file backend/.env -p 127.0.0.1:8080:8080 stylingu:local`.

Esto permite alojarla en servidores compatibles con Docker; no convierte la aplicación en un iframe para cualquier página ni sustituye las cuentas y servicios externos. El despliegue Cloudflare existente usa Worker + Supabase, no esta imagen.

## Validación y límites

Se revisan Dockerfile, contexto excluido y comandos; el build del frontend se ejecuta localmente. Este equipo no dispone de Docker, por lo que no se ha construido ni arrancado la imagen. Las pruebas de validación Turnstile usan respuestas controladas; no crean cuentas reales.

Fuentes: [build por etapas](https://docs.docker.com/build/building/multi-stage/), [variables en Compose](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/), [verificación Turnstile](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
