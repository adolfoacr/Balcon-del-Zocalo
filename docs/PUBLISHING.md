# Piloto publicado en GitHub Pages

Sitio: https://adolfoacr.github.io/Balcon-del-Zocalo/?v=1735da5

Guía de activación desde Safari/iPad: https://adolfoacr.github.io/Balcon-del-Zocalo/activar.html

Pages publica la rama `gh-pages`, carpeta `/`. El propietario ya autorizó la publicación del piloto y configuró el repositorio público y Pages. El checkout original y los archivos Swift se preservaron.

La versión `1735da58d8d606d6ecd6a7be672f6659ff7bb86d` incorpora el editor con cuentas, lápices, Agregar en cada sección, nuevos menús, carruseles sin botón play y Comparte tu trabajo. Incluye index.html, activar.html, supabase/setup.sql y .nojekyll. La API de GitHub confirmó built; los tres archivos públicos respondieron HTTP 200 y coincidieron byte por byte con los archivos comprobados localmente.

Pasaron 76 pruebas Playwright de interfaz, dos pruebas PostgreSQL de validación y permisos y la revisión de siete dimensiones de pantalla para las cuatro secciones. Se comprobó también el HTML descargado de Pages en Chromium con pantallas de 390 y 820 px. El navegador administrado no confía en el certificado de la conexión intermediada: los bytes se descargaron con validación TLS y se suministraron al navegador sin desactivar certificados. Las pruebas de interfaz usan respuestas controladas de API; la comprobación del sitio publicado conserva el estado observado de Supabase (tablas aún inexistentes). Esto no equivale a probar Safari en un iPad físico ni el flujo integral del backend real.

**Pendiente de activación por el propietario:** el proyecto Supabase responde PGRST205 para cms_site. La clave pública permite conectar la web, pero no crear tablas o asignar el primer administrador. El propietario debe ejecutar setup.sql, configurar Authentication URLs y correo, registrarse/confirmar su cuenta y ejecutar bootstrap_site_owner en SQL Editor. Después puede asignar la cuenta de Checo desde Usuarios y cuenta. La guía pública contiene el SQL completo, botones de copiar y las instrucciones de cada paso.

El espacio del libro conserva su estado pendiente. Ninguna propuesta se publica automáticamente ni se envía por correo al chef. No hay build de App Store; esta entrega corresponde al piloto web.

Para usarlo en iPad, abre el sitio en Safari. Compartir → Añadir a pantalla de inicio crea un acceso sin descargar el HTML ni instalar un visor.
