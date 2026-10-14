# Contexto para Claude Code

Meta: app de experiencia gastronómica de Balcón del Zócalo, con la misma importancia para el área de I+D y el trabajo, investigaciones y aprovechamientos del chef Checo. Debe ser sencilla de usar en móvil y tableta/iPad y funcionar en escritorio.

Código fuente: https://github.com/adolfoacr/Balcon-del-Zocalo/tree/web-admin-research
Página publicada: https://adolfoacr.github.io/Balcon-del-Zocalo/

Clonar y abrir la rama de trabajo:

```sh
git clone --branch web-admin-research https://github.com/adolfoacr/Balcon-del-Zocalo.git
cd Balcon-del-Zocalo
npm ci
npm run dev
```

Se requiere Node.js 24 o posterior. El servidor de desarrollo escucha en el puerto 4173. La aplicación se construye con `npm run build`; genera `index.html` autocontenido. `gh-pages` es la rama publicada, no la rama principal de desarrollo web.

Archivos relevantes:

- `web/app.js`: navegación y lector PDF.
- `web/admin.js`: paneles de administración y edición de contenido.
- `web/layout.js`: movimiento, candados y anclajes de imágenes y módulos.
- `web/module-frame.js`: dibujo del cuadro de un módulo y plantillas de nuevas secciones.
- `web/styles.css` y `web/markup.js`: diseño y estructura visual.
- `web/site-model.js`: estructura y validación de datos.
- `web/service.js`, `web/service-config.json` y `supabase/`: conexión, autenticación y políticas de permisos.
- `web-tests/` y `cms-tests/`: pruebas de comportamiento y seguridad.
- `docs/ADMIN-SUPABASE.md`: publicación, borradores y permisos.

Conservar el proyecto nativo Swift en `Sources/`, `Tests/` y `Package.swift`. El proyecto web utiliza JavaScript, no depende de React. La configuración pública de Supabase es una URL y una clave publishable; no se necesita una clave service_role para trabajar en la interfaz.

Los administradores pueden editar y publicar; los visitantes ven contenido publicado. Solo administradores pueden cargar, sustituir o retirar el PDF. Las participaciones privadas se mantienen privadas. Las pruebas utilizan respuestas simuladas: no alterar cuentas, correos, publicaciones ni propuestas reales para probar la UX.

En Agregar se puede activar «Dibujar un cuadro para delimitar el módulo». Los marcos mantienen unido el contenido y participan en el flujo de la página. El icono ▣ permite escalar el módulo entero; ⤢ permite escalar su imagen. «Ajustar espacios» reduce huecos de posiciones libres sin mover los elementos bloqueados. Las secciones nuevas ofrecen plantillas vacía, editorial, galería e investigación. El lector tiene gesto horizontal para pasar páginas y permite scroll vertical.

Verificar cambios con `npm run check`, `npm run build`, las pruebas Playwright pertinentes y `npm run check:responsive`. `npm run test:security` comprueba también las políticas en PostgreSQL simulado. Chromium debe estar instalado; se puede indicar `CHROMIUM_PATH`. Las pruebas con entrada táctil simulada no son una certificación de Safari físico en iPad.
