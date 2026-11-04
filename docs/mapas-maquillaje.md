# Tu mapa de maquillaje

Integrado en la pestaña Maquillaje, dentro de la sección «Tu mapa de maquillaje». El visor ilustrativo utiliza los recursos del ZIP y conserva el probador de color sobre fotografías como una funcionalidad separada.

## Arquitectura existente

El frontend utiliza HTML, CSS y JavaScript sin framework, con scripts clásicos, componentes DOM y el almacén `store`. El backend es Express sobre Node 22; el análisis existente usa el contrato de `shared/ai-contract.js` y el cliente Meta AI de `shared/meta-client.js`. `analysis.makeup.faceShape` admite `oval`, `corazón`, `diamante`, `cuadrada`, `redonda`, `alargada` y `no determinado`.

Existen servicios de segmentación y generación de imágenes, pero no se encontró una integración de puntos anatómicos faciales ni de deformación geométrica de máscaras. El visor no hace nuevas llamadas de IA. No se añadieron dependencias de la aplicación ni tablas de base de datos.

## Componente reutilizable

`frontend/public/js/face-makeup-map.js` define `FaceMakeupMap`:

```js
const viewer = new FaceMakeupMap(document.getElementById('contenedor'), {
  faceShape: 'ovalado', // ovalado, corazon, diamante, cuadrada
  showBronzer: false,
  showContour: false,
  showBlush: true,
  showHighlighter: false,
  opacity: 0.85,       // 0–1; valores fuera del intervalo se limitan
  interactive: true   // false oculta los controles del componente
});

await viewer.ready; // carga inicial terminada, también cuando se presenta un error
await viewer.setProps({faceShape: 'diamante', showContour: true});
viewer.setProps({opacity: 0.6, showHighlighter: true});
```

Un valor no compatible produce un estado de selección vacía. `normalizeFaceShape` reconoce los valores del contrato actual y alias españoles e ingleses; rechaza las formas no cubiertas en lugar de asignarles otro rostro.

La base y las cuatro máscaras comparten un lienzo fijo de 900 × 1100, proporción 9:11 y origen (0, 0). El orden es base, bronceador, contorno, colorete e iluminador. La base permanece visible y las máscaras ya contienen transparencia parcial, por lo que una capa no oculta por completo las inferiores. La opacidad afecta solo a las máscaras. Las transiciones duran 180 ms y se desactivan con `prefers-reduced-motion`.

Cada interruptor es un botón con `aria-pressed`; se puede usar con teclado. Los productos activos muestran sus instrucciones particulares para esa morfología. También se ofrecen «Mostrar todo», «Ocultar maquillaje», control de intensidad y mensajes de carga o error con reintento.

## Perfil, IA y selección manual

`frontend/public/js/makeup-map.js` conecta el componente con `store.getAnalysis()` y los eventos existentes `stylingu:analysis` y `stylingu:account`.

La forma del análisis elige el mapa inicial. Una selección manual tiene prioridad hasta pulsar «Usar forma del análisis». Solo esta preferencia se guarda mediante el almacén existente, en `stylingu:v2:<cuenta>:makeup-map`; el análisis no se duplica ni se modifica. Si falla el almacenamiento, la selección continúa funcionando durante la sesión. Cambiar de cuenta limpia el estado visual y recupera exclusivamente la preferencia de la cuenta actual.

Una forma no cubierta, como redonda o alargada, muestra el motivo y permite elegir manualmente entre los cuatro mapas. No se ofrece una clasificación equivalente inventada.

Se reutilizan estación, subtono y `makeup.blushHex` para mostrar el contexto cromático y la orientación de colorete del perfil. Los colores de las máscaras identifican zonas de aplicación; los tonos recomendados proceden del análisis y del catálogo. Las máscaras no se tiñen para fingir un tono de producto.

## Recursos y carga

- PNG de ejecución: `frontend/public/assets/makeup-maps/{ovalado,corazon,diamante,cuadrada}/`, cinco por carpeta.
- Editables: `design/makeup-maps/{ovalado,corazon,diamante,cuadrada}.{psd,ora}`.
- Inspección: `design/makeup-maps/inspection.json` y `README.md`.

Se cargan las cinco imágenes del rostro seleccionado, entre 294 y 340 kB por rostro, para que los interruptores respondan sin una descarga adicional. No se descargan los cuatro rostros inicialmente. Los rostros visitados se reutilizan en la memoria del componente y la PWA guarda los PNG bajo demanda. El precaché de instalación excluye los mapas; las rutas privadas de fotos siguen fuera de la caché.

Un cambio de morfología conserva la composición anterior completa mientras carga y sustituye las cinco imágenes conjuntamente. Una generación de carga impide que una respuesta tardía reintroduzca otro rostro. Si falla un recurso o sus dimensiones no coinciden, se oculta la composición incompleta y aparece un botón de reintento.

## Archivos de esta integración

Creados:

- `frontend/public/js/face-makeup-map.js`: componente, normalización y explicaciones.
- `frontend/public/js/makeup-map.js`: integración con perfil y selección manual.
- `frontend/public/makeup-map.css`: visor, controles, estados y adaptación móvil.
- `frontend/public/assets/makeup-maps/`: 20 PNG optimizados sin pérdida.
- `design/makeup-maps/`: ocho editables originales, descripción original y registro de inspección.
- `frontend/tests/makeup-map.js`: pruebas DOM del componente y la integración.
- `tests/makeup-maps.test.mjs`: integridad gráfica y caché PWA.
- Este documento y el README de los editables.

Modificados:

- `frontend/public/index.html`: sección, selector y carga de scripts y estilos.
- `frontend/public/js/store.js`: acceso a la preferencia manual con alcance de cuenta.
- `frontend/package.json`: inclusión de las pruebas del mapa.
- `scripts/build.mjs` y `frontend/public/sw.js`: mapas en caché bajo demanda.
- `tests/browser.mjs`: pruebas A–F y comprobaciones adicionales en Chromium.

La distribución generada se encuentra en `frontend/dist/`, que está excluida de Git.

## Verificación ejecutada

- Inspección del ZIP: cabeceras y cinco capas de cada PSD; dimensiones, desplazamientos y píxeles de OpenRaster; transparencia de cada PNG; composición comparada con las cuatro vistas originales. Sin diferencias de píxeles ni desplazamientos.
- Pruebas DOM del mapa: capas individuales y combinadas; opacidad; todos los rostros; integración con IA; selección manual y cuenta; errores y reintento; dimensiones incorrectas; respuestas tardías; modo no interactivo; almacenamiento no disponible.
- Pruebas de recursos y PWA: máscaras no vacías, dimensiones y alfa; descarga bajo demanda, reutilización y exclusión de fotos privadas.
- Chromium: A, solo colorete en ovalado; B, contorno e iluminador simultáneos y medición de los cinco rectángulos; C, corazón y diamante; D, mostrar y ocultar todo; E, análisis, prioridad manual, restablecimiento y recarga; F, anchuras de 360, 390, 768 y 1440 píxeles. Se compararon capturas para verificar cambios reales de píxeles.
- Auditoría automática axe sobre la sección: cero infracciones WCAG A/AA tras finalizar las animaciones. También se verificó el uso por teclado. Esto no equivale a una certificación de accesibilidad ni a una prueba completa con lectores de pantalla.
- Regresión: pruebas de backend y de UX existentes; compilación y verificación de sintaxis.

Las capturas y resultados locales del navegador se guardan en `.tmp-security/browser/`, excluido de Git. Los tests de navegador usan Postgres efímero, autenticación local de pruebas y un proveedor de IA simulado explícitamente. No se consultó al proveedor real para esta verificación.

Comandos habituales, con Node 22 disponible:

```sh
npm test
npm run check
npm run build
node tests/browser.mjs
```

## Límites y trabajo pendiente

El mapa es ilustrativo y tiene coordenadas fijas. No se proyectan sus PNG sobre fotografías. El probador anterior sigue siendo una simulación de color con alineación manual y no implementa adaptación anatómica de estas máscaras.

Para implementar un modo personalizado será necesario añadir y verificar puntos faciales, correspondencias anatómicas y deformación de las máscaras con escala, rotación y perspectiva. Esa modalidad no se presenta como completada. Los colores son guías cosméticas orientativas. Los cambios están implementados localmente y no se han desplegado.
