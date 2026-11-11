# Pruebas de navegador

El proyecto es estático y no necesita compilarse. La suite levanta su propio servidor HTTP y utiliza el HTML real. Intercepta todas las solicitudes a Supabase y bloquea los demás hosts externos. Las credenciales que aparecen en la prueba son valores locales ficticios: no inicia sesión ni publica en producción.

Requisitos: Node.js, Chromium y Playwright o `playwright-core` instalado en el entorno de pruebas.

```sh
npm install --no-save --package-lock=false playwright-core
BZ_PLAYWRIGHT_MODULE=playwright-core BZ_CHROMIUM=/usr/bin/chromium node tests/browser-audit.cjs
```

`BZ_PLAYWRIGHT_MODULE` también acepta una ruta absoluta a la instalación de Playwright del entorno. `BZ_AUDIT_ARTIFACTS` cambia el directorio de capturas y resultados; el valor predeterminado es `.audit-artifacts`, excluido de Git.

Las pruebas cubren rutas, composición adaptable, ambos editores, los ocho tipos de bloque, fondos y bordes independientes, imágenes, borradores, creación/eliminación de contenido, plantillas, carruseles y el flujo de publicación con un servicio simulado.

También verifican los seis campos principales de las recetas, una reserva fija durante las tres fotos de Salón Central y Taco Tasting Room, el color del botón, duplicación independiente con cuadros superpuestos, dibujo y movimiento de textos/botones y su adaptación al teléfono. El flujo `editor-live.yml` lee la configuración pública actual y comprueba en memoria que la migración conserve las tres fotos y muestre una sola reserva compartida.

El lector de noticias se comprueba con `python3 -m unittest discover -s tests -p test_media_feed.py -v`. El flujo de GitHub Actions verifica también la lectura real del medio antes de integrar cambios en esta conexión.
