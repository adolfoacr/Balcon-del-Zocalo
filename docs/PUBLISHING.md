# Piloto de I+D y trabajo del chef Checo

Sitio: https://adolfoacr.github.io/Balcon-del-Zocalo/?v=44c7136

Actualización desde Safari/iPad: https://adolfoacr.github.io/Balcon-del-Zocalo/actualizar.html?v=44c7136

Configuración inicial: https://adolfoacr.github.io/Balcon-del-Zocalo/activar.html?v=44c7136

Pages publica la rama `gh-pages`, carpeta `/`. Commit de esta entrega: `44c71365a1507f1e0aa3a0d91c9fbabacdd6f1b1`. Se conservan el checkout original y los archivos Swift. La entrega incluye index.html autocontenido, activar.html, actualizar.html, los dos SQL y .nojekyll.

La edición une los lápices y los paneles con los datos visibles. La cabecera admite texto, imagen o ambos; las imágenes tienen controles de ancho, alto, encuadre y ajuste. Cambiar la imagen de un carrusel reemplaza la diapositiva seleccionada. La carga muestra vista previa y estado, impide aplicar durante la subida y conserva el error dentro del editor.

Los módulos, tarjetas de I+D y chef Checo, libro, participación y pie tienen controles de edición y eliminación. El recetario permite eliminar platillos y colecciones. Eliminar una sección quita su navegación, contenido y accesos relacionados. Eliminar un módulo retira su marco y acomoda el contenido restante. Los movimientos libres admiten zonas y coordenadas por tamaño de pantalla, hacen espacio en el flujo y separan los elementos que coinciden.

«Restaurar acomodo original» restaura TODO el borrador a la última versión publicada: textos, imágenes, colores, secciones y posiciones. «Restaurar diseño inicial» recupera la muestra inicial mediante confirmación. La restauración no modifica cuentas ni participaciones. Aplicar cambia inmediatamente el borrador; Publicar guarda la versión que ven los visitantes. Si falla el almacenamiento local, se indica que el borrador dura esa visita y debe exportarse.

Validación: la batería completa ejecutó 235 casos, con 228 aprobados inicialmente. Los siete fallos correspondían a sincronización de navegación, reloj simulado o expectativa de publicar un borrador idéntico; se corrigieron las pruebas. Luego pasaron 18 comprobaciones dirigidas, que incluyen los casos fallidos y las regresiones de carrusel, en escritorio, móvil, tableta y HTML autocontenido. Pasaron también cinco pruebas de validación y permisos, las comprobaciones de sintaxis y construcción, y siete tamaños de pantalla entre 320 y 1366 px. Se probaron pulsaciones táctiles y movimientos con Chromium. Las sesiones de administrador, subidas y publicaciones de pruebas son simuladas; no se crean cuentas ni se altera contenido real. Estas pruebas no equivalen a probar Safari en un iPad físico.

Supabase está conectado mediante su clave pública y las políticas existentes. El registro requiere confirmación por correo; las restricciones del proveedor de envío se configuran en Supabase. La recuperación admite destino explícito, validación de enlaces y sesión, limpieza de credenciales de la dirección y orientación para enlaces caducados. Se conservan las guías SQL para proyectos nuevos.

El libro permanece reservado para el PDF que proporcionará el usuario. Los datos gastronómicos de muestra conservan su etiqueta. Esta entrega es el piloto web adaptable; Safari → Compartir → Añadir a pantalla de inicio permite abrirlo como acceso de app.


La corrección 697c9f1 reconstruye la cabecera antes de aplicar los borradores y devuelve los elementos movidos a sus padres originales antes de renderizar. Esto evita «Cannot set properties of null (setting innerHTML)» cuando falta una parte editable de la cabecera. Los filtros del recetario y de la galería toleran que el administrador elimine su contenedor. Las imágenes incorporan cuatro anclajes de escalado con captura de puntero, cancelación, teclado, persistencia y entrada táctil real. El control Centrar elemento centra el contenido dentro de su zona; las posiciones libres también se centran.

Para esta corrección pasaron los 15 casos nuevos en las cinco configuraciones de pantalla/entrega (los dos casos móviles de eliminación se ajustaron para producir en escritorio el borrador cuya cabecera está oculta en móvil). También pasaron seis regresiones de todos los lápices, movimiento y restauración, y dos comprobaciones adicionales de traslado por orden entre regiones. Las cinco pruebas de permisos, sintaxis, construcción y siete tamaños de pantalla pasaron. No se tocaron cuentas ni contenidos de producción.


La entrega final 792c505 activa Centrar y Escalar directamente al terminar el toque, igual que los lápices, sin depender del clic que sintetiza el navegador. Pasaron cinco casos adicionales con fotografía real incrustada, arrastre mediante ratón o eventos táctiles, centrado, publicación simulada y recarga. La compilación final y sus comprobaciones npm terminaron correctamente.


La entrega 44c7136 añade únicamente el candado de posición junto a cada cruz. El bloqueo captura la ubicación, protege los controles de movimiento, centrado y escala del elemento y sus descendientes, y da prioridad a los elementos bloqueados al resolver colisiones. El estado persiste en el borrador y la publicación. El lápiz sigue disponible. Pasaron diez casos dirigidos de bloqueo, movimiento, restauración, publicación simulada y recarga en las cinco configuraciones de escritorio, móvil, tableta y HTML autocontenido; también cinco pruebas de validación y permisos, sintaxis y compilación.
