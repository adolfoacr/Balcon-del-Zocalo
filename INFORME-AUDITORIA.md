# Informe de auditoría — Balcón del Zócalo · I+D y Chef Checo

**Alcance:** auditoría completa de `index.html` (8.6 MB, la página viva de la rama `gh-pages`) y revisión de `activar.html`, `actualizar.html`, `notificaciones.html` y `supabase/*.sql`.
**Estado:** todos los arreglos están aplicados **solo en la copia local** (`index.html`). Nada se subió a GitHub. Los respaldos están en `index.original.html`, `activar.original.html`, `actualizar.original.html`, `notificaciones.original.html`.
**Resumen:** 11 hallazgos. **5 arreglados o mejorados (H1, H2, H3, H6, H7) con 10 cambios de código** delimitados con comentarios `/* FIX toki: … */` o añadidos al final del CSS. 2 se explican sin cambio de código (H4, H5) y 4 quedan como recomendación o nota informativa (H8–H11).

---

## 1. EL ACOMODO (prioridad del dueño)

### 1.1 H1 — El contenido de un bloque se escapaba de su elemento al moverlo

**Qué pasaba (en tus palabras):** «creo un banner, carrusel, imagen o lo que sea, agrego texto y botones, y cuando muevo las cosas de pronto se esconden y se pierden, se salen del área segura del elemento creado».

**Causa raíz (confirmada con prueba ejecutable):** en el editor visual, cada elemento de la página (incluidos el título, el texto y el botón *de adentro* de un bloque) puede tener una «posición libre». Al soltar el arrastre, el código guardaba esa posición **relativa a la página completa** (el contenedor casi siempre resulta ser `main`, porque solo existen 4 contenedores de página: navegación, página, ubicación y pie). Y al pintar, la función `Ng()` del módulo de diseño hacía algo drástico:

```js
IA.append(z) // IA = el contenedor de página; z = el elemento
Object.assign(z.style, {position:"absolute", …})
```

Es decir, **sacaba el elemento de su bloque y lo pegaba como hijo directo de la página**, con coordenadas de página. Consecuencias exactas de lo que veías:

1. El texto/botón **deja de pertenecer al bloque**: si después mueves o reordenas el bloque, el contenido **no lo sigue** — se queda flotando donde estaba, sobre otras secciones.
2. Al salir del bloque pierde su contexto de estilos (`.block-copy`, la retícula y el velo del banner), así que puede verse «escondido», sin contraste o tapado.
3. La posición se guarda **por dispositivo** (teléfono/tableta/escritorio): en el dispositivo sin posición guardada el elemento vuelve a su sitio, y en el otro «desaparece» del bloque.
4. La página entera crecía (`minHeight` del contenedor) para acomodar al elemento fugado.

**En qué tipos pasaba:** en todos los que tienen contenido interno editable: **banner, carrusel, imagen, texto, título, botón y acceso directo**. No era un problema del banner en sí: su CSS (`position:relative; isolation:isolate`, imagen con `z-index:-2` y velo `::before` en `z-index:-1`) es correcto mientras el contenido permanezca dentro.

**Arreglo (cambio C8, función `Ng()`):** si el elemento con posición libre vive dentro de un bloque (`.custom-block`) y no es el bloque mismo, ahora se **re-ancla a su propio bloque**: se queda como hijo del bloque y sus coordenadas se convierten de «relativas a la página» a «relativas al bloque», conservando el mismo punto visual en el momento de aplicar. El bloque además crece (`minHeight`) lo necesario para que el contenido quede **dentro de su área**, en vez de crecer la página. **Los datos guardados no se tocan**: la conversión es solo en memoria al pintar, así que tus posiciones ya guardadas ahora se interpretan dentro de su bloque.

**Prueba:** con un DOM simulado y la función real, un botón interno con posición libre terminaba con el `Ng()` original como hijo de `main` en `top:600px` (fuera de su bloque); con el arreglo queda hijo del bloque en `top:100px` — **el mismo punto visual** (100 px dentro de un bloque que empieza en 500) — y es el bloque el que crece a 150 px para contenerlo.

**Qué libertad da y qué límite queda:**
- El contenido interno de un bloque ya puede moverse libremente **dentro de su elemento** y viaja con él al reordenarlo o moverlo de sección.
- La posición libre sigue guardándose **por dispositivo** (teléfono/tableta/escritorio) — es el diseño de la app; hay que acomodar en cada tamaño o usar «devolver a su origen».
- Los bloques **entre sí** no tienen coordenada absoluta guardada: se ordenan en el flujo (orden de lista, cuadrícula/lista) + ancho/desplazamiento por módulo (§1.2). Un canvas totalmente libre para los bloques mismos exigiría reescribir el motor de diseño; no se hizo.

### 1.2 H2 — El tamaño del módulo se aplicaba mal: alto fantasma de 300 px

**Causa raíz:** la función `uI()` (la que aplica ancho/alto/desplazamiento del módulo al pintar) tenía dos defectos en una línea:

```js
if(!A?.moduleWidth||…)return; // sin ancho, salía sin aplicar nada
e.style.height = Math.max(80, Math.min(2000, Number(A.moduleHeight)||300)) + "px"
```

- Si ponías **solo el ancho**, el bloque quedaba forzado a **300 px de alto**, aunque el propio campo del editor promete «déjalo vacío para escalar proporcionalmente».
- Si ponías **solo el alto** (sin ancho), se **ignoraba por completo**.

**Arreglo (cambio C1):** cada dimensión se aplica solo si la definiste: ancho y desplazamiento cuando hay ancho; alto cuando es mayor que 0. Probado con la función real (antes: `height:"300px"` con solo ancho y `undefined` con solo alto; después: sin alto impuesto y `480px` respetado).

### 1.3 H3 — Reordenar solo se podía con flechitas

**Diagnóstico:** el orden sí se guarda y sí se respeta (la lógica `KA`/`Eg` que localiza y mueve bloques entre secciones está probada y es correcta). El problema era de **herramienta**: en el panel solo había botones ↑/↓ por fila, y en la vista previa solo pasos entre hermanos.

**Arreglo (cambios C9 + C10):** las filas de las listas del panel (bloques, imágenes del carrusel, noticias, recetas, accesos, secciones…) ahora se pueden **arrastrar y soltar** para reordenar (asa ⠿ a la izquierda de cada fila). Al soltar, el nuevo orden se guarda con el mismo camino que usan las flechas (mismo arreglo, mismo guardado), así que es imposible que quede un orden «a medias». **Límite:** el arrastre HTML5 no funciona en pantallas táctiles; ahí quedan las flechas, como antes. Arrastrar entre secciones distintas no está soportado (para eso está el campo de sección en el editor del bloque y el botón de mover de la vista previa).

### 1.4 Cómo queda el acomodo, en resumen

| Quieres… | Cómo se hace ahora |
|---|---|
| Cambiar el orden de los bloques | Panel: arrastrar la fila o flechas ↑/↓. Vista previa: flechas del elemento. |
| Ancho / alto / desplazamiento de un bloque | Campos del módulo en el editor del bloque — ya sin el alto fantasma de 300 px. |
| Mover el texto/botón dentro de su bloque | Arrastrarlo en la vista previa: queda anclado a su bloque y se mueve con él. |
| Que una imagen llene su zona | Ver §3. |

---

## 2. Fondos por elemento (petición del dueño)

**Dónde quedó disponible:** en el editor de **todos los tipos de bloque** (banner, carrusel, imagen, texto, título, botón, acceso directo), campo **«Fondo del elemento»**. En los bloques tipo *grupo* no aplica: el grupo es un contenedor sin fondo por diseño.

**Cómo se guarda:** campo opcional `backgroundMode` en el objeto del bloque: `""` (automático), `"transparent"`, `"glass"` o `"solid"`. El validador del documento (`qg`) ahora solo acepta esos valores. Si el campo no existe — todo lo ya publicado — **el render no cambia en nada** (comprobado: sin `backgroundMode` no se emite ninguna clase nueva).

**Cómo se ve cada modo** (cambios C5, C6 y CSS en C11; el render agrega la clase `bg-<modo>` al bloque):
- **Transparente** (`.bg-transparent`): sin fondo y sin borde; el contenido flota sobre el fondo de la página.
- **Cristal** (`.bg-glass`): fondo semitransparente con `backdrop-filter: blur(14px)` y borde claro sutil — efecto glassmorphism.
- **Sólido** (`.bg-solid`): el fondo de panel del tema (`var(--soft)`), opaco — es el aspecto clásico, pero elegido explícitamente.
- **Automático**: el comportamiento actual del tema.

**Nota:** si además marcas «Sin fondo ni borde» (*plain*), manda la opción de Fondo que elijas aquí.

---

## 3. Imágenes: que se adapten a la zona (petición del dueño)

**Diagnóstico — la causa raíz, por partes:**
1. **Faltaba el modo «estirar»:** el validador solo aceptaba `cover`/`contain`; guardar `imageFit:"fill"` rebotaba con «Selecciona un ajuste de imagen válido» (reproducido con la función real). El dueño no tenía forma de deformar la imagen para llenar exactamente la zona.
2. **El render no aplicaba el ajuste por sí mismo:** la plantilla de bloques pintaba `<img>` pelón; `object-fit` y el punto focal solo llegaban si la capa del editor visual (`QB`) corría y encontraba el elemento — frágil y dependiente del orden de montaje.
3. **La imagen no llenaba la zona del módulo:** la regla `.block-image{max-height:320px}` recortaba cualquier imagen de bloque a 320 px aunque el módulo tuviera 500 px de alto; y la pista del carrusel tenía su propio alto fijo (`clamp(180px,32vw,330px)`), ignorando el alto del módulo. La zona no mandaba: mandaba la imagen.

**Arreglos (cambios C2, C3, C4 y CSS de C11):**
- Validador y selectores: nuevo valor **`fill` = «Estirar para llenar la zona»**, junto a «Rellenar y recortar» (`cover`) y «Mostrar completa» (`contain`).
- El render ahora emite el estilo **en el propio HTML**: `object-fit` + `object-position` (punto focal `imageFocusX/Y`) tanto en la imagen del bloque como en **cada diapositiva** del carrusel — sin depender de la capa visual. (`QB` sigue aplicando ancho/alto/zoom como antes; no hay conflicto, escribe los mismos valores.)
- CSS nuevo para módulos con tamaño definido (`.module-framed`): el bloque se vuelve columna flexible; la imagen y la pista del carrusel **ocupan el espacio sobrante** (`flex:1`, sin el tope de 320 px), así la imagen sigue al contenedor. El banner conserva su retícula centrada.

**En qué tipos quedó aplicado cada modo:**

| Tipo | cover (llenar) | contain (ajustar) | fill (estirar) | Punto focal |
|---|---|---|---|---|
| Banner | ✔ (imagen absoluta a toda la zona) | ✔ | ✔ (nuevo) | ✔ |
| Imagen | ✔ | ✔ | ✔ (nuevo) | ✔ |
| Carrusel (por diapositiva) | ✔ | ✔ | ✔ (nuevo) | ✔ |
| Portada (slides de inicio), noticias, recetas y demás elementos con imagen | ✔ vía editor de elemento (`QB`) | ✔ | ✔ (el validador ya lo acepta y `QB` lo aplica tal cual) | ✔ |

---

## 4. La app y cómo guarda los datos (referencia)

- **Qué es:** sitio interno del restaurante en un solo `index.html`: portada con carrusel, noticias, recetario, libro, secciones personalizadas con bloques (banner, carrusel, imagen, texto, título, botón, acceso directo, grupo) y un CMS completo con dos editores: el **panel** (listas y formularios, módulo `Rt`) y el **editor visual** sobre la vista previa (módulo `ht`, con posiciones libres, candados y marcos de módulo).
- **Datos:** el *documento* del sitio (JSON, `cmsVersion:1`) vive en **Supabase** (tabla `cms_site`, publicación por REST/RPC `publish_site`) y el **borrador** se guarda en el navegador (IndexedDB `balcon-cms-drafts`, por usuario). Al entrar, el sitio pinta con el contenido incrustado de respaldo si no hay red. Todo guardado pasa por un validador estricto (`qg`/`Mt`): ids con formato, máximo 30 bloques por sección/página, documento máximo 4 MB, etc.
- **Archivos auxiliares:** `activar.html` y `actualizar.html` son guías de configuración para el dueño; `notificaciones.html`, la guía de notificaciones. Los SQL de `supabase/` crean las tablas con RLS activado y funciones `security definer` con `search_path=''` — correctos, sin cambios.

---

## 5. Hallazgos numerados

| # | Hallazgo | Estado |
|---|---|---|
| H1 | El contenido interno de un bloque con posición libre se anexaba a la página y se perdía al mover el bloque (§1.1) | **Arreglado (C8)** |
| H2 | Alto fantasma de 300 px con solo ancho; alto ignorado sin ancho (§1.2) | **Arreglado (C1)** |
| H3 | Reordenar solo con flechas ↑/↓ (§1.3) | **Mejorado (C9, C10)**: arrastrar en el panel |
| H4 | «Bloqueo»: el candado de un bloque o sección congela todo lo que contiene | Explicado abajo — es el diseño, no un error |
| H5 | Creación de elementos: la lógica es correcta; lo que fallaba era el después (H1/H2) | Sin cambio de código |
| H6 | Imágenes: faltaba «estirar», el render no aplicaba el ajuste, tope de 320 px (§3) | **Arreglado (C2, C3, C4, C11)** |
| H7 | Fondos por elemento inexistentes (§2) | **Implementado (C5, C6, C11)** |
| H8 | Peso/rendimiento: 8.6 MB en un solo archivo | Recomendación (§7) |
| H9 | Llave de Supabase visible en el archivo | Informativo (§7) |
| H10 | Al **eliminar** un elemento, la compactación (`AB`) recoloca posiciones libres de esa página | Informativo — comportamiento a conocer |
| H11 | Archivos auxiliares y SQL | Sin fallos; sin cambios |

**Sobre H4 (el «bloqueo»):** el candado funciona así en el código (`P()`/`mA()`): si un elemento está bloqueado, **tampoco se puede mover nada de lo que contiene**. Si bloqueas un bloque completo o una sección, todo su interior queda congelado y cualquier intento responde «Desbloquea el candado antes de mover este elemento». No es un error de programación, pero sí una trampa: si algo «no se mueve», revisa primero el candado del elemento **y el de su bloque/sección**. Sin cambio de código. Relacionado: el guardado del borrador corre una carrera de 3 segundos contra IndexedDB (`storage_timeout` en `X()`); con el almacenamiento del navegador muy lento, una edición puede fallar con ese mensaje en vez de colgarse.

**Sobre H5 (creación):** crear bloques funciona — ids generados con `crypto.randomUUID()` válidos para el validador, alta en panel y en vista previa verificadas, y las funciones de localizar/mover (`KA`, `Eg`, `XA`) pasaron pruebas ejecutables, incluido mover un bloque de una página a una sección. Los topes reales que sí pueden rechazar un guardado (con mensaje): 30 bloques por sección/página, 20 diapositivas por carrusel, documento de 4 MB.

**Sobre H10:** la compactación solo corre al eliminar contenido (llamadas `I?.()`), no al mover: al borrar, las posiciones libres pegadas más allá del contenido se recorren hacia arriba. Es intencionado («sin dejar un espacio vacío»), pero conviene saberlo si tras borrar algo un elemento libre «salta».

---

## 6. Lista exacta de cambios aplicados (todos en `index.html`)

| # | Dónde | Qué y por qué |
|---|---|---|
| C1 | Función `uI()` (editor visual) | Ancho/alto/desplazamiento se aplican solo si están definidos; fuera el `||300` que forzaba 300 px (H2). |
| C2 | Validador `qg()` (CMS) | `imageFit` acepta `"fill"`; se valida el nuevo `backgroundMode` (H6, H7). |
| C3 | `cB()` (campos de imagen del CMS) | Nueva opción «Estirar para llenar la zona» en el select de ajuste, en sus dos variantes (H6). |
| C4 | Render `ct()` | La imagen del bloque y cada diapositiva emiten `object-fit` y `object-position` (foco) en línea (H6). |
| C5 | Render `ct()` | El bloque emite la clase `bg-<modo>` cuando tiene `backgroundMode` (H7). |
| C6 | Esquema de campos del bloque (`nB.blocks`) | Nuevo campo «Fondo del elemento» (Automático/Transparente/Cristal/Sólido) tras «Sin fondo ni borde» (H7). |
| C7 | — | *(fusionado en C11: el CSS de fondos y de llenado de zona va junto.)* |
| C8 | Función `Ng()` (editor visual) | Re-anclaje de elementos internos de bloque a su bloque, con conversión de coordenadas en memoria (H1). |
| C9 | `JA()` (listas del panel) | Filas con `draggable` + asa ⠿ (`data-cms-drag`) (H3). |
| C10 | Cuerpo del CMS (`Rt`), antes de `tA()` | Listeners `dragstart/dragover/drop` que reordenan con las mismas primitivas `KA`/`X` de las flechas (H3). |
| C11 | Primer `<style>`, al final | CSS: `.bg-transparent/.bg-glass/.bg-solid`; llenado de zona en `.module-framed` (imagen y pista de carrusel con `flex:1`, sin tope de 320 px; el banner conserva su retícula); estilo del asa de arrastre (H6, H7, H3). |

Delta total del archivo: **+4,668 bytes** sobre 8,676,618. Ningún otro archivo fue modificado.

---

## 7. Recomendaciones (sin aplicar)

- **H8 · Rendimiento:** el archivo pesa 8.6 MB: el visor de PDF (pdf.js) aporta ~3.7 MB minificados y hay ~52 literales base64 (imágenes y la fuente Questrial) por otros ~3.7 MB. Todos los visitantes descargan todo eso siempre. La mejora real — servir pdf.js e imágenes como archivos separados con caché — es una reestructura; no se hizo porque el encargo era de cambios mínimos y seguros.
- **H9 · Llave visible:** el bloque `service-config` trae la llave **publishable** de Supabase. Es la llave pública pensada para el navegador (la propia app verifica que solo se acepten llaves publishable/anon, y el SQL protege los datos con RLS y `is_site_admin()`). **No** es una llave secreta y no hace falta cambiarla. La única regla: nunca pegar en el HTML una llave `service_role`.
- **CSS menor:** `.custom-block` usa `overflow:hidden`, pero el carrusel y los bloques «sin fondo» usan `overflow:visible` — es intencionado por tipo; se dejó como está.

---

## 8. Cómo verifiqué (sin navegador disponible en esta máquina)

No hay Chromium ni jsdom en el entorno, así que **no** hubo prueba en navegador real; la verificación fue por análisis estático y **pruebas ejecutables con el código real del archivo**:

1. **Sintaxis:** los 5 bloques `<script>` extraídos: los 3 de datos son JSON válido; el script principal y el de notificaciones pasan `node --check`, igual que los scripts de `activar/actualizar/notificaciones.html` — antes y después de los cambios.
2. **Banco de pruebas con funciones reales extraídas** (`uI`, `QB`, `qg`, `KA`, `XA`, `Eg`, `Ig`): 16 pruebas. **Antes: 12 pasan / 4 fallan** (los 4 fallos son exactamente H2 ×2, la falta de `fill` y la falta de `backgroundMode`). **Después: 16/16.**
3. **Prueba de `Ng()` con DOM simulado** (H1): reproduce el escape con la función original (el botón termina hijo de la página) y confirma el anclaje con la parchada, con geometría equivalente.
4. **Prueba de render `ct()`** con datos de ejemplo: banner con fondo cristal y `imageFit:"fill"` produce la clase `bg-glass` y `style="object-fit:fill;object-position:20% 80%"`; un bloque sin los campos nuevos produce **exactamente** el HTML de antes; diapositiva con `contain` y foco vertical correcto. 7/7 comprobaciones.
5. El arrastre del panel (C9/C10) se verificó por sintaxis y por reutilizar las primitivas ya probadas (`KA`/`X`); su prueba de interacción real queda para el navegador del dueño.

---

## 9. Riesgos y decisiones para el dueño

1. **Nada está publicado.** La rama `gh-pages` sigue como estaba. Para publicar hay que subir este `index.html`; para revertir, basta volver a subir `index.original.html`.
2. **Posiciones libres ya guardadas:** no se modificó ningún dato. Si alguna posición libre la habías puesto *a propósito* a nivel página para un elemento que vive dentro de un bloque, ahora se verá dentro de su bloque (que es el comportamiento que pediste).
3. **Cristal en navegadores viejos:** sin `backdrop-filter`, el fondo cristal se ve como un fondo semitransparente sencillo. En navegadores actuales funciona completo.
4. **Pruébalo en tu navegador antes de publicar:** sobre todo (a) arrastrar una fila en el panel, (b) mover el texto de un banner en la vista previa y luego reordenar el banner, (c) una imagen en modo «Estirar» dentro de un módulo con alto definido.
