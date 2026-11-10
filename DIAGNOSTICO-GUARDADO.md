# Diagnóstico: por qué en vivo NINGUNA edición se aplica (Balcón del Zócalo)

Fecha: 2026-11-10 · Alcance: solo lectura sobre `index.html` (script principal extraído y ejecutado en node v24; no se modificó el archivo ni se subió nada).

Síntoma del dueño: cambia el fondo de un elemento y no pasa nada; no se crean botones; las imágenes no se escalan; **no ve ningún error** y **el cambio nunca se ve, ni siquiera en el editor**.

---

## 1. Cómo fluye una edición (código real)

Toda edición, venga del panel o del editor visual, termina en la misma función del módulo CMS (`Rt`, script principal @2392099; offsets de este informe = script principal):

```js
async function X(R){ j(), Mt(R,t), qg(R), t=R, s=JSON.stringify(t)!==JSON.stringify(E), N(), await T() }
```

- `j()` — exige admin.
- `Mt(R,t)` — mantenimiento de `elementOverrides` (ver §4).
- `qg(R)` — **valida el documento COMPLETO** (no el cambio: todo el sitio) y puede lanzar.
- Solo si `qg` pasa: `t=R` (se adopta el documento), `N()` (render) y `T()` (guardar borrador en IndexedDB, con carrera de 3 s).

**Consecuencia estructural: si `qg` lanza por CUALQUIER nodo del documento, la edición se aborta ANTES de `t=R` y de `N()`: el cambio no se aplica, no se renderiza ni en el editor y no se guarda.** Un solo dato inválido o un solo límite rebasado en cualquier parte del sitio bloquea el 100 % de las ediciones (fondos, botones, imágenes, textos…), que es exactamente el patrón reportado.

Quiénes llaman a `X`:
- **Panel (módulo `Rt`):** el `submit` de los formularios (`[data-cms-editor]`, «Elemento actualizado en el borrador», «Borrador actualizado…»), los clics delegados (duplicar, eliminar, reordenar, temas, restaurar, importar borrador…) y la publicación (`qg(t)` + `e.publish(t,o)`). Casi todos pasan por el envoltorio `P` (§3) o por try/catch propio.
- **Editor visual (módulo `ht`, la barra flotante):** NO tiene acceso directo a `X`; llega a él por la API pública del módulo CMS: `A().applyDocument(H)` (= `X`) y `A().editElement(...)`. Lo usan el candado, centrar, tamaño de imagen, tamaño de módulo, posición libre y ubicación. Varias de esas acciones hacen `await A().applyDocument(H)` **sin try/catch** (verificado en la acción del candado, `lA` @2319543): si `X` lanza, la promesa queda rechazada sin manejar y **no se muestra absolutamente nada**.

## 2. Banco de pruebas (código real, ejecutado)

Se extrajeron del archivo, sin modificarlos: el módulo de modelo completo (`xg`, `Ro`, `Yo`, `Uo`, `qg` con su validador interno de nodos, `wA`, `Ig`, fábricas de valores por defecto), las constantes de la biblioteca de imágenes (`SI`, `Bt`/`Qt`/`Ct`), el lector de rutas `lg` (@500836), `Mt` (@2376165) y `X` (@2392955). El documento base se construyó como hace el arranque real: `xg(JSON.parse(#pilot-content))`.

### Resultados

| Prueba | Resultado |
|---|---|
| Documento por defecto normalizado | Construido OK. `JSON.stringify(doc).length = 12598` (tope de `qg`: 4 000 000) |
| `qg(doc por defecto)` | **PASA** |
| Doc + página con banner (@chef) + carrusel (@table/@brand) + texto | `qg` **PASA** (JSON = 13 044) |
| Round-trip `xg(doc con bloques)` | Conserva los 3 bloques; `qg` **PASA** |
| Edición 1: `backgroundMode:'glass'` en un banner | `qg` **PASA** |
| Edición 1b: `backgroundMode:'transparent'` y `'solid'` | `qg` **PASA** |
| Edición 2: agregar bloque `type:'button'` | `qg` **PASA** (el tipo `button` es válido; id con patrón `^[a-z0-9][a-z0-9-]{0,79}$` único) |
| Edición 3: `imageFit:'fill'` en banner y en slide de carrusel | `qg` **PASA** |
| Doc con 1 imagen inline `data:` de ~3.9 M caracteres | `qg` **PASA** (JSON = 3 913 062) |
| Doc con 3 imágenes inline `data:` de ~1.5 M caracteres | **`qg` THROW → `El contenido supera los 4 MB. Usa imágenes cargadas en la biblioteca.`** (JSON = 4 513 096) |
| Doc con 1 imagen inline de ~4.1 M caracteres | **`qg` THROW → `Las imágenes necesitan una dirección HTTPS válida.`** (`wA` rechaza `data:` ≥ 4 M y cae al validador de URL) |
| `X(doc válido)` con stubs del módulo | `t` se actualiza, `N()` (render) ×1, `T()` (guardado) ×1 |
| `X(doc de 4 512 972 caracteres)` | **THROW → `El contenido supera los 4 MB. Usa imágenes cargadas en la biblioteca.`**; tras el throw: **`t` intacto, `N()` ×0, `T()` ×0** → la edición no se renderiza NI se guarda |

### Lectura de los resultados

- **El validador NO es el problema para las ediciones nuevas**: los parches de la auditoría (aceptar `backgroundMode` y el ajuste `fill`) funcionan con el código real, la creación de botones es válida y el normalizador `xg` conserva los bloques. Descartado que «el arreglo esté mal hecho» a nivel de validación.
- **El techo de 4 MB de `qg` SÍ es un interruptor total probado**: en cuanto el documento serializado supera 4 000 000 de caracteres, `X` aborta cualquier edición antes de renderizar. Tres fotos inline de ~1.5 MB bastan. El documento real del dueño vive en Supabase (`cms_site`) y su lectura anónima está denegada (PostgREST respondió `42501 permission denied for table cms_site`), así que no se pudo medir su tamaño desde aquí; es la única regla de `qg` que un documento que crece con el uso normal rebasa «para todo a la vez». Reglas alternativas que producirían el mismo bloqueo total si el documento guardado ya las viola: un texto > 20 000 caracteres que no sea imagen (`Un texto excede el límite de 20.000 caracteres.`), una imagen `data:` ≥ 4 M caracteres, un enlace/imagen guardado con un valor que `wA`/`Ig` ya no aceptan, o topes de conteo (30 bloques por sección, 20 slides, etc.).
- Prueba decisiva pendiente (lado del dueño, 1 minuto): exportar el borrador desde el panel y correr `qg` sobre ese JSON — el mensaje exacto del throw nombra la regla. Este banco de pruebas puede hacerlo en segundos si se comparte el archivo exportado.

## 3. Por qué el dueño no ve ningún mensaje de error

Confirmado en código y CSS; hay tres capas que se suman:

1. **Panel:** el error de `X` lo captura el envoltorio `P` → `K(u.message)` → `Q` = `notify` = `Mg`, que escribe en `#toast`. La CSS de `.toast` es `position:fixed; …; z-index:30`. Pero el editor del panel es un **`<dialog>` modal** (`f = document.createElement("dialog")`, id `cms-editor`, abierto con `f.showModal()`): un diálogo modal vive en la *top layer* del navegador, por encima de cualquier `z-index` de la página. **Mientras el panel está abierto, el toast queda detrás del diálogo y su fondo: invisible.** Además el toast se auto-oculta a los 3.2 s (`Mg`: `setTimeout(()=>A.hidden=true, 3200)`).
   - Matiz: el `submit` de formularios sí tiene una zona `.form-error` dentro del formulario y su `catch` la rellena (`catch(J){ if(b) b.textContent=J.message, b.hidden=!1; else throw J }`). Si el formulario usado no trae esa zona visible, el error cae al toast invisible del punto anterior.
2. **Editor visual:** varias acciones `await A().applyDocument(H)` sin try/catch → rechazo no manejado → **ningún aviso en ninguna parte** (ni siquiera el toast oculto).
3. **El envoltorio `P` descarta en silencio:** `P=async(R,k)=>{ if(!l){ … } }` — si ya hay una acción en curso (`l=true`), la nueva se ignora sin mensaje ni cola.

Y un amplificador: al abrir la app, `AA()` carga el borrador local con `try{ … qg(k) … }catch{}` — si el borrador guardado ya no pasa `qg`, se descarta **en silencio** y el editor arranca desde la versión publicada.

## 4. `Mt(R,t)` — revisado, no es el culpable (con una salvedad)

```js
function Mt(e,A){ for(let [g,B] of Object.entries(e.elementOverrides||{}))
  if(B.removedImagePath){ let Q=B.removedImagePath; lg(e,Q)&&lg(e,Q)!==lg(A,Q)&&(delete B.removed, delete B.removedImagePath) } }
```

Solo limpia banderas `removed` obsoletas cuando la imagen a la que apuntan cambió. No descarta campos ni ediciones, y con overrides normales no lanza (probado con `lg` real: el override queda intacto si la ruta no cambió). **Salvedad:** si algún `elementOverrides` vale `null`, `B.removedImagePath` lanza `TypeError: Cannot read properties of null (reading 'removedImagePath')` (probado) — y como `Mt` corre ANTES que `qg` en `X`, eso también bloquearía toda edición con un mensaje aún más críptico. Es una causa secundaria posible, verificable con el JSON exportado.

## 5. Causas descartadas (con evidencia)

- **Los parches de fondos/`fill` rompen la validación** — descartado: `qg` pasa con `backgroundMode` en sus tres valores y con `imageFit:'fill'` (tabla §2).
- **No se pueden crear botones** — descartado a nivel de validación: el tipo `button` está en la lista válida y la prueba pasa. Si el botón no aparece, es porque `X` abortó por otra regla del documento completo.
- **El normalizador `xg` pierde los bloques al cargar** — descartado: round-trip conserva bloques y `qg` pasa después.
- **La carrera de 3 s de `T()` (IndexedDB, `storage_timeout`)** — descartada como causa de «nunca se ve»: `t=R` y `N()` ocurren ANTES de `T()`; si IndexedDB tardara, el cambio se vería en la sesión y solo fallaría la persistencia (con `h=false`). No explica invisibilidad inmediata.
- **`Mt` descartando cambios** — descartado (§4) salvo el caso borde de override `null`.

## 6. Causa raíz (síntesis)

**Arquitectura de validación total con error invisible.** `X` valida el documento entero con `qg` antes de aplicar cualquier edición; el documento real del dueño —con alta probabilidad por el techo de 4 MB de `JSON.stringify(doc)` (única regla que crece sola con el uso; alternativas en §2)— ya no pasa esa validación, así que **toda** edición muere antes del render y del guardado. Y el sistema de avisos está roto justo donde se le necesita: el error va a un toast con `z-index:30` que queda **detrás del `<dialog>` modal del editor**, o ni siquiera se emite porque las acciones del editor visual no capturan el rechazo. Resultado observable: «no sucede nada, nunca se ve nada».

## 7. Arreglo mínimo recomendado (NO aplicado)

1. **Confirmar la regla exacta (1 minuto, lado del dueño):** exportar el borrador y correr `qg` sobre el JSON (o pegar el texto que aparezca en `.form-error` al guardar). El mensaje nombra la regla que truena.
2. **Hacer visible el error donde está el usuario:** en el `catch` de `P`, además del toast, escribir el mensaje en la zona de estado del propio `<dialog>` abierto (patrón `.form-error` que ya existe en los formularios) — el toast fuera de la *top layer* nunca se verá con el panel abierto. Y envolver en try/catch las llamadas `A().applyDocument(...)` del editor visual para reportar con su `notify`.
3. **Quitar el bloqueo total:** subir el techo de `qg` (de `4e6` a, p. ej., `2e7`) o mover la regla de tamaño fuera de `qg` para que solo aplique al publicar/importar, no a cada edición; idealmente, validar el subárbol cambiado en vez del documento entero, para que un nodo heredado inválido no congele todo el editor.
4. **Blindajes baratos:** `Mt` debe saltar overrides `null` (`if(B?.removedImagePath)`), y `AA()` debe avisar (no `catch{}` vacío) cuando descarta un borrador que ya no valida.
5. Si la regla confirmada es el tamaño: migrar las imágenes `data:` del documento a la biblioteca (las subidas del panel ya van a Storage y guardan URL; las `data:` solo pueden venir de importaciones o versiones anteriores) para que el documento vuelva a quedar por debajo del techo mientras se aplica el punto 3.

---

# Arreglo aplicado (2026-11-10)

Aplicado **solo en la copia local** (`index.html`); nada se subió a GitHub. Parches delimitados con comentarios `/* FIX toki (guardado): … */` (fase 1) y `/* FIX toki (fase 2): … */` (fase 2). Corresponde a lo recomendado en §7, puntos 2–4, más el techo del punto 3.

## Fase 1 — Guardado: que ninguna edición muera en silencio ni por el tamaño del documento

| # | Sitio | Cambio |
|---|---|---|
| 1 | `qg` (validador del documento) | Techo `JSON.stringify(doc).length` de `4e6` a `2e7`; el mensaje ahora dice «El contenido supera los **20 MB**. Usa imágenes cargadas en la biblioteca.» |
| 2 | `wA` (validador de imágenes) | El umbral para aceptar una imagen `data:` sube de `e.length<4e6` a `e.length<2e7`: una sola foto inline grande ya no cae al validador de URL («Las imágenes necesitan una dirección HTTPS válida») ni bloquea todo |
| 3 | `Mt` (mantenimiento de `elementOverrides` en `X`) | `if(B?.removedImagePath)`: un override `null` ya no lanza `TypeError` antes de `qg` |
| 4 | CSS `.toast` | `z-index:30` → `9999`. Ojo: ningún z-index supera la *top layer* de un `<dialog>` modal; lo que destapa el error con el panel abierto es el parche 5. El 9999 ayuda cuando no hay diálogo |
| 5 | Envoltorio `P` del panel (módulo `Rt`) | Su `catch`, además del toast (`K`), escribe el mensaje en la `.form-error` del `<dialog>` abierto; si el diálogo no tiene esa zona, crea un `<p class="form-error" role="alert">` al final de su contenido |
| 6 | API pública del módulo CMS | `applyDocument` deja de ser `X` directo: es un envoltorio que al lanzar emite el aviso (`K`, el notify del módulo) con el mensaje y **después** propaga el error. Las acciones del editor visual que hacen `await A().applyDocument(H)` sin try/catch ya no fallan en silencio |
| 7 | `AA()` (carga del borrador al abrir) | El `catch{}` vacío ahora emite el aviso con el motivo: «El borrador guardado se descartó y no se cargó: …» |

### Verificación (banco de pruebas con funciones reales extraídas del archivo ya parchado; node)

| Prueba | Antes (diagnóstico) | Después |
|---|---|---|
| `X(doc de 4 512 972 caracteres)` (3 fotos inline de ~1.5 M) | THROW «El contenido supera los 4 MB…»; `t` intacto, `N()` ×0, `T()` ×0 | **Completa**: `t` actualizado, `N()` ×1, `T()` ×1 |
| `qg` con 1 imagen `data:` de ~4.1 M caracteres | THROW «Las imágenes necesitan una dirección HTTPS válida» | **PASA** |
| `Mt` con `elementOverrides:{'block-x': null}` | THROW `TypeError` (antes de `qg`) | **No lanza** |
| `qg` con `backgroundMode:'neon'` | — | Sigue lanzando «Elige un fondo válido para el elemento.» (la validación estructural NO se desactivó) |
| `qg` con bloque `type:'widget-inventado'` | — | Sigue lanzando «Elige un tipo de elemento válido.» |
| Scripts del archivo | — | `node --check` OK (script principal y el de notificaciones); los 3 bloques JSON embebidos parsean |

**Notas honestas de la fase 1:**
- `qg` mantiene su propia regla sobre overrides: un **valor** `null` en `elementOverrides` lo rechaza con «El elemento no tiene un identificador válido» (`!I||typeof I!="object"`). El parche 3 elimina el `TypeError` críptico que ocurría antes, en `Mt`; si ese caso existiera en un documento, el error ahora es visible y nombra el área. No es el bloqueo activo del dueño: su documento hoy **sí pasa** `qg` (probó crear un texto nuevo y el cambio se aplicó).
- Un documento >20 MB formado por **una sola** imagen `data:` ≥2e7 caracteres truena primero en `wA` (mensaje HTTPS); el mensaje de «20 MB» aparece cuando el exceso viene de muchas piezas menores. Ambos límites quedan alineados en `2e7`.

## Fase 2 — Escalado de imágenes: que el ajuste y el tamaño se vean en el render real

### Traza (cómo fluye de verdad)

- **Dónde se escriben los campos:** el panel (módulo `Rt`, campos `cB`) y el botón «Editar» del editor visual (módulo `ht`) escriben los **campos del documento**: `imageFit`, `imageWidth`, `imageHeight`, `imageFocusX`, `imageFocusY` en el bloque, en cada diapositiva del carrusel de bloques y en `home.slides.N` del hero (el formulario del elemento enlaza rutas del documento). El gesto de *arrastrar para redimensionar* en `ht` es otra vía: escribe en `elementOverrides` y lo aplica `Eg()` vía `QB()`; esa capa sí corre en cada render (`bg=ht(...)` se crea siempre y `mount()` se invoca en cada ruta).
- **La desconexión:** la pasada de `Eg()` que aplica `QB()` **desde los campos del documento** solo alcanza `<img>` registrados como elementos propios en `ht` (imágenes sueltas). Las fotos de bloque y del hero **no** son elementos-img registrados: dependen únicamente de lo que emita su renderer. Y ahí estaba el hueco:
  - **Hero — `nt()` (renderer propio):** la `<img class="hero-photo">` salía **sin ningún estilo en línea**; el CSS la fuerza siempre a `object-fit:cover; object-position:center` (más las clases gruesas `focus-left/right` del campo `focus`). `imageFit` y el foco numérico de la diapositiva **se ignoraban** en público y en el render base del editor: «Mostrar completa» o «Estirar» no hacían nada.
  - **Bloques — `ct()`:** ya emitía `object-fit`/`object-position` en línea (parche de la auditoría), pero **no** `imageWidth`/`imageHeight`: el tamaño puesto en el formulario solo existía si `QB` lo aplicaba desde la capa del editor; en el render base (público y preview) no tenía efecto.

### Parches (comentarios `/* FIX toki (fase 2): … */` junto a `nt` y `ct`; dentro de los template literals no cabe comentario, por eso van en la cabecera de cada renderer)

| Sitio | Cambio |
|---|---|
| `nt()` — img del hero | Emite `style` en línea con `object-fit` (si la diapositiva define `imageFit`) y `object-position` (si define foco numérico), mismo patrón que `ct()`. El estilo en línea gana al `cover` fijo del CSS |
| `ct()` — imagen de bloque | El `style` en línea suma el tamaño con la semántica de `QB`: `width:<imageWidth>%;max-width:100%` (y `height:auto` si no hay alto), `height:<imageHeight>px;max-height:none` si hay alto |
| `ct()` — diapositiva de carrusel | El mismo tratamiento para la foto de cada slide |
| `ct()` — pista del carrusel | `.block-carousel-track` lleva `style="height:auto"` cuando alguna diapositiva define `imageHeight` (equivale a lo que `QB` hacía al vaciar el alto de la pista: manda el alto asignado, no el alto fijo de la pista) |

**Alcance y límites:** en el hero, ancho/alto **por diapositiva** no se aplican a propósito: su foto es la capa de fondo completa (`position:absolute; inset:0`) y el «espacio dado» lo manda la sección (alto según presentación y breakpoint, en CSS). Lo que sí manda ahora en el hero es el modo de ajuste (`cover` = llenar recortando, `contain` = completa, `fill` = estirar) y el foco numérico. El zoom (`imageZoom`) sigue siendo solo de la capa `QB` para medios enmarcados (noticias, laboratorio, etc.), fuera del alcance pedido. Sin campos definidos, el HTML generado es **idéntico** al anterior (verificado): el contenido ya publicado no cambia.

### Verificación (renders reales `nt`/`ct` extraídos del archivo parchado, ejecutados en node; 16/16)

| Prueba | Resultado |
|---|---|
| Hero: slide con `imageFit:'contain'`, foco 15/85 | El `<img>` trae `object-fit:contain` y `object-position:15% 85%` |
| Hero: slide sin campos | Sin atributo `style` (legado intacto) |
| Bloque imagen: `fill` + ancho 50 + alto 250 + foco 20/80 | `object-fit:fill`, `width:50%`, `max-width:100%`, `height:250px`, `max-height:none`, `object-position:20% 80%` |
| Bloque imagen: solo ancho 40 | `width:40%` + `height:auto` (semántica `QB`) |
| Bloque imagen sin campos | Sin `style` (legado intacto) |
| Carrusel: slide `contain` + ancho 60 + alto 200 + foco 10/90 | Los cuatro valores en el `<img>`; la pista trae `style="height:auto"` |
| Carrusel: slide sin `imageHeight` (solo `cover`) | Pista sin `style`; la foto sigue emitiendo `object-fit:cover` |
| Sintaxis tras la fase 2 | `node --check` OK en ambos scripts; JSON embebidos válidos |
