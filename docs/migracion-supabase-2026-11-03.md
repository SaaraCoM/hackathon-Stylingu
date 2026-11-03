> Actualización: la usuaria canceló la copia de datos locales. El despliegue gratuito se documenta en despliegue-gratuito.md; los pasos de transferencia de este documento quedan como referencia histórica y no se ejecutarán.

# Migración de StylingU a Supabase

## Arquitectura y alcance

La versión local revisada es el commit 95a722a: SPA editorial, Express/Node 22,
pg, sharp, sesiones opacas y trabajos en Postgres. Se conservan estos contratos.
La interfaz y su preview anteriores siguen vigentes; esta fase no añade pantallas.
Se aplica la revisión de db-migration-reviewer: operaciones aditivas, inventario
antes de copiar, comprobación de permisos y origen conservado para reversión.

El proyecto Stylingu (zbfxwbuuuzjzmsrraxkf) estaba vacío al inspeccionarlo.
Stylingu staging (ckcszhdhgwytiaxapike) contiene otra arquitectura con Supabase
Auth, funciones privadas y roles por usuario. No es compatible con este backend
sin un adaptador adicional. No se sobrescriben sus tablas ni políticas.

## Modelo y seguridad

Se aplica 001_init.sql, 002_birth_date.sql y la nueva migración de acceso solo
servidor. RLS habilitado sin políticas públicas. anon, authenticated, service_role
y PUBLIC no reciben acceso a las 16 tablas de aplicación. Las sesiones siguen
siendo comprobadas por Express. La conexión interna debe ser del propietario o
un rol interno expresamente autorizado; la clave de Storage no da acceso SQL.

Se conserva el bucket privado stylingu-photos. Las fotos normalizadas pasan por
el backend, con sus verificaciones de propietario. Ninguna clave privada llega
al cliente. La migración nueva rechaza tablas ausentes o políticas preexistentes
para evitar alterar accidentalmente otro modelo de autorización.

## Secuencia y reversión

1. Inventariar origen local y destino sin imprimir datos personales.
2. Probar SQL e idempotencia en Postgres efímero, incluyendo acceso denegado.
3. Aplicar esquema y permisos juntos en la base de producción vacía.
4. Verificar tablas, RLS, privilegios y bucket mediante consultas remotas.
5. Configurar credenciales remotas en .env.production, copiar datos si existen,
   verificar integridad y ejecutar flujos reales contra preview.
6. Superar auditoría, preview y promoción a Cloudflare según all-deploy.

No se borra el origen local. La reversión de la aplicación vuelve a su conexión
anterior; los datos nuevos de Supabase deben reconciliarse antes de volver atrás.
No se desmontan tablas con datos para deshacer un despliegue.

Estado y resultados: se documentarán después de ejecutar las comprobaciones.

## Resultado verificado

- Migración remota aplicada: stylingu_express_postgres_private_storage.
- 16 tablas con RLS activo y cero permisos para PUBLIC/anon/authenticated/service_role.
- Bucket stylingu-photos privado, JPEG, límite 10 MiB.
- Advisors: solo 16 avisos INFO de RLS sin políticas, deliberado porque el acceso es del backend propietario.
- Pruebas de permisos: 5/5; pruebas de transferencia: 5/5; suite backend anterior también pasó con el nuevo esquema.
- Verificación de sintaxis: 50 archivos; npm audit raíz: cero vulnerabilidades de producción.
- Origen real: 6 usuarios, 9 fotos, 6 sesiones, 4 trabajos terminados y 1 cuota.
- La transferencia real NO se ha ejecutado: faltan DATABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.production.
- Publicación NO ejecutada: el acceso Cloudflare fue bloqueado por el límite del control automático de aprobación.

SQL remoto exacto aprobado: docs/sql/stylingu-production-approved.sql.

Tras configurar credenciales, revisar inventario con `node scripts/transfer-to-supabase.mjs` y aplicar la copia con `node scripts/transfer-to-supabase.mjs --apply`. La copia bloquea escrituras en el origen mientras mantiene la instantánea, exige destino vacío y compara todas las filas y bytes de fotos. No elimina el origen. Si se pierde conexión durante COMMIT, retiene las fotos y exige reconciliación para evitar borrar bytes que podrían estar ya referenciados.

Una ejecución repetida con destino ocupado se detiene; no usa upsert de filas ni sobreescribe fotos. Para un nuevo entorno, crear primero el esquema y bucket con el SQL aprobado; no mezclar con la arquitectura Auth del staging existente.

Documentación del aviso informativo: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
