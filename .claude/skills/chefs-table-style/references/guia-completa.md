# Guía de estilo "Chef's Table" → Balcón del Zócalo

Fuente analizada: `CHEFS TABLE.mp4` (tráiler de Chef's Table, 2:10, 1918×1078, 30 fps, H.264).
Método: 48 fotogramas uniformes (1 cada ~2.7 s) + detección de cortes + medición de color + lectura de subtítulos en pantalla.
**Limitación:** la pista de audio del archivo viene en silencio (-91 dB), así que NO pude analizar música, voz ni diseño sonoro. Todo lo de abajo es visual. Ver sección 9 para lo que necesito de ti para completar el audio.

---

## 1. Esencia (la frase que guía todo)
> **Cada chef es el protagonista de una película de autor, no de un programa de cocina.**
Se filma la *persona y su obsesión* (duda, riesgo, familia, miedo a fallar), y el plato aparece como consecuencia, como una obra de arte. Cero "receta", cero "tips", cero prisas.

## 2. Estructura del tráiler (replicable para el tráiler del restaurante)
| Tiempo | Bloque | Qué pasa |
|---|---|---|
| 0:00–0:08 | Apertura | Negro, silencio visual. Servilleta doblada en primer plano. Marcos de ventana oscura con la brigada trabajando (voyeur, tenue). |
| 0:08–0:20 | Cartelas | Fondo blanco, texto gris fino: *"A delectable documentary series"* → *"The farthest reaches of the world"*. |
| 0:20–1:10 | Montaje de voz en off | Paisajes extremos (nieve, costa, bosque, mar) alternados con manos, humo, fuego, platos. Subtítulos como hilo narrativo ("Debes esforzarte para ir", "Mi sueño era tener el mejor restaurante del planeta"). |
| 1:10–1:50 | Crescendo emocional | Cortes cada ~1 s: plato → chef → cocina → plato. Frases de duda ("en algún momento puedes lastimar a mucha gente", "¿Qué hice?"). |
| 1:50–2:10 | Cierre | Entrevistas largas (Bottura), tarjetas de nombre por chef (blanco, mayúsculas, país), plato final, logo **CHEF'S TABLE**, logo Netflix. |

Regla: **abre callado y oscuro, sube el ritmo, cierra con nombres propios.**

## 3. Formato y encuadre
- **Relación de aspecto ≈ 2:1 (letterbox ~1918×962)**: barras negras arriba/abajo. Para nosotros: render 3840×1920 o 2.00:1 / 2.39:1 con barras.
- **Lentes largas (85–200 mm) y f/1.4–f/2.8**: fondo siempre desenfocado, bokeh de luces cálidas, profundidad de campo mínima. El plato o la cara están en foco, todo lo demás se disuelve.
- **Planos dominantes:**
  1. **Macro de plato / ingrediente** (erizo, harina, hoja ardiendo, nigiri): 25–30 % del tiempo.
  2. **Primer plano de entrevista**: chef descentrado (regla de tercios), mirada **fuera de cámara**, ligeramente hacia abajo, rostro cortado por el borde. Sombra dura en media cara.
  3. **Plano de hombros/medio con acción** (puerta, cocina, caminar).
  4. **Gran plano general de paisaje** con la persona diminuta (moto entre álamos, chef de espaldas en la colina).
  5. **Plano cenital** (cenital de vieras sobre musgo y madera).
  6. **Inserts de manos** (amasar, cortar hongo, servir, doblar servilleta).
- **Planos "a través"**: vidrio, ventana, parabrisas, comanda colgada → observamos desde fuera, íntimo y casi indiscreto.
- **Composición simétrica en platos** (centrado, plato único sobre mesa), **asimétrica en personas**.

## 4. Movimiento de cámara
- Casi todo **cámara en mano muy suave o slider/gimbal lento**; micro-empujes (push-in) hacia el plato o rostro.
- **Slow motion (60–120 fps → 24/30)** en: salsa lanzada al aire, vapor, fuego, líquido cayendo. Es la "marca de la casa".
- Cámara estática sólo en la entrevista y en las cartelas.
- Nada de whip-pans, zooms digitales ni glitch.

## 5. Iluminación
- **Luz natural / práctica**: ventanas, velas, fuego, lámparas de mesa. Muy poco "luz de estudio".
- **Estilo claroscuro**: bajo key, alto contraste en interiores (mesa de madera con un solo golpe de luz cálida).
- **Contraluz dorado** (golden hour) en exteriores con flare suave.
- Entrevistas: luz lateral suave de ventana, fondo neutro oscuro, un highlight en el ojo/lente de los lentes.
- Cocina: luz blanca limpia, algo fría, pero sin sobreexponer.

## 6. Color grade (la receta)
Medí los promedios por escena:
| Escena | Look |
|---|---|
| Exteriores de naturaleza | Verdes **musgo/oliva apagados**, cielos grisáceos azul-verdoso (≈ hue 166–170°, saturación baja ~0.09), sombras teal |
| Interiores / mesa | **Ámbar y marrón quemado** (≈ hue 37–40°), saturación media-alta sólo aquí (0.24–0.65), negros profundos |
| Platos | La **única** zona saturada: amarillo, rojo, verde vivo sobre fondo blanco o madera oscura |
| Cartelas | Blanco puro con **viñeta gris muy suave** en esquinas |
| Entrevistas | Piel natural, fondo beige-marrón oscuro, contraste medio |

Receta práctica (DaVinci / Premiere Lumetri):
- Perfil base: log → Rec.709 con **curva suave en S**, negros ligeramente levantados (no aplastados totalmente), blancos con roll-off suave.
- **Desaturar el global ~15–25 %**; proteger tonos de piel y comida.
- **Split-toning:** sombras hacia teal/azul-verde, medios y luces hacia ámbar/dorado.
- **Grano de película fino** (35 mm/16 mm) y **viñeta ligera**.
- Sensación: **cinematográfico, melancólico, orgánico, "pintura al óleo"**. Nunca saturado tipo redes sociales.

Paleta para Balcón del Zócalo: negro carbón `#0B0B0B`, blanco cálido `#F5F3EE`, ámbar `#B8741A`, musgo `#5C6B3C`, verde-teal apagado `#3F5F5A`, rojo acento único (como el de Netflix) para un solo detalle por escena.

## 7. Edición
- **Ritmo:** ~120 transiciones en 131 s → **1 corte por segundo** en el montaje central; al inicio y al cierre, tomas de 4–8 s. El contraste de ritmo es lo que da emoción.
- **Cortes principalmente directos**, con **fundido a negro** y **fundido a blanco** entre bloques (el blanco es parte de la identidad).
- **Corte por tema, no por acción**: la frase de voz en off conecta imágenes que no se tocan (paisaje → plato → manos).
- **J-cuts / L-cuts:** la voz entra antes de la imagen y sigue sobre la siguiente.
- **Voz en off de los propios chefs** (no locutor), en primera persona, tono confesional.
- **Subtítulos:** blanco, cursiva en negrita, centrados abajo, sin fondo. En el tráiler ocupan máx. 2 líneas, ~35 caracteres por línea.
- **Tipografía de cartelas:** sans-serif geométrica y fina, **mayúsculas con mucho tracking**, dos pesos (Light + Bold) en la misma línea ("CHEF'S **TABLE**"). Nombre del chef en mayúsculas + país en pequeño debajo.
- Transiciones: ninguna decorativa. Sin whooshes, sin luts de moda.

## 8. Aplicación al equipo de Balcón del Zócalo

| Persona | Cómo retratarla (estilo Chef's Table) |
|---|---|
| **Chef Pepe Salinas** | Protagonista/"historia madre". Entrevista a 2 cámaras, lente 85 mm f/1.8, contraluz de ventana. Frase de apertura: *su razón de cocinar*. Cartela con nombre grande. |
| **Chef Edgar** | Retrato de oficio: manos trabajando, macros de técnica, entrevista en su estación. |
| **Chef Ulises (jefe de cocina)** | **La línea**: plano a través de la ventana del pase, comandas colgadas, ritmo de servicio, tensión y disciplina. |
| **Lalo (gerente de servicio)** | El "otro lado de la mesa": servilleta, copa, mantel, pasos en sala vacía antes de abrir; planos desde detrás de una columna. |
| **Chino (jefe de barra)** | Hielo, humo, cítricos y destilados en slow-mo con luz ámbar rasante; fondo de botellas bokeh. |
| **Chef Checo (I+D)** | Laboratorio creativo: pruebas, errores, notas en papel, planos cenitales de prototipos, voz sobre la duda ("¿y si falla?"). Es el arco emocional "riesgo". |

### Locaciones/planos propios de Balcón del Zócalo
- **El Zócalo** como paisaje épico (equivalente a la nieve/montaña): plano general al amanecer, bandera, catedral, gente diminuta.
- Balcón al amanecer, luz dorada entrando; mesas vacías con una vela.
- Mercado/proveedores (equivalente al "ir al fin del mundo por el ingrediente").
- Fuego/brasas, comal, nixtamal, chiles, cacao: macros con luz ámbar.

### Preguntas tipo para entrevista (hacerlas sin cámara de por medio, mirada fuera de cuadro)
1. ¿Cuándo sentiste que ibas a perderlo todo?
2. ¿Qué plato te da miedo servir?
3. ¿A quién le debes lo que cocinas?
4. ¿Qué no entendías de este oficio cuando empezaste?

## 9. Pendiente / lo que necesito para completar
- **Audio:** el archivo no trae sonido. Si me das la versión con audio o el enlace de YouTube, extraigo música (BPM, instrumentos, dinámica), voces y mezcla. Sin eso la guía sonora es sólo recomendación general: piano minimal / cuerdas suaves, silencios largos, ambiente real (cuchillo, fuego, pasos).
- Qué entregable quieres primero: tráiler de 1:30, reel vertical 9:16 o episodios por chef.
- Equipo de cámara disponible (para ajustar lentes, luz y LUT).
