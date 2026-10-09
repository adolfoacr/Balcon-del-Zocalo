# Piloto de I+D y trabajo del chef Checo

Sitio: https://adolfoacr.github.io/Balcon-del-Zocalo/?v=3bfc19f

Actualización desde Safari/iPad: https://adolfoacr.github.io/Balcon-del-Zocalo/actualizar.html?v=3bfc19f

Configuración inicial: https://adolfoacr.github.io/Balcon-del-Zocalo/activar.html?v=3bfc19f

Pages publica la rama `gh-pages`, carpeta `/`. Se conserva la autorización de publicación y el checkout original con archivos Swift. La versión `3bfc19fb58fcfb3a66d955877050e8e08756a4e8` destaca con igual jerarquía el área de I+D y el trabajo del chef Checo; incorpora menús propios en el recetario, fichas de investigación y aprovechamiento, galería pública o privada, edición visual de elementos con imágenes y colores, movimientos y restauración, ubicación en Maps y lector integrado. La entrega incluye index.html, activar.html, actualizar.html, los dos SQL y .nojekyll.

Validación local: 108 casos de interfaz recorrieron cuatro configuraciones de Chromium (servidor y HTML autocontenido, escritorio y móvil). Un caso falló por consultar el acomodo antes de que terminara la restauración asíncrona; se corrigió la espera y pasó al repetir los 16 casos relacionados. Pasaron tres comprobaciones de validación, permisos PostgreSQL y errores de registro, más siete dimensiones de pantalla de 320 a 1366 px. También se comprobó el arrastre real de la cruz, los filtros de la galería y la integración del marco del mapa. Las pruebas de interfaz usan respuestas controladas; esto no prueba Safari en un iPad físico ni el envío real de correos.

Estado real de Supabase: cms_site responde HTTP 200 con revisión 0; Authentication permite registros por correo y requiere confirmación. La nueva función public_works todavía responde PGRST202. **El propietario debe ejecutar supabase/upgrade-public-work.sql desde SQL Editor** para habilitar la galería y elección pública; actualizar.html contiene el código y botón para copiar. Las participaciones anteriores siguen privadas. Si el registro informa restricciones de destinatario o envío, el proveedor SMTP se configura directamente en Supabase. No se crearon usuarios reales ni se enviaron correos en las pruebas.

El espacio del libro conserva su estado pendiente. Los proyectos, investigaciones y aprovechamientos reales se incorporarán con información del equipo; los platos actuales conservan su etiqueta de muestra. La app nativa SwiftUI no incorpora estas funciones; esta entrega es el piloto web adaptable. Safari → Compartir → Añadir a pantalla de inicio permite abrirlo como acceso de app sin descargar un HTML.

Verificación del despliegue: la API de GitHub confirmó built para el commit indicado. Los cinco archivos públicos respondieron HTTP 200 y coincidieron byte por byte con las entregas comprobadas. El HTML descargado se recorrió en pantallas de 390 y 820 px con las respuestas reales observadas de cms_site y public_works; sin desbordamientos, archivos auxiliares ni errores JavaScript. Como Chromium administrado no confía en el certificado de la conexión intermediada, los bytes se descargaron con validación TLS y se suministraron al navegador sin desactivar certificados. La API pública aún pendiente se presentó con su aviso de actualización.
