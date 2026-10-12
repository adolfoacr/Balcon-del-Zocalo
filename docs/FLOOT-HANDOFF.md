# Balcón del Zócalo — conversión con Floot

## Estado de esta entrega

El proyecto está preparado para transferirlo. La integración de Floot no expuso herramientas MCP en esta conversación, así que todavía no se creó ni se desplegó una aplicación en Floot. Este documento especifica la conversión solicitada; no confirma capacidades de importación o de publicación nativa de esa plataforma.

La implementación funcional de referencia está en la rama **web-admin-research**, versión `d4df110cf18056a4c6c0710fa891999858addb4c`. La rama main no es la referencia para esta migración.

- Código: https://github.com/adolfoacr/Balcon-del-Zocalo/tree/web-admin-research
- Piloto publicado: https://adolfoacr.github.io/Balcon-del-Zocalo/?v=5639e13
- Fuente modular: `web/`.
- Documento de datos inicial: `Sources/Resources/content.json`.
- Entrega autocontenida de referencia: `index.html`.
- Backend existente y permisos: `web/service.js`, `supabase/` y `docs/ADMIN-SUPABASE.md`.
- Base SwiftUI anterior: `Sources/`, `Package.swift` y `project.yml`. Tiene implementación independiente y todavía no comparte todas las funciones del piloto web.

## Instrucción para Floot

Convierte el proyecto existente Balcón del Zócalo en una aplicación centrada en móvil, tableta e iPad que también funcione en escritorio y web. Usa la implementación funcional y los recursos del paquete o de la rama web-admin-research como base. Primero determina qué modalidad admite Floot: app web instalable/PWA o aplicación nativa. Explica la modalidad entregada; no presentes una PWA como un binario publicado en App Store. Si admite importación de código, importa estos módulos; si requiere reconstruir la interfaz, conserva los contratos de datos, permisos y comportamientos de la implementación actual.

El propósito principal es el área de investigación y desarrollo de Balcón del Zócalo, con igual importancia para las investigaciones, desarrollos y aprovechamientos del chef Checo. Conserva español, fondo oscuro, tipografía Questrial, acentos dorados, fotografías del restaurante y una experiencia sencilla y agradable. La disposición debe adaptarse a pantallas pequeñas, orientación horizontal, iPad y escritorio sin desbordamientos ni elementos estirados.

Conserva estas funciones:

1. **Noticias e inicio:** título principal editable, noticias, banners, accesos directos y carruseles que avanzan cada tres segundos, con flechas y sin botón de play. Mantén pausa por foco y preferencias de movimiento reducido.
2. **Recetario:** búsqueda, categorías, favoritos persistentes, ingredientes, preparación, investigación, técnica, aprovechamiento y resultados. Los administradores pueden agregar y editar platillos y crear colecciones/menús del recetario. El nombre de la sección sigue siendo Recetario.
3. **Nuestro libro:** espacio preparado para recibir posteriormente el libro del propietario. Conserva el lector PDF integrado con el diseño, navegación real de páginas, ajuste de tamaño y lectura inmersiva. No inventes su contenido ni uses un libro de muestra como si fuera el del restaurante. La carga local existente se conserva en el navegador; distingue esa copia del PDF publicado por un administrador.
4. **Comparte tu trabajo:** envío de investigaciones y desarrollos como propuestas privadas o públicas. Solo el autor y los roles autorizados pueden consultar una propuesta privada; la galería pública solo muestra campos públicos de propuestas públicas. El chef Checo puede seleccionar investigaciones para colaboración desde su rol chef; ser administrador general no concede automáticamente esa facultad. Conserva el seguimiento y las respuestas privadas.
5. **Cuenta:** registro, confirmación de correo, inicio y cierre de sesión, recuperación por correo y cambio de contraseña con confirmación. Al cambiar de dominio, añade los destinos correspondientes en Supabase y verifica los enlaces de recuperación y confirmación.
6. **Administración:** paneles organizados y un botón Agregar en cada sección. Permite editar textos, títulos, imágenes, banners, carruseles, botones, enlaces, iconos, accesos directos, colecciones y secciones. Conserva la edición con lápiz, la selección de elementos y el movimiento con cruz o coordenadas a espacios vacíos. Guarda posiciones por móvil, tableta y escritorio, y permite devolver un elemento o todo el acomodo a su origen. Mantén los textos compartidos entre el editor visual y sus paneles.
7. **Diseño editable:** paleta general y colores por elemento mediante selector visual y código hexadecimal. Las imágenes añadidas a elementos se conservan al cambiar sus textos desde otro panel.
8. **Guardado:** aplicar al borrador muestra el cambio inmediatamente; publicar lo comparte con los visitantes. Conserva borradores por cuenta y dispositivo y normaliza los formatos anteriores. Gestiona conflictos de revisión para evitar sobrescribir cambios de otro administrador.
9. **Ubicación y movimiento:** Google Maps al final de la app, transiciones suaves, controles de al menos 44 px y respeto a movimiento reducido. La edición táctil no debe generar clics sobre el diálogo que acaba de abrirse ni colocar herramientas encima de Agregar.

Reutiliza el proyecto Supabase existente: `https://pqmxurrqpvubxccnsywu.supabase.co`. La configuración pública del cliente está en `web/service-config.json`. Conserva cuentas, tablas, funciones, archivos y políticas RLS del proyecto. Las claves administrativas pertenecen exclusivamente al servidor; la app utiliza únicamente la clave pública. Los SQL incluidos documentan el esquema y sus permisos; no son una orden de reinstalarlo ni de sustituir los datos existentes.

Verifica antes de entregar: edición con pulsación y arrastre en móvil/tableta, edición en escritorio, aplicación inmediata de títulos e imágenes, publicación y recarga, alta de platillos y colecciones, registro y recuperación de cuenta, privacidad de propuestas, permisos del chef, restauración del acomodo y ausencia de desbordamientos. Prueba Safari en iPhone/iPad si Floot ofrece esa posibilidad e indica qué dispositivos o motores se comprobaron.

Devuelve el enlace de la app creada, su proyecto en Floot, la modalidad de instalación y cualquier configuración pendiente que requiera al propietario. Hasta disponer de ese resultado, la conversión sigue pendiente.

## Ejecutar y comprobar el código incluido

Requiere Node.js 24 o posterior:

```sh
npm ci
npm run check
npm run build
npm run dev
```

El servidor de desarrollo escucha en `127.0.0.1:4173`; el entorno de destino puede configurar HOST y PORT. `index.html` se genera desde el código modular, no es la única fuente editable. No se incluyen node_modules, sesiones de usuario, borradores privados ni PDFs personales en el paquete.

Las pruebas de interfaz están en `web-tests/`; las de permisos y validación, en `cms-tests/`. Chromium y la configuración de Playwright deben adaptarse al entorno de Floot si allí se ejecutan. Las verificaciones previas están registradas en `docs/PUBLISHING.md`; no constituyen una prueba de una aplicación nueva en Floot.
