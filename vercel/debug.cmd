@echo off
rem ═══════════════════════════════════════════════════════════════════════════
rem  Vercel debug helper — vercel/debug.cmd
rem
rem  Inicia una función Vercel local con vercel dev desde la raíz del paquete
rem  empaquetado (vercel/), sobre el puerto 8787 por defecto.
rem
rem  Requisitos:
rem   - Vercel CLI instalada localmente (npx vercel, o vercel global).
rem   - MONGODB_URI definida en vercel/.env.local (o como variable de entorno).
rem
rem  Uso típico:
rem    cd vercel
rem    debug.cmd
rem
rem  Luego se puede probar con:
rem    curl http://127.0.0.1:8787/api/health
rem
rem  Para parar: CTRL+C en la ventana que lanzó vercel dev.
rem ═══════════════════════════════════════════════════════════════════════════

setlocal

set "THIS_DIR=%~dp0"
set "PROJECT_ROOT=%THIS_DIR%.."

echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║  VERCEL DEBUG LOCAL — StylingU                                         ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.

echo [debug] dir del paquete empaquetado: %THIS_DIR%
echo [debug] raíz del proyecto: %PROJECT_ROOT%
echo.

rem 1) Asegurar que vercel/.env.local existe con MONGODB_URI
set "ENV_LOCAL=%THIS_DIR%.env.local"
if not exist "%ENV_LOCAL%" (
  echo [debug] vercel/.env.local no existe — creándolo
  copy /Y NUL "%ENV_LOCAL%" >nul
)
findstr /I /C:"MONGODB_URI=" "%ENV_LOCAL%" >nul || (
  echo [debug] MONGODB_URI no está en vercel/.env.local — añadiendo línea vacía
  >>"%ENV_LOCAL%" echo MONGODB_URI=
)

echo [debug] contenido de vercel/.env.local (primera línea que contiene MONGODB_URI):
findstr /I "MONGODB_URI=" "%ENV_LOCAL%"
echo.

rem 2) Validar sintaxis del worker antes de lanzar vercel dev
echo [debug] validando worker/index.js y api/index.js ...
cd /D "%THIS_DIR%api"
node --check index.js
if errorlevel 1 ( echo ✗ api/index.js sintaxis FAILED & exit /b 1 )
node --check worker\index.js
if errorlevel 1 ( echo ✗ worker/index.js sintaxis FAILED & exit /b 1 )
echo   ✓ sintaxis OK
echo.

rem 3) Ejecutar vercel dev
echo [debug] lanzando npx vercel dev --listen 8787 ...
echo [debug] (puedes detener con CTRL+C; los logs de la función salen aquí)
echo.
npx vercel dev --listen 8787 --scope %USERNAME% --cwd "%THIS_DIR%"
echo.
echo [debug] vercel dev terminó.
endlocal
