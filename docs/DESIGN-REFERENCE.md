# Referencia visual del piloto web

El propietario proporcionó `tacotastingroom.com.webarchive` y pidió basar el diseño gráfico, acomodo y UX/UI del piloto en esa página. Se extrajeron los recursos y se revisaron vistas de escritorio y móvil del archivo. Se tomó como referencia su fondo carbón, texto claro, tipografía Questrial, acentos dorados, logotipo destacado, portada fotográfica y llamadas a la acción sencillas.

La adaptación conserva Noticias, Recetario y Nuestro libro siempre visibles. La altura de la portada está acotada; móvil usa tarjetas compactas y el Recetario conserva dos columnas en tabletas. No se incorporaron los scripts de analítica, widgets de reservas, textos, marcas, premios ni fotografías de Taco Tasting Room.

## Recursos de Balcón del Zócalo

Descargados del sitio oficial el 7 de octubre de 2026:

- Logotipo: https://balcondelzocalo.com/wp-content/uploads/2024/03/Logo-BZ-White.png
- Mesa del chef, fotografía de portada: https://balcondelzocalo.com/wp-content/uploads/2024/03/bg-Mesa-del-chef-.jpg
- Fotografía del chef y la ciudad, tarjeta de la experiencia: https://balcondelzocalo.com/wp-content/uploads/2024/04/Banner-Chef.jpg
- Página de procedencia de las fotografías: https://balcondelzocalo.com/nuestro-chef/

Las fotografías son ambientación; no se atribuyen a las dos recetas de muestra. Sus ingredientes y preparación siguen pendientes de verificación. El libro continúa vacío.

## Tipografía y empaquetado

La fuente Questrial latina procede del archivo proporcionado y se conserva con su licencia SIL Open Font License, descargada de https://raw.githubusercontent.com/google/fonts/main/ofl/questrial/OFL.txt. La licencia está en `web/assets/Questrial-OFL.txt` y se incluye en el HTML generado junto con los avisos de PDF.js.

`web/assets` conserva los originales optimizados y el logotipo. `web/images.js` contiene las dos fotografías como datos embebidos para el marcado compartido. Si se sustituyen las fotografías, actualizar tanto los archivos como ese módulo y ejecutar `npm run build`. El generador integra también el logotipo y la fuente: no hay solicitudes externas de imágenes o fuentes al abrir el piloto.

La adaptación visual se realizó en la muestra web publicada. No se ha renovado ni compilado la implementación SwiftUI en esta fase.

## Comprobaciones de la renovación

La suite funcional completó 39 de 40 casos en la primera ejecución. El caso restante excedió el límite de cinco segundos al renderizar el primer PDF; su repetición aislada pasó dos veces. No se cambió el límite para ocultar ese fallo. Se comprobó además el HTML final en siete tamaños, las tres secciones, controles de navegación de al menos 44 px, tarjetas compactas en móvil, proporción de la portada y ausencia de solicitudes externas. Ver `npm run check:responsive`. Son pantallas simuladas en Chromium, no un iPad físico.

## Carruseles solicitados por el propietario

La portada alterna las dos fotografías existentes cada 3.000 ms. La sección Para descubrir presenta sus dos historias en un segundo carrusel, con la fotografía correspondiente a cada tarjeta. Ambos tienen flechas, contador y pausa/reanudación. Conservan un marco de altura acotada para evitar saltos al cambiar de imagen.

El movimiento se detiene con foco de teclado, ratón sobre el carrusel, página oculta o un diálogo abierto. La preferencia de movimiento reducido inicia la reproducción en pausa, y el usuario puede reanudarla. Los temporizadores y eventos se eliminan al salir de Noticias. Sin JavaScript se muestra la primera imagen e historia y se ocultan los controles.

Las 16 pruebas específicas del carrusel pasaron en tamaños móvil/escritorio, con servidor y con el HTML autocontenido. Comprueban el límite exacto de tres segundos mediante reloj controlado, vuelta al inicio, controles independientes, pausa, reinicio al cambiar de sección y movimiento reducido.
