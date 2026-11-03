# Evidencia de verificación de la entrega

Fecha: 3 de noviembre de 2026. Alcance: implementación local y preparación de
staging. Estos resultados no certifican cumplimiento OWASP/CIS ni disponibilidad
en producción. La guía de ejecución es [despliegue-seguro.md](despliegue-seguro.md).

## Resultados ejecutados

| Comprobación | Resultado | Alcance real |
| --- | --- | --- |
| `npm run check` | Correcto | Sintaxis del backend, código compartido, frontend y scripts |
| `npm test` | 36 pruebas de backend/seguridad y 24 comprobaciones de frontend correctas | PostgreSQL efímero real; transporte Auth simulado explícitamente; incluye RLS, sesiones revocadas, identidad por transacción, idempotencia de trabajos y migraciones repetidas |
| Worker en Miniflare/workerd | Correcto, incluido en backend | Durable Objects con SQLite: promoción con revisión, candidato incorrecto, autenticación de operaciones y límites compartidos |
| Chromium | 15 comprobaciones correctas, sin errores ni incidencias de accesibilidad detectadas | HTTP local, PostgreSQL efímero, cámara sintética y proveedor de IA simulado; incluye persistencia, navegación, cuenta y vistas adaptables |
| Docker `linux/amd64` | Construcción correcta | Dependencias y assets se construyen dentro de las etapas fijadas por digest |
| Runtime Distroless | UID 65532; escritura en `/app` denegada y en `/tmp` permitida | Ejecución con filesystem de solo lectura, capacidades eliminadas y `no-new-privileges`; transformación PNG → WebP con `sharp` correcta |
| Assets de la imagen | Correcto | Service worker con versión de release y fuentes locales incluidas |
| Compose | Configuración válida | Ambos perfiles pasan `docker compose ... config --quiet`; no equivale a haber arrancado el stack completo de Supabase CLI |
| Wrangler | Dry run del enrutador de staging correcto | Compilación y bindings; no publica Workers ni acredita acceso al registro o a Containers |
| Actionlint 1.7.12 | Correcto | Los cuatro workflows pasan su validación estática |
| Gitleaks 8.30.1 | Sin hallazgos pendientes | Escaneo redactado del contenido actual; las excepciones históricas exactas están en `security/accepted-findings.md` |
| Trivy 0.76.1, imagen | 0 vulnerabilidades altas/críticas y 0 secretos detectados | Imagen local `stylingu:security-review`; resultado válido para el análisis y base consultados en esta fecha |
| Trivy 0.76.1, filesystem | 0 vulnerabilidades altas/críticas, 0 errores de configuración altos/críticos y 0 secretos detectados | Configuración y dependencias locales |
| Dependencias npm | Sin alertas altas/críticas | Backend conserva 5 alertas moderadas en herramientas de desarrollo; la imagen de runtime analizada no contiene esas herramientas |
| Supabase staging | Esquema y función desplegados | Proyecto `ckcszhdhgwytiaxapike`, organización `cpqfpksdwjhtkesvgwns`, región `eu-west-1`; cotización de 0 al mes confirmada antes de crearlo |
| Asesor de seguridad de staging | Sin avisos de nivel warning/error | Un aviso informativo por `public.schema_migrations`: RLS activo sin políticas, denegación deliberada para roles de aplicación |

Los artefactos locales de análisis y navegador se guardan en `.tmp-security`,
excluido de Git y del contexto Docker. Los workflows generan evidencias nuevas
para cada release; no reutilizan estos resultados para autorizar una promoción.

## Pruebas pendientes y condiciones de promoción

- Configurar los logins restringidos, Secret Store, tokens limitados y GitHub
  Environments. El conector Cloudflare devuelve 403 al consultar facturación y no
  permite gestionar los tokens necesarios con la autorización actual.
- Comprobar el plan, el coste y la disponibilidad de Containers antes de crear
  recursos facturables. La cotización de staging Supabase no cubre Cloudflare.
- Configurar `AUTH_HOOK_SECRET` tanto en la función como en Auth y activar el hook.
  La función desplegada todavía no está conectada; sin secreto falla cerrada.
- Verificar registro, correo real, confirmación, renovación, recuperación y logout
  contra Supabase Auth. El correo integrado se limita a pruebas autorizadas;
  producción necesita SMTP propio configurado en Supabase.
- Ejecutar la preview completa con Storage real y dos cuentas, aislamiento SQL,
  API y objetos, fixtures aprobados de cara/cuerpo y análisis real. Reiniciar el
  contenedor y comprobar persistencia y drenaje.
- Ejecutar CI remoto, publicar el artefacto, generar SBOM, firmar mediante OIDC y
  verificar firma e identidad antes de desplegarlo. Los workflows están escritos
  y validados, pero no se han ejecutado en GitHub en esta entrega.
- Demostrar la rotación real bajo tráfico, el rechazo de un candidato inválido,
  la ventana mínima de 24 horas, la convergencia de consumidores y la denegación
  de la credencial revocada. Las pruebas locales verifican el protocolo de
  estados; no sustituyen esa prueba de integración.
- Completar auditoría `all-deploy` sobre un commit limpio y preview saludable.
  La promoción a producción sigue siendo manual y conserva el digest probado.

Producción no se ha migrado ni promocionado. Los datos locales originales
permanecen intactos. Los archivos previos de skills y la propuesta UX del armario
no forman parte del commit de esta entrega.
