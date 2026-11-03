# Preparación de entrega StylingU

## 1. Estructura y contratos
Web responsive/PWA con SPA JavaScript existente, Express sobre Supabase Edge, Postgres y Storage privado. Se mantienen rutas, sesiones opacas HttpOnly y datos remotos. No se copian datos locales. iOS/Android mediante navegador/PWA; sin prometer builds nativos.

Navegación: acceso → registro guiado → fotos/consentimiento → análisis → Color/Makeup/Armario/Compras. Mi perfil contiene todos los editores posteriores, fotos, restricciones y opciones de cuenta. El contenido principal muestra resultados, no formularios de configuración.

Dominio existente: usuario, sesión, perfil versionado (declared), preferencias, fotos privadas, trabajos persistentes, prendas y planes. Sin tablas nuevas para preguntas: se reutilizan preferences, profile.declared y userMeta. Objetivos/estilos ayudan a orientar las sugerencias; piel, acabado, intensidad, presupuesto y restricciones se declaran, nunca se infieren de una foto. Consentimiento explícito antes de enviar fotos al proveedor; solo a demanda, sin crear imágenes derivadas de la identidad del usuario.

Módulos: frontend/public/js/journey.js para registro, loading.js para solicitudes concurrentes; perfil movido al modal existente. shared/proxy-auth.js firma ECDSA de método/ruta/origen/IP/cookie/cuerpo/tiempo, worker/free.js verifica Turnstile y firma, edge/index.ts verifica firma antes de Express; edge/rate-limit.js conserva contadores SQL con claves verificadas. No abstracciones generales ni cambios de stack.

Seguridad: amenazas de fuerza bruta, bots, CSRF, IDOR, XSS, filtración de fotos/claves, abuso de IA, cargas grandes, bypass directo del backend y DoS. Turnstile real en registro/login/recuperación, firma privada solo en secreto Worker y clave pública en Edge, validación de origen, límites por IP/cuenta + tope global, cuotas IA, no-store, CSP y frame-ancestors, validación y reencodificación de fotos, sesiones revocables, RLS servidor. Ningún control promete bloquear todos los bots o todos los ataques. Pruebas negativas y revisión del proveedor antes de entregar.

Despliegue: conservar planes gratuitos y proyecto Supabase actual; build → auditoría limpia → preview → verificación funcional/seguridad/accesibilidad → promoción. Secretos fuera del frontend y del Git. Reversión de código sin borrar datos. SMTP requiere configuración del proveedor para recuperación real.

## 2. Diseño visual
Dirección: atelier editorial femenino y creativo, rosa empolvado y burdeos accesible, papel cálido, tipografía existente. Tarjetas de elección grandes, un tema por diapositiva, progreso y volver sin perder respuestas; no preguntas cosméticas sin uso real. Campos opcionales identificados. Estados de carga, validación, error, vacío y éxito explícitos. Teclado, foco y reducción de movimiento.

Recursos: composiciones propias generadas para StylingU, sin imágenes de stock ni ejemplos predeterminados. Fotografías personales siguen siendo únicamente las que la persona sube; el catálogo no inventa productos. Preview en imagen antes de desarrollo; prompts y procedencia documentados.
## 3. Desarrollo implementado

Registro de cinco diapositivas, preguntas opcionales indicadas, respuestas persistidas en una sola inserción de usuario. Se conservan versiones de perfil y no se copian datos locales. Formularios posteriores solo en Mi perfil, agrupados en desplegables. Consentimiento explícito en la consulta antes del envío a Meta. Cada petición de API muestra una pantalla con estado y cancelación; el análisis mantiene el estado mientras consulta su trabajo durable.

Se han sustituido las siete fotografías editoriales, logotipo y dos iconos por recursos originales generados con image_gen integrado. Rutas: frontend/public/assets/editorial/*, frontend/public/assets/logo.jpg e icon-192.png/icon-512.png. Prompts completos: docs/evidencia/entrega/imagen-prompts.json. Imágenes editoriales ficticias; las fotos privadas siguen siendo las aportadas por cada usuario.

## 4. Revisión y pruebas

Pruebas automáticas negativas de firma (método, ruta, IP, origen, cookie, cuerpo, tiempo y tipo), captcha ausente/fallido/repetido, acción/hostname, CSRF, JSON y cargas excesivas. Contadores SQL atómicos entre instancias; límites por IP de 120 solicitudes/minuto y 10 intentos de acceso/minuto, tope global SQL 1200/minuto, 5 solicitudes IA/minuto por cuenta y cuota diaria existente. El límite de Cloudflare es aproximado por centro; el contador SQL es compartido.

RLS en 16 tablas, sin grants de tabla a anon/authenticated/service_role; bucket privado confirmado por MCP. INFO de Supabase sobre RLS sin políticas es deliberado: acceso solo del backend propietario, no desde clientes. Ver https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

18 flujos locales de navegador con Postgres efímero, IA simulada explícita y cámara sintética: correctos. Dossier y escáner sin infracciones automáticas WCAG A/AA después de cargar fuentes e imágenes. La prueba local no acredita Turnstile real ni inferencia remota; se comprobarán en preview. La recuperación de contraseña necesita SMTP real; no se simula correo enviado.

No es una certificación ni una prueba de penetración independiente. La protección limita abuso y protege la propiedad de datos, sin prometer ausencia absoluta de bots o vulnerabilidades. La clave Meta encontrada en una plantilla histórica debe rotarse en el proveedor antes de una entrega comercial; retirarla del archivo actual no invalida copias anteriores.

Fuentes técnicas: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ y https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/.
