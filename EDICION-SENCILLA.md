# Edición sencilla

La edición muestra primero lo necesario para la tarea. Los ajustes especiales quedan cerrados en **Opciones avanzadas**, conservando los datos existentes.

## Agregar un platillo

En **Recetario → Agregar platillo**, completa:

1. Nombre del platillo.
2. Foto: selecciona el archivo. Si ya está en otra web, abre «Usar un enlace de imagen».
3. Descripción.
4. Ingredientes: uno por renglón.
5. Elaboración: un paso por renglón.
6. Número de porciones.

Pulsa **Guardar cambios** para conservar el borrador. Usa **Vista previa** para revisarlo y **Publicar** cuando esté listo. La ficha pública muestra estos datos y la fotografía.

## Cambiar una reserva

Activa **Editar**, toca el botón de reserva y elige **Editar**. Aparecen su texto, enlace y color. Elegir un color lo aplica; «Usar color del sitio» recupera el color general.

En Salón Central y Taco Tasting Room, el título y la reserva son compartidos por todo el carrusel: permanecen en el mismo lugar mientras cambia la fotografía. Ambos utilizan el diseño inmersivo y el botón con relleno. Los carruseles siguen sin franja de controles, números ni flechas visibles.

## Duplicar un conjunto

Abre el lápiz del carrusel y pulsa **Duplicar conjunto**. La copia aparece a continuación, con sus fotos, textos, enlace, color, ajustes visuales y cuadros dibujados encima. Cambiar la copia no modifica el original. También se puede duplicar desde la barra del editor visual.

Para reutilizar la presentación en otro carrusel, abre **Opciones avanzadas → Estilo del carrusel → Como Salón Central**. Selecciona **Fijos: solo cambia la foto** para mantener el título y el botón.

## Colocar un texto o botón sobre la página

Pulsa **Dibujar texto o botón**, elige **Texto** o **Botón** y arrastra para marcar un rectángulo. Completa el contenido y guarda. Sobre un banner o carrusel, el cuadro queda unido a ese elemento; sobre el área general, queda unido a la página.

En edición, arrastra el asa **Mover** del cuadro para cambiar su lugar. La posición se conserva en el borrador. Se pueden ajustar posiciones por tamaño de pantalla; mientras tanto, una posición de escritorio se adapta al móvil con un ancho legible. **Cancelar** o **Esc** abandona el dibujo sin crear contenido.

## Ajustes de diseño

En **Opciones avanzadas** están el fondo, el borde, el encuadre y las dimensiones. **Sin fondo (transparente)** y **Sin borde** son independientes. No eliminan la fotografía ni el contenido.

Se retiró el encabezado automático «Espacios. Una misma búsqueda.» y el espacio de ese encabezado. No se agrega en las nuevas plantillas.

## Verificación

La suite `tests/browser-audit.cjs` comprueba los formularios, la reserva compartida, el color, la duplicación independiente, los cuadros dibujados, el móvil, los borradores y la publicación con un servicio simulado. `scripts/inspect-live-carousels.cjs` lee la configuración pública real y comprueba su migración en memoria, sin escribir en la base de datos.
