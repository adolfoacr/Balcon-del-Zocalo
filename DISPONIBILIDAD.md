# Disponibilidad durante la promoción

El enlace público utiliza GitHub Pages. No es un servidor de desarrollo ni un enlace de vista previa: no depende de esta conversación, de una computadora encendida ni de una sesión de Codex abierta.

Las cuentas, las propuestas y el contenido publicado utilizan Supabase. Las imágenes nuevas de demostración se sirven directamente desde GitHub Pages; no dependen de enlaces temporales de generación de imágenes.

## Comprobación periódica

`.github/workflows/service-health.yml` programa una comprobación cada quince minutos, además de la validación al actualizar el script. Consulta:

- Página pública por HTTPS y JavaScript de la galería.
- Lectura de la base de datos y de las propuestas públicas.
- Salud de autenticación y acceso desde el origen de la página mediante CORS.
- Registro y acceso por correo habilitados.

Hace hasta tres intentos por consulta y conserva los informes durante catorce días en GitHub Actions. Las comprobaciones programadas dependen del programador de GitHub y pueden retrasarse. No crean cuentas, envían correos ni modifican datos. Las notificaciones de fallos dependen de las preferencias de GitHub del propietario.

Al actualizar el control también se abre la aplicación publicada en Chromium y se comprueban la galería, sus imágenes, las pantallas de inicio de sesión/registro/recuperación y la ausencia de errores de JavaScript. No introduce credenciales ni envía formularios reales.

## Cuentas y límites de la verificación

Las pruebas de navegador verifican registro con confirmación, enlaces de confirmación y recuperación, contraseñas coincidentes, acceso de usuario y administrador, persistencia de sesión y cierre de sesión. Utilizan servicios simulados; no prueban contraseñas de personas reales ni la llegada de mensajes a Gmail.

La revisión pública real confirmó que el sitio, Supabase y la autenticación responden y que el registro y el acceso por correo están habilitados. El servicio requiere confirmar el correo. El envío, la entrega y la configuración SMTP requieren una comprobación separada con acceso al proyecto y al buzón de prueba.

## Suspensión del proyecto

El propietario confirmó que utiliza el plan gratuito. Las lecturas periódicas mantienen actividad y permiten detectar un fallo. No cambian el plan ni las condiciones del proveedor. Supabase indica que los proyectos gratuitos se pausan tras una semana de inactividad. Un plan sin suspensión por inactividad es la opción apropiada para eliminar ese motivo de pausa durante una promoción. [Condiciones oficiales](https://supabase.com/pricing).

Para registro público hay que comprobar además el envío de correo. El SMTP predeterminado de Supabase está limitado a direcciones del equipo y actualmente a dos mensajes por hora. No se ha podido consultar si este proyecto tiene SMTP personalizado. [Documentación oficial de correo](https://supabase.com/docs/guides/auth/auth-smtp).

No se modificaron las cuentas existentes, sus contraseñas ni su configuración de correo. No se hicieron cargos ni cambios de plan.
