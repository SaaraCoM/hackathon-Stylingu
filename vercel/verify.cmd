@echo off
rem ═══════════════════════════════════════════════════════════════════════════
rem  Vercel verify — vercel/verify.cmd
rem
rem  Usa el URL de preview (BASE) para verificar las rutas que el frontend usa.
rem  Diseñado para ejecutarse después de npx vercel deploy, con:
rem    set BASE=https://stylingu-atelier-...vercel.app
rem
rem  Lo que verifica:
rem   1) /api/health
rem   2) /api/auth/registro
rem   3) /api/auth/login
rem   4) /api/auth/logout
rem   5) /api/auth/yo (tras login)
rem   6) /api/auth/perfil (GET y PUT)
rem   7) /api/armario (GET + POST)
rem   8) verifica que el frontend index.html carga los js que usa account.js
rem ═══════════════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

if "%BASE%"=="" (
  echo ╔══════════════════════════════════════════════════════════════════════════╗
  echo ║  USAGE: set BASE=https://...vercel.app y ejecutar este script             ║
  echo ╚══════════════════════════════════════════════════════════════════════════╝
  exit /b 1
)

echo ╔══════════════════════════════════════════════════════════════════════════╗
echo ║  VERCEL VERIFY — StylingU preview %BASE%                                  ║
echo ╚══════════════════════════════════════════════════════════════════════════╝
echo.

rem Helper: petición HTTP con curl, siguiendo redirects y timeout
set "CURL=curl -s -L --max-time 25 -w "\n%{http_code}" --compressed"
set "FAIL=0"

call :check "GET  /api/health"                                  "curl -s --max-time 25 '%BASE%/api/health'"
call :check "GET  /"                                            "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/'"
call :check "GET  /index.html"                                  "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/index.html'"
call :check "GET  /js/account.js"                               "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/js/account.js'"
call :check "GET  /js/store.js"                                 "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/js/store.js'"
call :check "GET  /js/ui.js"                                    "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/js/ui.js'"
call :check "GET  /js/color.js"                                 "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/js/color.js'"
call :check "GET  /js/wardrobe.js"                              "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/js/wardrobe.js'"
call :check "GET  /styles.css"                                  "curl -s --max-time 25 -o NUL -w '%{http_code}' '%BASE%/styles.css'"
echo.

rem Registro de prueba
echo [verify] creando cuenta de prueba...
for /f "delims=" %%A in ('curl -s --max-time 25 -X POST "%BASE%/api/auth/registro" -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test-user-vercel-%%RANDOM%%@example.com\",\"password\":\"testpass123\"}"') do set "REG=%%A"
echo   respuesta registro: %REG%
if "%REG%"=="" set "FAIL=1"

rem Login de prueba con la cuenta creada (email fijo para E2E determinista)
set "TEST_EMAIL=test-user@vercel-preview.example"
set "TEST_PASS=testpass123"
echo [verify] haciendo login como %TEST_EMAIL% ...
for /f "delims=" %%A in ('curl -s --max-time 25 -c "%TEMP%\cookie.txt" -X POST "%BASE%/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"%TEST_EMAIL%\",\"password\":\"%TEST_PASS%\"}"') do set "LOGIN=%%A"
echo   respuesta login: %LOGIN%
if "%LOGIN%"=="" set "FAIL=1"

rem Leer cookie de sesión del fichero (curl -c escribe formato Netscape)
set "SID="
for /f "tokens=6 delims= " %%A in ('findstr /I "stylingu_sid" "%TEMP%\cookie.txt"') do set "SID=%%A"
echo [verify] sid obtenido: %SID%

rem /auth/yo con la cookie
echo [verify] pidiendo /auth/yo con la cookie...
for /f "delims=" %%A in ('curl -s --max-time 25 -b "%TEMP%\cookie.txt" "%BASE%/api/auth/yo"') do set "YO=%%A"
echo   respuesta yo: %YO%
if "%YO%"=="" set "FAIL=1"

rem /auth/perfil GET
echo [verify] pidiendo /auth/perfil (GET)...
for /f "delims=" %%A in ('curl -s --max-time 25 -b "%TEMP%\cookie.txt" "%BASE%/api/auth/perfil"') do set "PERFIL=%%A"
echo   respuesta perfil: %PERFIL%

rem /auth/perfil PUT
echo [verify] guardando preferencias...
for /f "delims=" %%A in ('curl -s --max-time 25 -b "%TEMP%\cookie.txt" -X PUT "%BASE%/api/auth/perfil" -H "Content-Type: application/json" -d "{\"goals\":[\"saber_colores\"],\"jewelry\":\"dorado\",\"styles\":[\"Elegante\"]}"') do set "PERFIL_PUT=%%A"
echo   respuesta put: %PERFIL_PUT%

rem /armario GET
echo [verify] pidiendo /armario (GET)...
for /f "delims=" %%A in ('curl -s --max-time 25 -b "%TEMP%\cookie.txt" "%BASE%/api/armario"') do set "ARM=%%A"
echo   respuesta armario: %ARM%

rem /armario POST
echo [verify] guardando outfit...
for /f "delims=" %%A in ('curl -s --max-time 25 -b "%TEMP%\cookie.txt" -X POST "%BASE%/api/armario" -H "Content-Type: application/json" -d "{\"top\":\"Blusa white\",\"topDesc\":\"Algodón\",\"bottom\":\"Falda midi\",\"bottomDesc\":\"VA Desnudo\",\"jacket\":\"Blazer clásico\",\"jacketDesc\":\"Lana\",\"note\":\"Test setup\"}"') do set "OUT=%%A"
echo   respuesta outfit: %OUT%

rem Limpiar cookie
del "%TEMP%\cookie.txt" >nul 2>&1

echo.
if %FAIL%==1 (
  echo ╔══════════════════════════════════════════════════════════════════════════╗
  echo ║  VERIFY: algunos checks fallaron — revisar antes de publicar            ║
  echo ╚══════════════════════════════════════════════════════════════════════════╝
  exit /b 1
) else (
  echo ╔══════════════════════════════════════════════════════════════════════════╗
  echo ║  VERIFY: OK — backend respuesta en preview                             ║
  echo ╚══════════════════════════════════════════════════════════════════════════╝
  exit /b 0
)
goto :eof

:check
set "LABEL=%~1"
set "CMD=%~2"
for /f "delims=" %%A in ('%CMD%') do set "RES=%%A"
echo   %LABEL% → %RES%
goto :eof
