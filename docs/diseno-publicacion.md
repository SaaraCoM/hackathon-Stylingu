# Diseño previo a desarrollo

Concepto: Atelier personal. Conservar el sistema editorial de DESIGN.md: fondo #FFF8F6, texto #211A17, primario #865044, superficies blancas y arena, encabezados Georgia/Playfair y cuerpo sans del sistema. La preview generada con imagegen está en evidencia/publicacion/preview.png: es ilustrativa, no evidencia funcional ni datos de catálogo. Prompt: tres pantallas móviles, perfil editable, calendario con prendas propias y escáner con confirmación de tono; sistema editorial cálido, navegación estable y controles accesibles. En la implementación el escáner selecciona Compras (la preview tiene una selección de tab incorrecta).

Componentes: formularios con etiquetas persistentes y errores próximos al campo; listas de inventario; calendario por fecha; tutorial con casillas y progreso; diálogo de cámara con captura, subida y búsqueda manual, y tarjeta de motivos. Nada de puntuaciones biométricas ni promesas de prueba facial real.

Estados: pendiente/sin análisis; carga con aria-live y acciones deshabilitadas; resultado anterior marcado obsoleto; error con reintento; guardado confirmado por servidor; catálogo vacío/desconocido y variante ambigua. Un mock siempre indica simulación; una caída real nunca activa mock.

Responsive: una columna en móvil, dos en escritorio a partir de 900px, controles de 44px, campos de 16px y anchura flexible, diálogo limitado al viewport y scroll propio. Navegación y privacidad conservan posición. Cámara se detiene al cerrar o salir de la página; sin vídeo continuo hacia API.

Accesibilidad prevista: foco visible, diálogo nativo, restauración de foco, teclado y Escape, regiones de estado, nombres accesibles, leyendas de swatches con texto, ausencia de dependencia exclusiva del color. Comprobar contraste de tokens por cálculo y navegación real tras desarrollo. Fotos e ilustraciones no sustituyen a los nombres de prendas/productos.
