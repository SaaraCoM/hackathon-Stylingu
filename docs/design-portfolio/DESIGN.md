# Design System: Stylingu — Portfolio personal

Propuesta visual · 29 de octubre de 2026 · Preparado con las reglas de StitchDesign.

Este documento describe el nuevo concepto y su implementación futura; no acredita cambios en la aplicación. Complementa la imagen conceptual entregada. La modelo, la estación y los productos de la imagen son ejemplos, no un análisis de la persona usuaria. Esta propuesta se conserva separada del DESIGN.md actual del proyecto.

## 1. Visual Theme & Atmosphere

Una galería de estilo personal con dirección de arte de portfolio de moda: fotografía protagonista, composiciones asimétricas, recortes de prendas, pigmentos y muestras de color. Densidad 4/10, variación 8/10, movimiento 6/10. Sensación limpia, cercana y editorial.

Las imágenes ocupan aproximadamente el 75 % del área de contenido. El texto visible se limita a títulos, etiquetas y acciones. Las explicaciones del análisis aparecen al abrir un detalle. La pantalla inicial es un portfolio de la persona, no una página comercial ni un dashboard.

Se conservan las áreas del producto actual: colorimetría, maquillaje, vestuario y armario, recomendación de compras. La entrada Mi estilo reúne visualmente sus resultados.

## 2. Color Palette & Roles

| Nombre | Valor | Función |
| --- | --- | --- |
| Blanco galería | #FAFAFA | Lienzo principal, neutro constante |
| Blanco superficie | #FFFFFF | Diálogos y superficies funcionales |
| Tinta carbón | #18181B | Texto y pictogramas |
| Gris lectura | #52525B | Etiquetas secundarias |
| Gris línea | #E4E4E7 | Separadores estructurales de 1 px |
| Terracota | #985E50 | Único acento de interfaz: acción, selección y foco |

El terracota tiene una saturación moderada. El texto del botón principal es blanco. Las muestras de color personales, las prendas y las fotografías son contenido; pueden contener otros colores sin convertirse en acentos de navegación. No recolorear toda la interfaz con cada resultado del agente: mantener una base estable y adaptar imágenes, muestras y recomendaciones.

## 3. Typography Rules

- Familia principal: Outfit, pesos 400, 500 y 600. Alternativa de diseño: Satoshi. Usar sans-serif como respaldo técnico.
- Marca: stylingu, minúsculas, peso 600, 30 px, interletraje -0.04em.
- H1: clamp(2rem, 3.4vw, 3.5rem), interlineado 1.08, peso 400, interletraje -0.035em.
- H2: clamp(1.5rem, 2.4vw, 2.25rem), interlineado 1.15, peso 400.
- Texto funcional: 16 px/1.5. Etiquetas: mínimo 14 px/1.4; nunca reducirlas para imitar el tamaño de la imagen conceptual.
- Microetiquetas en mayúsculas solo para la entrada editorial. Máximo 65 caracteres de ancho para detalles; no párrafos en portada.
- Números técnicos del detalle: Geist Mono. No porcentajes decorativos ni métricas inventadas.
- No Inter, serif genéricas ni titulares con gradientes. En esta interfaz se usa exclusivamente sans-serif.

## 4. Component Stylings

### Navegación

Cabecera de 72 px con marca a la izquierda, Mi estilo / Color / Armario / Makeup y acceso al perfil a la derecha. Acceso a Escanear desde Antes de comprar y desde la navegación móvil. Separador inferior fino, sin efecto cristal. Destino activo con subrayado terracota de 2 px. Cada control dispone de un área de al menos 44 × 44 px.

### Imágenes y galerías

Fotografías sin contenedores elevados ni marcos decorativos. Esquinas rectas. Separación mediante blanco, escala y alineación. Pie breve fuera de la fotografía; nunca texto superpuesto al rostro o a las prendas. Relaciones de aspecto 4:5 para look, 4:3 para rostro y accesorios, 3:2 para maquillaje. Recorte configurable por imagen para conservar ojos, labios y prendas relevantes.

Usar retratos, prendas aisladas, bodegones, detalles de tela y trazos de pigmento. No aplicar retoques que alteren el tono de piel utilizado por el análisis. La imagen editorial y la fotografía de diagnóstico tienen funciones distintas.

### Muestras de color

Seis círculos de 56–72 px en escritorio dentro de su propia zona. Los tonos del ejemplo son crema, arena, terracota, cacao, oliva y rosa apagado. En producción proceden del perfil validado. Selección con contorno y marca accesible, nunca solo mediante color. Nombre y código disponibles al seleccionar; no mostrar seis bloques de explicación en portada.

### Acciones

Una acción primaria rellena por vista: Ver mi look en la portada. Botón rectangular de radio 2 px, altura mínima 48 px y padding horizontal 24 px. Resto de acciones mediante texto o icono acompañado de etiqueta. Hover con cambio de opacidad; pulsación con translateY(1px). Foco visible de 2 px con separación de 3 px. Sin sombras exteriores.

### Días y guardados

Semana con siete controles L / M / X / J / V / S / D; selección subrayada. El nombre accesible expresa el día completo y su fecha. Una selección cambia la composición de prendas. Guardar conserva el conjunto elegido y muestra confirmación breve; no abrir una tarjeta adicional permanente.

### Cámara y recomendaciones

Antes de comprar presenta una fotografía de producto junto a Escanear. Al abrir cámara, controles fuera del área principal de captura. Un resultado real muestra Encaja contigo, Mejor otra opción o No puedo valorarlo, con explicación ampliable. No afirmar compatibilidad si no se identifica el producto o falta información. Los ingredientes y restricciones personales requieren sus datos correspondientes; el color por sí solo no permite valorarlos.

### Formularios, estados y detalles

Los formularios se reservan al onboarding, perfil y detalle. Etiqueta sobre el campo, ayuda opcional y error debajo. Los detalles se abren en una vista dedicada o diálogo accesible. Skeleton con las mismas proporciones de las imágenes; sin spinner genérico. Vacío con una ilustración lineal y una acción contextual: Añadir prenda o Completar análisis. Error inline breve con Reintentar. No sustituir datos ausentes por recomendaciones ficticias.

## 5. Layout Principles

### Lienzo de escritorio

Ancho de referencia 1440 px; contenido máximo 1440 px, márgenes fluidos de 24–48 px. CSS Grid de 12 columnas, gutters 16–24 px. Secciones separadas por 48–80 px. Sin contenedores con borde alrededor de cada función.

1. **Apertura / Hoy, muy tú.** Fotografía vertical del look en las siete columnas izquierdas. Cinco columnas derechas para microetiqueta, titular con una pequeña imagen de tejido entre palabras, retrato, paleta y acción. Cada elemento ocupa una zona independiente. Imagen inline de aproximadamente 88 × 40 px; no debe interferir con el texto.
2. **Tu semana.** Título y selector de días; tres fotografías de tamaños desiguales: flat lay de prendas, detalle de accesorios y look alternativo. Distribución aproximada 5/3/4 columnas y alturas deliberadamente diferentes. Son imágenes abiertas, no tres tarjetas.
3. **En tu tono.** Macro de mirada, labios, producto y trazo de pigmento. Distribución 4/2/3/3 columnas. Solo Mirada, Labios y Piel como etiquetas; los tutoriales paso a paso aparecen al abrir la imagen correspondiente.
4. **Antes de comprar.** Foto del producto, acción Escanear y composición de referencias con resultado breve. Separación espacial o línea vertical; sin widget flotante sobre el producto en esta portada.
5. **Cierre.** Marca, frase corta y utilidades. Sin bloque de captación comercial.

La imagen entregada representa esta portada. Las vistas de detalle y estados que siguen se especifican aquí para la implementación, aunque no están renderizados en la imagen.

### Responsive

Por debajo de 768 px, todas las composiciones de contenido pasan a una sola columna. Márgenes de 16–20 px; secciones separadas por 40–48 px. Orden de la apertura: titular, look, retrato, muestras, acción. La fotografía inline se sitúa debajo del titular. No collage con posiciones absolutas ni desplazamiento horizontal.

Las muestras son controles inline que se ajustan a varias líneas, no columnas de contenido. La semana ajusta sus controles sin exceder el ancho. Navegación móvil compacta mediante menú con destinos completos y acceso visible a Escanear. Respetar safe-area y no tapar contenido con barras fijas. Para vistas de cámara o pantalla completa usar min-height: 100dvh.

### Contenido del agente

El agente proporciona datos estructurados de perfil, paleta, looks, maquillaje y recomendación; la UI los representa mediante componentes definidos. No ejecutar HTML, CSS ni URLs arbitrarias propuestas por el modelo. Validar recursos antes de mostrarlos. La información personal se conserva en las áreas autenticadas existentes. Evitar imágenes externas genéricas que se presenten como pertenencias reales del armario.

## 6. Motion & Interaction

- Entrada de fotografías: opacity 0→1 y translateY(12px→0), con desfase de 60 ms y duración de 360–480 ms.
- Interacción de galerías: escala sutil 1→1.015 dentro del recorte, sin alterar la geometría de la página.
- Física de referencia: stiffness 100, damping 20; evitar velocidad lineal.
- Microbucle solo mientras existe actividad: shimmer del skeleton o pulso tenue del indicador de escaneo. No animación infinita en controles inactivos.
- Animar únicamente transform y opacity. No animar top, left, width o height.
- Con prefers-reduced-motion: reduce, eliminar desplazamientos, escalas y bucles; conservar estados y feedback.
- Cambios de día con transición breve sin perder foco ni reiniciar el scroll. Los tutoriales no se reproducen automáticamente con sonido.

## 7. Anti-Patterns (Banned)

- No cuadrículas de tarjetas iguales, tarjetas anidadas, paneles de estadísticas ni cajas redondeadas para todo.
- No emojis, iconos decorativos masivos, cursores personalizados o marcas ficticias de productos.
- No negro puro #000000, neón violeta/azul, sombras luminosas, degradados ornamentales o acentos sobresaturados.
- No Inter, Times New Roman, Georgia o Garamond.
- No texto sobre imágenes, solapamientos, collages de posición absoluta o hero centrado.
- No porcentajes inventados, reseñas falsas, precios sin fuente ni recomendaciones presentadas como verificadas en el mockup.
- No párrafos explicativos en portada ni mensajes como Scroll to explore, Swipe down o flechas de scroll.
- No enlaces de imágenes rotos; utilizar activos locales/licenciados o generados con procedencia conocida.
- No sustituir estados de falta de datos por rostros o armarios ajenos.

## 8. Prompt para generar pantallas en Stitch

Diseña Stylingu como un portfolio personal de moda y belleza, en español. Usa este documento como fuente de verdad. Portada de escritorio de 1440 px con aproximadamente 75 % de contenido visual: gran look fotográfico a la izquierda; titular Hoy, muy tú., retrato, seis muestras de color y Ver mi look a la derecha. Continúa con Tu semana en una composición de fotografías desiguales, En tu tono con macros de ojo y labios, bodegón cosmético y pigmentos, y Antes de comprar con producto y Escanear. Fondo #FAFAFA, tinta #18181B, Outfit y un único acento #985E50. Imágenes sin tarjetas, sin sombras y sin texto superpuesto. Muy poco texto y una sola acción principal. Genera también una adaptación móvil de 390 px con una columna y sin desbordamiento. Trata el contenido personal del ejemplo como ficticio, no como diagnóstico real.

## 9. Criterios de verificación al implementar

- Portada dominada por imágenes; cada sección se reconoce sin leer explicaciones.
- Paleta y recomendaciones alimentadas por resultados reales, con estado explícito cuando faltan datos.
- Navegación, selección de día, guardado, detalle de maquillaje y escaneo accesibles por teclado y táctil.
- Texto funcional mínimo 14 px; objetivos táctiles mínimos 44 px; contraste WCAG AA verificado en la implementación.
- Pruebas visuales a 390, 768 y 1440 px; sin superposición ni scroll horizontal.
- Imágenes con dimensiones reservadas, srcset y carga diferida bajo el primer bloque; cargar el look principal prioritariamente.
- Acceso a cámara con permiso y alternativa de subir foto o introducir producto si no está disponible.
- Verificar reducción de movimiento, foco de diálogos, nombres accesibles e imágenes alternativas.

La entrega actual es conceptual: imagen y especificación. Las verificaciones funcionales y de accesibilidad corresponden a la futura implementación.
