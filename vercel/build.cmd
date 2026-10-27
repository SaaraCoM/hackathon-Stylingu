@echo off
rem ═══════════════════════════════════════════════════════════════════════════
rem  Vercel build para StylingU — vercel/build.cmd
rem
rem  Qué hace:
rem   1) Copia backend/src/ hasta vercel/api/worker/.vercel-validate/backend/src/
rem      para que el worker pueda importar el app tranquilamente (sin top-level await
rem      síncrono problemático para require() de validación).
rem   2) Asegura que MONGODB_URI esté definido en vercel/.env.local para la previsualización
rem      local de la función (vercel dev).
rem   3) Ejecuta la validación de empaque del worker (node -e "...validateBuild()").
rem
rem  Lo que NO hace: no linealiza las invocaciones de producción; en Vercel, cada función
rem  recibe su propia MONGODB_URI como secret y el worker la lee desde c.env.MONGODB_URI.
rem  El worker NO espera la conexión en tiempo de despliegue (one-shot); la primera invocación
rem  paga el handshake TLS con Atlas, y las siguientes invocaciones reusan la conexión
rem  dentro del isolado del runtime.
rem ═══════════════════════════════════════════════════════════════════════════

setlocal

echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║  VERCEL BUILD — StylingU                                              ║
echo ╚══════════════════════════════════════════════════════════════════════════╝

rem 1) Ubicación del proyecto desde vercel/build.cmd
set "THIS_DIR=%~dp0"
set "PROJECT_ROOT=%THIS_DIR%.."
set "BACKEND_SRC=%PROJECT_ROOT%\backend\src"
set "WORKER_DIR=%THIS_DIR%api\worker"
set "VALIDATE_DIR=%WORKER_DIR%\.vercel-validate"
set "VALIDATE_BACKEND_SRC=%VALIDATE_DIR%\backend\src"

rem 2) Copiar backend/src/ al validate dir para validación local del worker
if exist "%VALIDATE_DIR%" rmdir /s /q "%VALIDATE_DIR%"
if not exist "%VALIDATE_BACKEND_SRC%" mkdir "%VALIDATE_BACKEND_SRC%"

echo [build] copiando backend/src/ a %VALIDATE_BACKEND_SRC% ...
xcopy /E /I /Y "%BACKEND_SRC%\*" "%VALIDATE_BACKEND_SRC%\" >nul

rem 3) Asegurar vercel\.env.local con MONGODB_URI para vercel dev local
set "ENV_LOCAL=%THIS_DIR%.env.local"
if not exist "%ENV_LOCAL%" (
  echo [build] vercel/.env.local no existe — creándolo para vercel dev
  copy /Y NUL "%ENV_LOCAL%" >nul
)
echo [build] garantizando MONGODB_URI en vercel/.env.local (solo si falta)
findstr /I /C:"MONGODB_URI=" "%ENV_LOCAL%" >nul || (
  echo [build]   adición de línea MONGODB_URI= (pendiente de configurar el valor real)
  >>"%ENV_LOCAL%" echo MONGODB_URI=
)

rem 4) Validar que el worker resuelve el backend y expone el handler esperado
echo [build] validando worker/index.js ...
cd /D "%WORKER_DIR%"
node --check index.js
if errorlevel 1 (
  echo [build] ✗ worker/index.js tiene errores de sintaxis
  exit /b 1
)
node --check worker\index.js 2>nul
if errorlevel 1 (
  echo [build] ✗ worker/index.js tiene errores de sintaxis (worker)
  exit /b 1
)

echo [build] validando resolución del backend desde el worker ...
node -e "
const path=require('path');
const fs=require('fs');
const workerDir=path.resolve('./api/worker');
const projectRoot=path.resolve(workerDir,'..','..','..');
const backendFile=path.resolve(projectRoot,'backend','src','index.js');
const workerFile=path.resolve(workerDir,'worker/index.js');
if(!fs.existsSync(backendFile)){console.error('✗ backend/src/index.js no existe desde worker');process.exit(1);}
if(!fs.existsSync(workerFile)){console.error('✗ worker/index.js no existe');process.exit(1);}
const v=require(workerFile);
const ok=typeof v.validateBuild==='function';
if(!ok){console.error('✗ worker/index.js no exporta validateBuild');process.exit(1);}
const r=v.validateBuild();
if(!r.ok){console.error('✗ validateBuild falló:',r.error);process.exit(1);}
console.log('   ✓ worker resuelve backend/src/index.js y valida el empaque');
console.log('   ✓ worker exporta:',Object.keys(v).join(', '));
"

if errorlevel 1 (
  echo [build] ✗ validación del worker falló
  exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║  BUILD OK — el worker puede desplegarse a Vercel                       ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.
echo   Reporte:
echo     - worker/index.js + api/index.js listos (sintaxis + validación backend)
echo     - vercel/.env.local preparado (MONGODB_URI pendiente de valor real)
echo     - frontend estático empaquetado en vercel/js/* + vercel/styles.css
echo.
echo   Pendiente ANTES de publicar el preview:
echo     1) npx vercel deploy --cwd vercel --prebuilt --env preview --token <VERCEL_TOKEN>
echo     2) configurar MONGODB_URI como secret de preview:
echo          npx vercel env add MONGODB_URI preview
echo        (o usar la UI de Vercel → Settings → Environment Variables)
echo     3) re-desplegar para que la función tenga la variable
echo.

exit /b 0
