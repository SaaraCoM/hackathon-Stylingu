# Hallazgos verificados del escaneo histórico

El primer escaneo con Gitleaks 8.30.1, reglas predeterminadas y valores redactados,
produjo 43 coincidencias de `generic-api-key`:

- 38: campo JSON `fileKey` de 22 caracteres en `docs/evidencia/figma/assets.json`.
  Es el identificador de un documento de Figma; no autentica ni concede permisos.
- 5: asignación del identificador `utf8ValidatedKeys` a la propiedad `validation.utf8` en antiguos bundles
  bajo `worker/.wrangler/tmp/dev-*/index.js`. Es una referencia a una propiedad
  de una biblioteca, sin ningún valor de credencial.

`.gitleaks.toml` conserva todas las reglas predeterminadas. Sus excepciones exigen
simultáneamente la ruta y el patrón exacto de línea descritos. No se ignoran
archivos completos, proveedores ni formatos de claves. Los informes originales
redactados son artefactos locales excluidos de Git; no se reproducen posibles
valores en esta documentación.
