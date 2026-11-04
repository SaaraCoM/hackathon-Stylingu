# Fuentes de los mapas de maquillaje

Se conservan los cuatro PSD y los cuatro OpenRaster originales del ZIP aportado por el usuario. No se sirven desde la aplicación. `LEEME-original.txt` conserva la descripción del paquete; `inspection.json` registra la inspección técnica y la huella SHA-256 del ZIP.

Cada archivo contiene cinco capas de 900 × 1100 píxeles con origen (0, 0): `Rostro_Base`, `bronceador`, `contorno`, `colorete` e `iluminador`. Los PNG de la aplicación están en `frontend/public/assets/makeup-maps/<forma>/`, con los nombres `base`, `bronzer`, `contour`, `blush` y `highlighter`.

Se inspeccionaron las cabeceras, nombres y límites de las capas PSD, la pila y los desplazamientos de OpenRaster y los canales alfa de los PNG. Los 20 PNG coinciden píxel a píxel con sus capas OpenRaster; las cuatro composiciones coinciden con las vistas de referencia del ZIP. Los PNG publicados se recomprimieron sin cambiar píxeles, dimensiones ni transparencia.

Al actualizar los dibujos, exportar cada capa con el lienzo completo de 900 × 1100 y conservar las zonas transparentes. Recortar una capa desplazaría el mapa; el componente rechaza imágenes con dimensiones distintas.

La integración y sus pruebas se describen en `docs/mapas-maquillaje.md`.
