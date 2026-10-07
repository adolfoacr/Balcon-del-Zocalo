# Balcón del Zócalo · Piloto de experiencia gastronómica

Noticias, **Recetario** y Nuestro libro, con una interfaz sencilla en español. El proyecto contiene una app nativa SwiftUI para iOS 17+ y una muestra web responsive para revisar y probar la experiencia en este entorno Linux. Comparten el mismo contenido JSON; las vistas son implementaciones independientes.

La versión web publicada está en https://adolfoacr.github.io/Balcon-del-Zocalo/. El diseño se basa en el archivo de referencia de Taco Tasting Room: fondo oscuro, Questrial, acentos dorados, portada fotográfica y secciones compactas. La renovación corresponde al piloto web; las vistas nativas SwiftUI conservan su implementación independiente. Ver `docs/DESIGN-REFERENCE.md` para las fuentes visuales.

## Qué puedes probar

- Carruseles de fotografías e historias con cambio automático cada 3 segundos, flechas y pausa. El avance se detiene mientras el carrusel tiene foco, al pasar el ratón y cuando la página queda oculta. Con movimiento reducido activado, comienza pausado y permite reproducción manual.
- Tarjetas editoriales del piloto y sus detalles. No se presentan como noticias oficiales.
- Dos platos del archivo proporcionado: búsqueda por nombre o ingrediente, categorías, ingredientes y favoritos persistentes.
- Espacio vacío para el libro, sin capítulos ni paginación inventados.
- Importación local de PDF de hasta 30 MB / 1.000 páginas, navegación, cambio de documento y retirada con confirmación. Los PDFs no se envían al servidor.
- Navegación por teclado, diálogos con foco, estados vacíos y mensajes de error. La web tiene diseño móvil y de escritorio; la app usa tipografía dinámica y controles nativos.

## Ejecutar la muestra web

Para abrir la muestra desde un visor de archivos, usa **`index.html` en la raíz del repositorio**. Este archivo incluye los estilos, la tipografía, las fotografías, las ilustraciones, el contenido y el código, incluido el lector PDF y sus recursos. No requiere un servidor ni descargar archivos adicionales. `web/index.html` es la entrada de desarrollo y sí depende del servidor; abrir ese archivo suelto produce una página sin diseño.

Si el visor no permite ejecutar scripts, el HTML conserva una vista de lectura con el diseño y las fichas de muestra. Búsqueda, favoritos e importación PDF necesitan ejecución de JavaScript. Los navegadores o visores que limitan el almacenamiento pueden conservar los favoritos y el PDF solo durante la visita.

Para regenerar el archivo tras cambiar el contenido o las vistas:

```bash
npm run build
```

El HTML generado pesa aproximadamente 6,3 MB porque integra también el lector y los recursos PDF. Se usa el build oficial de compatibilidad de PDF.js para mejorar soporte en navegadores anteriores. La comprobación automatizada usa Chromium con tamaños móvil/escritorio; no sustituye una prueba en Safari real.

Requiere Node.js 24+ y npm. Desde la raíz del repositorio:

```bash
npm ci --cache /tmp/balcon-npm-cache --no-audit --no-fund
npm run dev
```

El servidor usa el puerto 4173 y escucha en loopback por defecto. `HOST` y `PORT` permiten adaptar el servidor a tu entorno de desarrollo. No hay backend, cuentas, pagos ni dependencia de servicios externos durante el uso del piloto.

```bash
npm run check
npm test
npm run check:responsive
```

Las pruebas usan Chromium instalado en `/usr/bin/chromium`; en otra máquina puedes indicar `CHROMIUM_PATH`. La suite tiene 76 pruebas: 36 recorridos del piloto (móvil y escritorio, con servidor y con HTML autocontenido), 16 del carrusel, 20 de cuentas, editor y propuestas, y 4 de apertura sin archivos auxiliares y vista sin scripts. Incluyen búsqueda, favoritos, publicación explícita de borradores, nuevos menús y carruseles, seguimiento de propuestas y decisiones de Checo. El lector comprueba renderizado real de dos páginas PDF, persistencia, reemplazos válidos e inválidos, retirada, foco por teclado y selección mientras se restaura la biblioteca. Los PDFs son sintéticos, no el libro del restaurante. `npm run test:security` ejecuta PostgreSQL para verificar permisos y privacidad; las pruebas de interfaz utilizan una API controlada de pruebas.

El navegador administrado bloquea navegación `file://`. Para probar el HTML entregado sin modificar esa política, las pruebas suministran los bytes del documento directamente y bloquean todas las solicitudes de recursos adicionales. Así comprueban que no depende de CSS, JavaScript, datos o recursos PDF externos.

## App iOS

La declaración original de SwiftPM como ejecutable no genera por sí sola una aplicación iOS instalable. `project.yml` define un target de aplicación con SwiftUI, PDFKit y el JSON como recurso. `Package.swift` se usa exclusivamente para probar los modelos compartidos.

En macOS, con Xcode 16+ y XcodeGen instalado:

```bash
xcodegen generate
open BalconZocaloApp.xcodeproj
```

Selecciona el esquema `BalconZocaloApp` y un simulador iOS 17+. Para las tres pruebas de los modelos:

```bash
swift test
```

**La app iOS, la generación con XcodeGen y las pruebas Swift no se ejecutaron en el entorno Linux actual:** no dispone de Swift ni Xcode. La validación ejecutada corresponde al piloto web y al contenido JSON. La ejecución en un iPhone físico requiere configurar firma en Xcode. No hay build de App Store ni publicación.

## Contenido y fuentes

`Sources/Resources/content.json` es la fuente compartida de datos. Los identificadores son estables para conservar favoritos; no se generan UUID nuevos al abrir la app. `verification` distingue `demo`, `pending` y `verified`; `source` registra la procedencia. Usa fechas absolutas `YYYY-MM-DD` para noticias verificadas.

Los dos platos provienen del archivo Swift del propietario. Sus ingredientes siguen pendientes de cotejo. No se inventaron precios, dificultad, porciones, tiempos ni pasos. Las clasificaciones sirven para demostrar filtros y también deben revisarse con el restaurante. Las ilustraciones son decorativas; no representan fotografías de los platos.

El sitio oficial se consultó para incorporar el logotipo y dos fotografías en la renovación visual. Eso no verifica los ingredientes ni la preparación de las fichas. Las noticias de temporada y premios del ejemplo original se retiraron por carecer de fuente. El siguiente paso editorial es contrastar las fichas con las fuentes que el propietario confirme y añadir noticias oficiales fechadas.

## Incorporar el libro después

No necesitas entregar el libro para probar el piloto. En Nuestro libro, el botón **Cargar un PDF** abre el selector y el lector muestra páginas reales del documento elegido. Se guarda en IndexedDB en la web y en Application Support en iOS. Cada plataforma conserva su propia copia; no hay sincronización entre dispositivos.

Cuando el propietario entregue el libro, se integrarán el PDF autorizado, la portada real y su índice. La estructura `book.chapters` está reservada, pero el piloto todavía no enlaza capítulos a páginas. No se deduce un índice ni se rellena con títulos ficticios. Si se entrega texto o imágenes en vez de un PDF, habrá que preparar el formato de lectura correspondiente.

## Estado de las fases

1. **Fuentes y Noticias:** inventario y trazabilidad preparados; dos guías editoriales de muestra. Verificación del contenido gastronómico pendiente.
2. **Recetario:** fichas de muestra, búsqueda, filtros, detalle y favoritos implementados. Recetas completas pendientes del contenido real.
3. **Libro e integración:** espacio e importación PDF implementados. Piloto web validado; libro pendiente del propietario y versión iOS pendiente de validación en Xcode.

Los futuros agentes deben usar el checkout existente: cada tarea en la nube ya está aislada. No creen un worktree salvo petición expresa del usuario.

## Editor y colaboración con Checo

El piloto web incorpora cuentas, editor con lápices, un botón Agregar en cada sección y paneles de administración. Comparte tu trabajo admite propuestas privadas con seguimiento y selección exclusiva de la cuenta asignada a Checo. La configuración está documentada en [docs/ADMIN-SUPABASE.md](docs/ADMIN-SUPABASE.md). El servicio necesita ejecutar [supabase/setup.sql](supabase/setup.sql) desde el SQL Editor del proyecto y asignar el primer propietario después de registrarse y confirmar su correo.

`npm run test:security` ejecuta las pruebas de permisos PostgreSQL. El esquema de Supabase y la clave pública están preparados; las pruebas de interfaz usan una API controlada de pruebas, no cuentas reales.
