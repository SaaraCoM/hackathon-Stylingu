# StylingU: despliegue seguro y operación

Esta guía sustituye las instrucciones anteriores basadas en `.env.production`,
`wrangler.jsonc`, sesiones propias y una sola instancia. No se importan datos de
las bases locales antiguas. El rediseño UX del armario es independiente.

## Arquitectura

```text
Navegador ─HTTPS─> hackathon-stylingu (Worker de entrada estable)
                     ├─ DeploymentControl: destino activo y revisión
                     ├─ RateCounter: límites compartidos por IP
                     └─ service bindings privados
                         ├─ production-blue  ─> contenedor Express + ejecutor
                         └─ production-green ─> contenedor Express + ejecutor
                                                ├─ Supabase Auth
                                                ├─ PostgreSQL con RLS
                                                ├─ Storage privado
                                                └─ Meta API
```

Staging repite la arquitectura con un proyecto Supabase distinto. No comparte
cookies, usuarios, claves, datos ni objetos de Storage con producción.

| Entorno | Proyecto Supabase | Entrada pública |
| --- | --- | --- |
| Producción | `zbfxwbuuuzjzmsrraxkf` | `https://hackathon-stylingu.castellanomateossara.workers.dev` |
| Staging | `ckcszhdhgwytiaxapike` | `https://hackathon-stylingu-staging.castellanomateossara.workers.dev` |

El proyecto de staging se creó con cotización de 0 al mes, confirmada por la
usuaria. Esto no supone gratuidad de Containers, del consumo de IA ni de otros
servicios. Antes de activar Containers debe comprobarse el soporte y la
facturación de la cuenta; los scripts no cambian planes ni contratan recursos.

## Archivos y responsabilidades

| Área | Fuente |
| --- | --- |
| Imagen mínima fijada por digest | `Dockerfile` |
| Ejecución no root, read-only y capacidades | `docker-compose.yml` |
| Supervisor y drenaje de ambos procesos | `docker/supervisor.mjs` |
| Entrada estable y staging | `wrangler.toml`, `worker/router.js` |
| Contenedores privados y bindings de secretos | `worker/container.js`, `scripts/configure-container.mjs` |
| Esquema e historial único de la aplicación | `db/migrations`, `scripts/migrate.mjs` |
| Auth y cookies del servidor | `backend/src/supabase.js`, rutas `/api/auth` |
| Validación firmada del registro | `supabase/functions/before-user-created` |
| Rotación y bootstrap de credenciales | `scripts/security` |
| Scans, artefactos firmados y promoción | `.github/workflows` |
| Excepciones de análisis documentadas | `.gitleaks.toml`, `security/accepted-findings.md` |

No se mantienen dos configuraciones Wrangler equivalentes: la del enrutador es
TOML y la de cada contenedor se genera bajo `.wrangler/deploy`, excluida de Git,
con metadatos públicos y nombres de bindings. Nunca incluye valores secretos.

## Desarrollo local

Requiere Docker/Compose, Node 22 y Supabase CLI 3.0.0. Las instalaciones y el login
de las herramientas se realizan explícitamente por el operador; no se ejecutan
instaladores ni autenticaciones automáticas desde la aplicación.

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
supabase --help
supabase start
node scripts/local-run.mjs docker compose --profile development up --build --force-recreate
```

El lanzador obtiene la configuración de la instancia local en memoria, aplica las
migraciones, crea logins locales restringidos y transmite sus credenciales al
proceso de Compose mediante su entorno. No imprime valores ni escribe archivos
`.env`. El comando Compose completo es el que proporciona el operador.

La aplicación queda en `http://localhost:8080`; Mailpit, en
`http://localhost:54324`. El registro exige confirmar el correo. La IA de este
perfil es explícitamente simulada; producción la rechaza. La regla de edad se
comprueba también en el trigger de creación del perfil, sin depender del cliente.

Las migraciones de Supabase CLI están desactivadas en su configuración: el
historial de la aplicación es `public.schema_migrations` y se gestiona solamente
con `scripts/migrate.mjs`. No usar simultáneamente `supabase db push` para estas
migraciones. Los servicios internos de Supabase conservan sus propios historiales.

Para ejecutar pruebas cuando el host todavía no tiene Node, se puede utilizar
la imagen de desarrollo sin instalar nada en el host:

```bash
docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v /etc/ssl/certs:/etc/ssl/certs:ro -v "$PWD:/workspace" -w /workspace node:22-bookworm-slim \
  sh -c 'npm ci && npm ci --prefix backend && npm ci --prefix frontend && npm test'
```

## Bootstrap remoto

Se ejecuta primero en staging. La promoción de código a producción es manual.
Los valores secretos se cargan desde un gestor seguro o mediante entrada oculta
al entorno de un proceso de duración limitada; no se pasan como argumentos, no
se escriben en plantillas y no se envían por el chat.

Ejemplo de entrada oculta en Bash:

```bash
read -rsp 'Token de bootstrap Cloudflare: ' CF_ROTATION_TOKEN
export CF_ROTATION_TOKEN
```

Preparar las variables no secretas a partir de `infra/environments.json` y el
account ID `ade8d34fb8bf1492fe80a25609c58d45`. Las plantillas `.env.example` son
inventarios de nombres, no archivos que deban rellenarse con secretos y guardarse.

### Permisos

- **Migrador/bootstrap PostgreSQL:** identidad administrativa usada solo desde un
  entorno protegido. No se transmite a la imagen ni al Worker de aplicación.
- **Logins API:** pertenencia a `stylingu_api`, sin herencia automática,
  superusuario, propiedad de tablas ni `BYPASSRLS`.
- **Logins de trabajos:** pertenencia a `stylingu_jobs`; acceso a cola mediante
  funciones privadas expresamente autorizadas y acceso a resultados por usuario.
- **Rotación PostgreSQL:** pertenencia a `stylingu_rotation`; solamente metadatos
  de rotación, estado de drenaje y cambio de contraseña de cuatro logins conocidos.
  No recibe `CREATEROLE`, lectura de perfiles ni acceso administrativo global.
- **Token de despliegue Cloudflare:** limitarlo a la cuenta del proyecto y a las
  operaciones necesarias de Workers, Containers/registro y bindings de Secrets
  Store. No añadir permisos DNS/WAF de zonas que no se utilizan.
- **Token de rotación Cloudflare:** gestión de los tokens administrados y escritura
  de sus secretos, con ámbito de la misma cuenta. Separado del token que rota.
- **Token de gestión Supabase:** limitarlo al proyecto del entorno y a Auth,
  funciones y claves API requeridas por bootstrap, verificación y rotación.
- **Token GitHub de rotación:** solamente el repositorio de StylingU; lectura de
  ejecuciones y escritura de secretos cifrados de sus entornos. No escritura de
  código. Los tokens iniciales tienen propietario, fecha de caducidad y renovación
  administrativa independiente.

`CF_DEPLOY_TOKEN_POLICY_JSON` contiene políticas oficiales con identificadores de
los grupos de permisos aprobados y el recurso de esta cuenta; no es un secreto.
Obtener esos identificadores de la API oficial al configurar la cuenta, sin
conceder permisos adicionales por ensayo. El conector OAuth no sustituye los
tokens limitados que necesita el runner de GitHub.

### Preparación de datos y secretos

1. Comprobar el destino, las copias de seguridad y que se trata de una instalación
   nueva. La migración de Auth se niega a actuar si encuentra usuarios existentes.
2. Aplicar el esquema con `DATABASE_URL` administrativa disponible solamente para
   el migrador. La conexión remota valida certificados; `PG_SSL_CA` permite añadir
   el certificado público de la CA cuando sea necesario. No utilizar `no-verify`.
3. Crear o reutilizar el Secrets Store de la cuenta. No crear otro por cada entorno.
4. Crear los logins restringidos y sus secretos por destino. Crear un secret API
   moderno exclusivo de la aplicación y guardar su ID para la rotación.
5. Configurar el hook y el correo mediante las APIs oficiales.

```bash
node scripts/migrate.mjs
npx wrangler secrets-store store create stylingu --remote
node scripts/security/provision-logins.mjs
node scripts/security/bootstrap-secrets.mjs
supabase functions deploy --help
supabase functions deploy before-user-created --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
node scripts/configure-auth.mjs
```

`provision-logins` escribe las URLs en Secret Store y la credencial del runner de
rotación en el secreto cifrado `ROTATION_DATABASE_URL` del entorno GitHub
correspondiente. Si un bootstrap se interrumpe, revisar metadatos antes de repetir;
no borrar ni sobrescribir logins que ya estén sirviendo tráfico.

Cada slot tiene cuatro secretos, con nombres
`stylingu-ENTORNO-SLOT-database-url`, `jobs-database-url`, `supabase-secret` y
`model-key`. Los valores se recuperan mediante bindings durante la ejecución.
Las contraseñas de la cuenta administrativa de PostgreSQL nunca se rotan como
sustituto de los logins de runtime.

### Verificación de correo con Supabase

La verificación y recuperación las realiza **Supabase Auth**, no un servicio de
correo añadido a Express. La función `before-user-created` comprueba la firma de
Standard Webhooks; `verify_jwt=false` se utiliza porque esa firma autentica al
emisor. Una petición sin firma devuelve 401 una vez configurado el secreto.

`AUTH_HOOK_SECRET` es un secreto de hook con formato admitido por Supabase. La
misma credencial se configura en Auth y en la función, sin registrarla en logs.
La función sin su secreto devuelve 503 y nunca acepta el registro por defecto.

El envío integrado de Supabase sirve para pruebas con destinatarios autorizados
de la organización y tiene límites de volumen. **No sirve para abrir el registro
a cualquier dirección.** Para producción, configurar SMTP propio dentro de
Supabase Auth; `configure-auth.mjs` bloquea la configuración de producción si falta
`SMTP_HOST`. No desactivar la confirmación para evitar esta restricción.
[Documentación oficial de pruebas de Auth](https://supabase.com/docs/guides/auth/testing-auth-flows).

Las plantillas usan un hash OTP que se consume en el callback del servidor. La
confirmación verifica el correo y vuelve al acceso por contraseña. La sesión de
recuperación se limita a cambiar la contraseña y después se revoca globalmente.
No se almacenan access tokens ni refresh tokens en `localStorage`.

## GitHub Actions y promoción

Crear `staging`, `production`, `staging-rotation` y `production-rotation` en GitHub
Environments. Producción necesita revisión obligatoria para las promociones de
código. Los entornos de rotación solo pueden ejecutarse desde la rama protegida
principal y operan sobre el digest ya desplegado, nunca sobre una imagen nueva.
Aplicar revisión a cambios de workflows y scripts de seguridad mediante protección
de rama/CODEOWNERS organizativos antes de habilitar sus permisos.

| Variables públicas por entorno | Secretos cifrados por entorno |
| --- | --- |
| `PUBLIC_ORIGIN`, `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_PUBLISHABLE_KEY` | `CLOUDFLARE_API_TOKEN`, `OPS_TOKEN` |
| `CLOUDFLARE_ACCOUNT_ID`, `CF_SECRET_STORE_ID`, `PG_SSL_CA` opcional | `MIGRATION_DATABASE_URL`, `SUPABASE_ACCESS_TOKEN`, `AUTH_HOOK_SECRET` |
| `SMOKE_FACE_PATH`, `SMOKE_BODY_PATH` | SMTP: `SMTP_USER`, `SMTP_PASSWORD` |
| SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` | Solo rotación: `CF_ROTATION_TOKEN`, `SUPABASE_ROTATION_TOKEN`, `ROTATION_GITHUB_TOKEN`, `ROTATION_DATABASE_URL` |
| Solo rotación: `CF_CURRENT_TOKEN_ID`, `SUPABASE_CURRENT_KEY_ID`, `CF_DEPLOY_TOKEN_POLICY_JSON` | La clave de Meta y el secret API de aplicación se guardan en Secret Store, no en el frontend |

Las rutas de smoke test deben apuntar a dos JPEG de prueba aprobados para su envío
al proveedor real: cara y cuerpo. No usar fotografías de clientes ni producir un
éxito de IA simulado para permitir una promoción.

Flujo:

1. CI comprueba sintaxis, pruebas, dependencias, CodeQL, secretos y configuración.
2. Construye una sola imagen `linux/amd64`, comprueba usuario/filesystem/`sharp`,
   analiza vulnerabilidades y genera SBOM.
3. Solo un push a `main` publica la imagen. Se firma el digest con OIDC y se
   adjunta la SBOM firmada. Las credenciales temporales del registro se mantienen
   en `/dev/shm` y se retiran al terminar.
4. Staging verifica firma, identidad del workflow y SBOM, aplica migraciones,
   despliega el slot inactivo y realiza verificaciones funcionales reales.
5. Se cambia el destino con comprobación de revisión; una respuesta tardía o una
   promoción repetida no puede sobrescribir un cambio posterior.
6. `Promote production` recibe el ID de una ejecución CI exitosa y su SHA. Comprueba
   que proceden de un push de `main`, y promociona el **mismo digest**, sin rebuild.

La primera instalación requiere `bootstrap=true`: crea ambos slots antes de
publicar el enrutador y configurar `OPS_TOKEN`. Para staging automático, establecer
la variable de repositorio `STAGING_BOOTSTRAP=true` únicamente en esa instalación
y retirarla después. No utilizar bootstrap para reparar un despliegue existente.

El contenedor privado solo acepta tráfico de los service bindings. El enrutador
niega `/internal/*`; los probes que escriben/leen/eliminan una imagen de salud
están detrás del canal de operaciones protegido. Las operaciones no se cachean. Los logs automáticos de invocación están
desactivados para no registrar URLs de confirmación con hashes OTP; los eventos
explícitos contienen metadatos sin credenciales. Revisar también las políticas de
logs SQL del proveedor para que no se registren parámetros sensibles.

## Rotación, drenaje y rollback

El workflow diario consulta el estado persistido por entorno. Los registros
contienen IDs y etapas, nunca valores de claves. Los despliegues y las rotaciones
comparten exclusión mutua por entorno.

- Supabase secret API: 30 días; candidato en el slot inactivo, reinicio, probes,
  promoción y convergencia de ambos consumidores. Los probes comparan una huella
  SHA-256 de la credencial efectivamente cargada, no solo el éxito de una petición. Revocar la anterior solo después
  de 24 horas y sin trabajos pendientes de drenaje.
- Cloudflare deploy token: 90 días; crear un token distinto con la política
  aprobada, verificarlo y actualizar el secreto cifrado de GitHub. No utilizar
  `roll token`, que invalida inmediatamente el valor anterior. Esperar el período
  de gracia y que no queden ejecuciones anteriores en curso antes de revocar.
- PostgreSQL: dos logins por función. Cambiar primero los del slot inactivo y
  verificarlo; después del cambio y del drenaje, retirar la contraseña anterior.
  El runner restringido no puede modificar otros roles.
- JWT signing keys: procedimiento separado. Crear standby, esperar propagación,
  rotar y revocar la anterior después de la vida máxima del JWT y de las cachés.
  No rotar `anon`/`service_role` legacy como si fueran claves independientes.
  [Documentación oficial de signing keys](https://supabase.com/docs/guides/auth/signing-keys).

```bash
node scripts/security/rotate.mjs supabase
node scripts/security/rotate.mjs cloudflare
node scripts/security/rotate-database.mjs
```

Si falla la preparación, se conserva la credencial actual. Un fallo ambiguo de
proveedor puede dejar un candidato sin utilizar: revisar los IDs administrados y
el estado persistido antes de retirar ese candidato; nunca revocar la credencial
anterior para intentar corregir un error. No volver a ejecutar automáticamente
trabajos de IA cuyo resultado económico sea incierto.

Para volver al slot anterior, consultar su release y digest en el estado de
operaciones, verificar el candidato y promover con la revisión actual:

```bash
node scripts/ops.mjs status
node scripts/ops.mjs check
node scripts/ops.mjs promote
```

En estos comandos `DEPLOY_SLOT`, `RELEASE_VERSION`, `CONTAINER_IMAGE` y
`EXPECTED_REVISION` deben corresponder al destino y a la revisión devueltos por
`status`. No se infieren de una etiqueta `latest`. Si una rotación ya revocó una
credencial, actualizar los bindings y verificar el destino antes del rollback.

Los cambios de enrutamiento no revierten migraciones. No desplegar migraciones
incompatibles con el slot anterior mientras se mantiene la ventana de rollback.
El supervisor permite terminar trabajos y peticiones; el estado de trabajos
interrumpidos pasa a incierto, sin repetición automática del gasto.

## Verificación y límites de los controles

```bash
npm run check
npm test
node tests/browser.mjs
docker compose --profile development --profile staging config --quiet
docker build --platform linux/amd64 -t stylingu:review .
npx wrangler deploy --env staging --dry-run
node scripts/security/audit.mjs
node scripts/remote-smoke.mjs
```

La auditoría incluye el código de `all-deploy`, distribuido con su licencia bajo
`security/vendor/all-deploy`. Además comprueba explícitamente que npm y sus
análisis de dependencias se ejecutan: su ausencia bloquea la operación. Los lotes pendientes de migraciones se confirman en una sola transacción,
incluidas las políticas RLS. El árbol
que se despliega debe corresponder a un commit revisado, sin cambios pendientes.

| Control | Evidencia o límite |
| --- | --- |
| Imagen no root | UID 65532; código propiedad de root, sin shell ni gestor de paquetes de runtime |
| Filesystem y capacidades | Compose impone `read_only`, `cap_drop: ALL`, `no-new-privileges` y `/tmp` en RAM |
| Cloudflare Containers | No se afirma que implemente flags Docker no expuestos por su API; comprobar aislamiento propio de la plataforma |
| Identidad | Auth verifica al usuario; RLS comprueba propiedad y existencia de su sesión; no se autoriza con metadata editable |
| SQL | Identidad por transacción, sin filtración entre conexiones del pool; logins sin propiedad ni bypass |
| Fotos | Bucket privado; rutas por usuario, sin políticas anónimas; prueba de lectura cruzada denegada |
| Frontend | CSP sin `unsafe-inline`/`unsafe-eval`, fuentes locales, sin claves privadas ni tokens en almacenamiento web |
| Edge | Límites compartidos para ambos slots, origen fijo y protección de operaciones mutables |
| WAF | No se configura WAF de zona sobre `workers.dev`; requiere una zona/dominio propio si se amplía el alcance |
| Supply chain | Imágenes por digest, lockfiles, acciones por SHA, SBOM y firmas con identidad verificable |
| Secretos | Runtime en Secret Store; bootstrap cifrado en GitHub; configuración temporal sin valores privados |
| IA y colas | Claim atómico con `SKIP LOCKED`; resultados inciertos no se vuelven a facturar automáticamente |

Los 43 hallazgos iniciales de Gitleaks se clasificaron como identificadores de
Figma y una asignación de código de biblioteca. Las excepciones exactas se
justifican en `security/accepted-findings.md`; no se excluyen archivos completos.
La ausencia de alertas de un scanner no constituye una certificación.

## Estado de esta entrega

Los resultados ejecutados y las condiciones todavía pendientes se detallan en
[la matriz de verificación](verificacion-despliegue-seguro.md).

Se creó staging y se aplicó allí el esquema inicial seguro; se desplegó la función
de hook. Producción no se migró ni se promocionó. La función necesita su secreto
y la conexión del hook en la configuración de Auth antes de aceptar solicitudes.

La primera preview completa depende de las credenciales limitadas de bootstrap,
los bindings reales de Secret Store, la disponibilidad/facturación de Containers,
y los fixtures aprobados para el análisis real. Para abrir el registro público,
Supabase Auth necesita un transporte SMTP propio. Esas dependencias no se
sustituyen por valores de demostración ni por resultados de pruebas simulados.
