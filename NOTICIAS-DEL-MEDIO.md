# Noticias automáticas del medio

La sección **Noticias → Noticias del medio** muestra un banner con publicaciones recientes de **Culinaria Mexicana**. Cada nota incluye título, resumen breve, fecha, fotografía cuando la fuente la proporciona y un enlace que abre la publicación original.

El banner cambia de noticia cada **6 segundos**. No muestra una franja de números, contador o botones. Se puede recorrer con el gesto horizontal o con las flechas del teclado al enfocar uno de sus enlaces. Se respetan las preferencias de movimiento reducido y se pausa mientras el usuario interactúa con la noticia.

## Cambiar la fuente o la velocidad

1. Entra como administrador y abre **Noticias**.
2. Pulsa **Editar** y luego **Configurar fuente de noticias**, dentro de “Noticias del medio”.
3. Coloca la dirección HTTPS del medio. Puedes añadir su nombre y, si no se detecta automáticamente, su dirección RSS o Atom.
4. Elige entre 2 y 20 segundos en **Segundos entre noticias**.
5. Aplica al borrador y pulsa **Publicar**.

La fuente publicada se consulta **cada hora**. Los cambios de dirección y las nuevas publicaciones se incorporan en la siguiente sincronización. El sitio vuelve a comprobar su copia de noticias cada cinco minutos mientras esta sección está abierta. La casilla **Mostrar noticias automáticas del medio** permite volver a las notas manuales, que se conservan en el CMS.

## Cómo se mantiene actualizado

El flujo `Actualizar noticias del medio` lee los ajustes públicos del sitio y consulta los canales RSS/Atom o la API pública de publicaciones de WordPress. Guarda hasta ocho noticias en `data/media-news.json` y solicita un despliegue de GitHub Pages cuando hay contenido nuevo. No necesita contraseñas del medio ni claves privadas en el navegador.

La dirección de respaldo es `data/media-sources.json`. Se utiliza si el servicio público de configuración no está disponible. La última copia de noticias se conserva cuando la fuente falla; no se inventan notas ni se copian artículos completos.

El flujo también tiene una ejecución manual en GitHub Actions y una comprobación de lectura real en los pull requests que modifican la integración.

## Comprobaciones

```sh
python3 -m unittest discover -s tests -p 'test_media_feed.py' -v
BZ_PLAYWRIGHT_MODULE=playwright-core BZ_CHROMIUM=/usr/bin/chromium node tests/browser-audit.cjs
```

Las pruebas del parser comprueban RSS, Atom, metadatos de WordPress, saneamiento de textos, enlaces HTTPS y selección de la fuente publicada. Las pruebas del navegador incluyen la carga de las notas, sus enlaces originales, el cambio automático sin controles y la edición de la fuente, velocidad y activación.
