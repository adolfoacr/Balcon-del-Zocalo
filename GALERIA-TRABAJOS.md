# Galería de trabajos

## Uso

En **Comparte tu trabajo → Investigación y desarrollo** aparecen las propuestas públicas y cuatro proyectos de demostración:

- Crema de tallos de brócoli: comparación de tiempos de cocción.
- Bebida de semillas de melón: desarrollo de tres intensidades de tostado.
- Condimento de cáscara de naranja: comparación del albedo y rendimiento.
- Lámina crujiente de pan del día anterior: pruebas de hidratación y textura.

Cada ejemplo tiene propósito, método, pruebas, resultados ilustrativos y siguientes pasos. La etiqueta **Demostración** y la indicación de autor ficticio distinguen los ejemplos de las participaciones reales. No se crearon cuentas ni se enviaron notificaciones de propuestas ficticias. Los ejemplos no afirman que sus experimentos hayan sido ejecutados.

Pulsa **Leer proyecto completo** para desplegar la ficha. Los filtros separan investigaciones y desarrollos.

## Eliminar de la galería

Al iniciar sesión como administrador aparece **Eliminar de la galería** en cada tarjeta y en la lista de propuestas del panel. No hace falta ser la cuenta del chef. La acción pide confirmar el trabajo concreto; cancelar conserva el contenido.

La retirada se publica inmediatamente para todos los visitantes. No publica los demás cambios pendientes del borrador. Se conserva después de recargar y los ejemplos eliminados no se vuelven a insertar automáticamente. Los visitantes y las cuentas sin permiso de administración no tienen esta acción.

## Alcance de la eliminación y base de datos

La instalación original permite consultar propuestas, enviarlas y evaluarlas, pero no incluye una función para borrarlas. La aplicación funciona con esa instalación: registra la retirada en `workPage.removedWorkIds` mediante el RPC `publish_site`, que ya exige permisos de administrador. Filtra esos registros de la galería y de las listas de propuestas que presenta la aplicación. **Esta retirada conserva el registro y sus archivos en Supabase**; no equivale a borrar los datos de la base ni a cambiar el acceso directo al RPC público original.

Se incluye [supabase/upgrade-work-delete.sql](supabase/upgrade-work-delete.sql) para habilitar el borrado definitivo del registro. Debe ejecutarse en el SQL Editor del proyecto por una persona con acceso a la base. Esta entrega no lo ejecuta contra producción. Una vez instalado, la aplicación utiliza automáticamente `delete_work` para las propuestas reales. La función comprueba `is_site_admin()` en el servidor, también permite administradores sin rol de chef y no concede DELETE general a la tabla. Los archivos permanecen para una política de limpieza separada.

Si falta únicamente esa función (`PGRST202`), la aplicación utiliza la retirada de galería. Un error de permisos, conexión o publicación muestra el fallo y conserva la tarjeta; no se presenta como una eliminación exitosa.

## Validación

`tests/browser-audit.cjs` ejecuta 37 comprobaciones con el HTML real, Chromium y servicios simulados. Incluye lectura de los cuatro ejemplos, filtros, móvil, texto de participantes escapado, administrador sin rol de chef, cancelación, persistencia para visitantes, conservación de borradores, fallos de publicación, borrado cuando existe el RPC y rechazo de permisos. No escribe propuestas ni elimina registros en producción.
