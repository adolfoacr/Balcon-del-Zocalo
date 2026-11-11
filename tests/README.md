# Pruebas de navegador

El proyecto es estático y no necesita compilarse. La suite levanta su propio servidor HTTP y utiliza el HTML real. Intercepta todas las solicitudes a Supabase y bloquea los demás hosts externos. Las credenciales que aparecen en la prueba son valores locales ficticios: no inicia sesión ni publica en producción.

Requisitos: Node.js, Chromium y Playwright o `playwright-core` instalado en el entorno de pruebas.

```sh
npm install --no-save --package-lock=false playwright-core
BZ_PLAYWRIGHT_MODULE=playwright-core BZ_CHROMIUM=/usr/bin/chromium node tests/browser-audit.cjs
```

`BZ_PLAYWRIGHT_MODULE` también acepta una ruta absoluta a la instalación de Playwright del entorno. `BZ_AUDIT_ARTIFACTS` cambia el directorio de capturas y resultados; el valor predeterminado es `.audit-artifacts`, excluido de Git.

Las pruebas cubren rutas, composición adaptable, ambos editores, los ocho tipos de bloque, fondos y bordes independientes, imágenes, borradores, creación/eliminación de contenido, plantillas, carruseles y el flujo de publicación con un servicio simulado.
