# Evidencia del flujo personal

## Estado actual: 30 de octubre de 2026

El flujo se ejecutó contra Express + Postgres local y el proveedor **Meta AI real**
configurado en `backend/.env`. Ya no se usa MongoDB ni el Worker retirado.

### El agente analiza y declara la procedencia

`docs/evidencia/flujo-personal/http-3000.json` contiene el resultado persistido de
`POST /api/auth/personal/analyze`:

- `source: "meta"`, `model: "muse-spark-1.3"` y
  `protocol: "arquitectura_y_protocolo_de_ia_app_de_belleza"`.
- `colorimetry.harmony: 0`: el contrato no inventa una puntuación de armonía.
- `analyzedAt` real y `disclaimer` cosmético.
- La paleta contiene `primaryHex` y no tiene duplicados.
- El propio modelo marcó incertidumbre: `face y body son la misma imagen`,
  `encuadre medio sin cuerpo completo` y `luz cálida lateral que altera
  percepción de subtono`. No rellenó una lectura de cuerpo que no podía ver.

La prueba usó `frontend/public/assets/editorial/hero-portrait.jpg` como cara y
cuerpo. Es una imagen editorial generada para el proyecto, no una foto personal.

### El agente rechaza una imagen que no permite analizar

Con un PNG sintético plano de 32×32, el proveedor real respondió:

```json
{
  "code": "INVALID_INPUT",
  "error": "Resolución extremadamente baja en cara y cuerpo, no permite observar subtono, rasgos ni prendas con fiabilidad."
}
```

No devolvió un análisis inventado ni guardó un resultado. El caso está cubierto
por `tests/http-flow.mjs`: si el proveedor rechaza las fotos, el flujo falla en
vez de aceptar datos de ejemplo.

### Catálogo sin invenciones

`GET /api/products` devolvió un catálogo vacío en la base local. La UI muestra
`Catálogo vacío. Es necesario cargar referencias verificadas.` No se rellenó con
marcas ni tonos de ejemplo. Cuando haya variantes, `tests/http-flow.mjs` exige
`source` HTTPS, `colorVerified: false` y `hex: ""` mientras el color no esté
verificado.

### Comprobaciones ejecutadas

- `npm.cmd test --prefix frontend`: 24/24.
- `npm.cmd test --prefix backend`: 16/16, incluida la validación de edad.
- `npm.cmd run check`: 48 archivos.
- `npm.cmd run build`: `frontend/dist` generado.
- `node tests/browser.mjs`: 15/15, incluida la procedencia visible.
- `node tests/http-flow.mjs http://127.0.0.1:3000`: PASS completo con registro,
  sesión, fotos privadas, análisis real, PUT, logout/login y aislamiento entre
  cuentas.

## Repetir el flujo

```powershell
# Terminal 1: backend/.env con Postgres y META_AI_API_KEY
npm.cmd start --prefix backend

# Terminal 2, desde la raíz
$env:FLOW_FACE='frontend/public/assets/editorial/hero-portrait.jpg'
$env:FLOW_BODY='frontend/public/assets/editorial/hero-portrait.jpg'
node tests/http-flow.mjs http://127.0.0.1:3000
```

Sin `FLOW_FACE`/`FLOW_BODY` el test usa un PNG sintético de 32×32. Con el
proveedor real ese PNG debe ser rechazado; el test está pensado para ejecutarse
con las imágenes editoriales cuando se quiere verificar un análisis completo.

## Histórico

Las secciones anteriores de este documento describían el prototipo con MongoDB,
el Worker de Cloudflare y un análisis mock de 1 píxel. Ese runtime fue retirado
al migrar a Postgres y al conectar Meta AI. La evidencia antigua se conserva en
`atlas.json`, `worker-*.yml` y `http-8787.json` solo como registro histórico; no
representa el estado actual.
