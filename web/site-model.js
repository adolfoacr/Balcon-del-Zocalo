import { tableImage, chefImage, brandImage } from './images.js';
import { photos } from './photos.js';
export const clone = value => structuredClone(value);
export const iconNames = ['none','sparkles','book','utensils','news','heart','link','home','image','mail','pin','search','people','sprout','cycle','cube','flask','doc'];
export function safeHref(value, fallback='#noticias') {
  if (typeof value !== 'string') return fallback;
  if (/^#[a-z][a-z0-9-]*$/.test(value)) return value;
  if (/^mailto:[^\s<>]+@[^\s<>]+$/.test(value) || /^tel:\+?[\d ()-]+$/.test(value)) return value;
  try { const url=new URL(value); if (url.protocol==='https:' && !url.username && !url.password) return url.href; } catch {}
  return fallback;
}
export function imageURL(value, fallback='') {
  if (value==='@table') return tableImage;
  if (value==='@chef') return chefImage;
  if (value==='@brand') return brandImage;
  if (typeof value==='string' && value[0]==='@' && photos[value.slice(1)]) return photos[value.slice(1)];
  if (typeof value==='string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value) && value.length < 4000000) return value;
  const url=safeHref(value,''); return url.startsWith('https:') ? url : fallback;
}
export function defaultBookHighlights(){return {heroImage:'@notebook',cards:'Lector de PDF | Consulta páginas reales directamente en la web app. | ▤\nNavegación sencilla | Avanza entre páginas y ajusta la visualización. | ↔\nContenido auténtico | Sin capítulos ficticios; el contenido llegará con el documento autorizado. | ◎',cardsEyebrow:'Una experiencia de lectura',cardsTitle:'El archivo de conocimiento, página a página.',cardsHint:'Diseño de la experiencia de consulta',highlightsEyebrow:'Capítulos destacados',highlightsTitle:'Explora algunos de nuestros temas.',highlightsText:'',highlights:'',readLabel:'Abrir lector',moreLabel:'Leer más',pending:'El libro oficial se integrará cuando esté disponible',statusEyebrow:'Estado del libro',statusTitle:'El espacio está preparado. El contenido, pendiente.',statusButton:'Ir al lector',statusImage:'@still'};}
export function defaultWorkPage() {return {heroImage:'@team',ctaImage:'@chef-tasting',typesTitle:'Tipos de trabajos que puedes compartir',typesHint:'Explora algunas categorías. Tu trabajo puede cruzar varias de ellas.',types:'',stepsEyebrow:'Cómo funciona',stepsTitle:'Tres pasos para conectar ideas con la cocina.',stepsHint:'Un proceso claro, desde la propuesta hasta la posible colaboración.',steps:'01 / Comparte | Tu investigación | Describe la propuesta y comparte sus fundamentos, procesos y evidencias.\n02 / Revisión | Evaluación de Checo | Checo puede revisar las propuestas recibidas y valorar su potencial.\n03 / Posible colaboración | Una respuesta privada | Si tu trabajo es seleccionado, podrás consultar su respuesta en tu cuenta.',note:'La revisión de propuestas y las respuestas de Checo son privadas.',ctaEyebrow:'La siguiente idea puede ser tuya',ctaTitle:'Haz que tu investigación llegue a la cocina.',ctaText:'Las participaciones públicas podrán consultarse en el laboratorio.',ctaButton:'Compartir mi trabajo',footnote:'Enviar una propuesta no garantiza su selección. Las participaciones privadas permanecen restringidas.',galleryMedia:{},eyebrow:'Laboratorio abierto · I+D',title:'Comparte tu trabajo',description:'Una idea puede convertirse en una nueva ruta de investigación. Comparte tus procesos, hallazgos y desarrollos con el laboratorio.',galleryEyebrow:'Laboratorio del Balcón',galleryTitle:'Investigación y desarrollo',galleryDescription:'Investigaciones, procesos y aprovechamientos compartidos por la comunidad. Un espacio para observar, experimentar y conectar ideas con el chef Checo.',invitation:'Comparte tu investigación o desarrollo con el área de I+D. Checo revisará las propuestas y podrá seleccionar investigaciones para explorar una colaboración contigo. Enviar tu trabajo no garantiza una selección.'};}
export function defaultNewsPage(){return {image:'',eyebrow:'Bitácora · Actualidad del laboratorio',title:'Noticias y hallazgos',description:'Procesos, aprendizajes e ideas que hacen visible el trabajo de investigación, desarrollo, diseño y aprovechamientos.',hint:'Una ventana a lo que ocurre detrás de cada prueba.',listEyebrow:'Líneas de contenido',listTitle:'Lo que merece ser documentado',listHint:'Ejemplos editoriales · No son noticias publicadas',featuredTag:'Archivo visual / Destacado',footnote:'El contenido definitivo se publicará solo con notas y evidencias verificadas por el equipo.'};}
export function defaultLabHome(){return {showLab:false,heroTags:'Observar\nExperimentar\nAprovechar',heroBadge:'Archivo visual · I+D',shortcutsEyebrow:'Explora el conocimiento',shortcutsHint:'Tres formas de descubrir el trabajo del laboratorio',bookBanner:{eyebrow:'Aprovechamiento · Fermentos',title:'Cerveza de pan',text:'El pan que sobra también tiene una segunda vida. Conoce esta prueba de aprovechamiento del laboratorio.',buttonLabel:'Conocer más',link:'#novedades',image:'@ferment-space'},purpose:{eyebrow:'Una cultura de aprovechamiento',title:'Investigar lo que otros dejarían atrás.',text:'Documentar una prueba es preservar una idea. Compartir un hallazgo es abrir nuevas rutas para aprovechar mejor lo que ya tenemos.',tags:''},labMedia:{},chefMedia:{},labTitle:'Cada ingrediente, una posibilidad.',labDescription:'Un espacio dedicado a la investigación, el desarrollo y los aprovechamientos del chef Checo en Balcón del Zócalo.',methodOneTitle:'Investigar',methodOneText:'Observar los ingredientes, hacer preguntas y documentar el proceso.',methodTwoTitle:'Aprovechar',methodTwoText:'Explorar nuevas posibilidades para cada ingrediente y cada parte.',methodThreeTitle:'Desarrollar',methodThreeText:'Convertir las pruebas y los hallazgos en conocimiento para nuestra cocina.',labEyebrow:'Área de investigación y desarrollo',labButtonLabel:'Explorar investigaciones',labButtonLink:'#comparte',chefEyebrow:'El trabajo del chef Checo',chefTitle:'Una idea. Muchas posibilidades.',chefDescription:'Un espacio propio para las investigaciones, los desarrollos y los aprovechamientos del chef Checo. Procesos y recetas que documentan su trabajo en la cocina.',chefImage:'@chef',chefButtonLabel:'Explorar su recetario',chefButtonLink:'#recetario'};}
export function defaultLocation(){return {title:'Encuéntranos en el corazón de la ciudad',address:'Av. 5 de Mayo 61, Centro Histórico, Ciudad de México',query:'Balcón del Zócalo, Av. 5 de Mayo 61, Ciudad de México',buttonLabel:'Cómo llegar',image:''};}

// Replaces the original sample content with the editorial design's copy and photos, but only where the
// text is still exactly the original: anything an administrator has edited is left alone.
const sampleNotes=[
 {id:'note-destacado',title:'Del ingrediente al proceso: aprovechar también es investigar.',kind:'Destacado',excerpt:'Los frascos, pruebas y registros permiten mostrar cómo una observación se convierte en conocimiento útil para la cocina.',image:'@jars',buttonLabel:'Explorar el laboratorio'},
 {id:'note-fermentos',title:'Fermentos y conservas',kind:'Aprovechamiento',excerpt:'Cómo documentar el uso integral de ingredientes y sus transformaciones.',image:'@ferment-space'},
 {id:'note-pruebas',title:'Registro de pruebas',kind:'Investigación',excerpt:'Experimentos, observaciones y resultados: aprendizaje a partir del proceso.',image:'@tests'},
 {id:'note-diseno',title:'Probar nuevas posibilidades',kind:'Diseño y desarrollo',excerpt:'Documentación visual de materiales, técnicas y prototipos culinarios.',image:'@drying'}
].map(item=>({body:'Contenido de muestra. Edita o reemplaza esta nota desde el panel de administración.',icon:'news',buttonLabel:'Ver línea de contenido',verification:'demo',source:'Texto de muestra del diseño; no es un anuncio del restaurante.',sourceURL:null,date:null,...item}));
const sameText=(value,original)=>String(value??'')===original;
function editorialUpgrade(site){
 if(site.editorialDesign)return site;
 site.editorialDesign=1;
 const h=site.home,a=site.appearance;
 if(a){if(['#1c1c1b','#10100e'].includes(a.background))a.background='#161716';if(a.accent==='#c7ac72')a.accent='#c8ab6b';if(a.text==='#f6f3ed')a.text='#f5f2ea';if(a.width===1160)a.width=1440;}
 if(site.brand&&sameText(site.brand.subtitle,'Investigación y desarrollo'))site.brand.subtitle='Investigación · Desarrollo · Diseño';
 if(Array.isArray(h.slides)&&h.slides.length===2&&h.slides[0].id==='chef'&&h.slides[1].id==='table')h.slides=[{id:'chef',image:'@chef-jars',alt:'El chef Checo frente a los frascos del laboratorio',focus:'right'},{id:'table',image:'@chef-tasting',alt:'El chef Checo probando una preparación',focus:'right'},{id:'dish',image:'@team',alt:'El equipo de cocina seleccionando hierbas',focus:'center'}];
 const original=sameText(h.title,'El origen de\nlo que sigue.')&&sameText(h.buttonLabel,'Explorar el recetario');
 if(sameText(h.eyebrow,'Balcón del Zócalo · Investigación y desarrollo'))h.eyebrow='El laboratorio del Balcón';
 if(sameText(h.title,'El origen de\nlo que sigue.'))h.title='La cocina también\nse investiga.';
 if(sameText(h.description,'Ideas, procesos y aprovechamientos.\nLa cocina del chef Checo, en evolución.'))h.description='Hacemos visibles los procesos, las pruebas y los aprovechamientos que transforman ingredientes en nuevas posibilidades.';
 if(original){h.buttonLabel='Explorar investigaciones';h.buttonLink='#comparte';if(!h.secondaryLabel)h.secondaryLabel='Ver recetario';h.secondaryLink='#recetario';}
 if(Array.isArray(h.sectionOrder)&&h.sectionOrder.join()==='welcome,news,shortcuts')h.sectionOrder=['shortcuts','welcome','news'];
 const cards={'lab-recipes':['Recetario y aprovechamientos',{label:'Del descarte al descubrimiento',tag:'01 / Aprovechamientos',text:'Fermentos, conservas e ingredientes reimaginados.',cta:'Conocer más',link:'#recetario',icon:'none',image:'@ferment'}],'lab-community':['Investigación de la comunidad',{label:'Procesos que dejan huella',tag:'02 / I+D',text:'Una mirada al trabajo real de investigación y desarrollo.',cta:'Ver investigaciones',link:'#novedades',icon:'none',image:'@team'}],'lab-book':['El archivo del Balcón',{label:'El conocimiento se comparte',tag:'03 / Comunidad',text:'Tus ideas e investigaciones también tienen lugar aquí.',cta:'Compartir mi trabajo',link:'#comparte',icon:'none',image:'@notebook'}]};
 for(const item of site.shortcuts||[]){const rule=cards[item.id];if(rule&&!item.text&&sameText(item.label,rule[0]))Object.assign(item,rule[1]);}
 const r=site.recipePage;
 if(r){if(sameText(r.eyebrow,'Archivo de cocina · Chef Checo'))r.eyebrow='Archivo gastronómico · Laboratorio';if(sameText(r.title,'Recetario y aprovechamientos.'))r.title='Recetario y aprovechamientos';if(sameText(r.description,'Ingredientes, técnicas y procesos para seguir explorando. Descubre las fichas de cocina y guarda tus favoritas.'))r.description='Ingredientes, técnicas y procesos que conectan la investigación con la cocina. Fichas para consultar, aprender y seguir explorando.';if(!r.image)r.image='@shelves';Object.assign(r,{note:'Contenido de muestra · Las imágenes documentales no representan necesariamente las recetas.',bannerImage:'@ferment',bannerEyebrow:'Conexión con I+D',bannerTitle:'Detrás de cada ingrediente hay un proceso.',bannerText:'Conoce los materiales, las técnicas y las pruebas detrás del aprovechamiento culinario.',bannerButton:'Explorar I+D',bannerLink:'#novedades',...r});}
 const b=site.bookPage;
 if(b){if(sameText(b.title,'Historias para saborear.'))b.title='Un lugar para conservar lo aprendido.';if(sameText(b.description,'El siguiente capítulo lo compartes tú.'))b.description='El conocimiento también se documenta: ingredientes, decisiones, técnicas y procesos que construyen la memoria del laboratorio.';}
 const w=site.workPage;
 if(w&&sameText(w.description,'Investigar, desarrollar y compartir: nuevas posibilidades para la cocina del Balcón del Zócalo.'))w.description='Una idea puede convertirse en una nueva ruta de investigación. Comparte tus procesos, hallazgos y desarrollos con el laboratorio.';
 if(Array.isArray(site.news)&&site.news.length===2&&site.news.every(item=>item.verification==='demo')&&site.news.map(item=>item.id).join()==='pilot-experience,pilot-book')site.news=clone(sampleNotes);
 return site;
}
// Second pass: the home banner ("Cerveza de pan") for documents that were already upgraded without it.
function featureBannerUpgrade(site){
 if(site.featureBanner)return site;
 site.featureBanner=1;
 const bb=site.home.bookBanner;
 if(!bb||!String(bb.title||'').trim())site.home.bookBanner=clone(defaultLabHome().bookBanner);
 return site;
}
export function createSiteDocument(seed) {return featureBannerUpgrade(editorialUpgrade(createBaseDocument(seed)));}
function createBaseDocument(seed) {
  if (seed?.cmsVersion===1) {const result=clone(seed); result.home={carouselTextMode:'shared',carouselPresentation:'overlay',...defaultLabHome(),...result.home};result.home.labMedia||={};result.home.chefMedia||={};result.bookPage.coverMedia||={};result.workPage.galleryMedia||={};result.brand.titleMode ||= 'text';result.recipeMenus ||= []; result.deletedSections ||= []; result.location ||= defaultLocation(); result.elementOverrides ||= {}; result.workPage={...defaultWorkPage(),...result.workPage}; result.sectionBlocks ||= {}; for(const id of ['noticias','novedades','recetario','libro','comparte'])result.sectionBlocks[id] ||= []; result.newsPage={...defaultNewsPage(),...result.newsPage}; result.bookPage={...defaultBookHighlights(),...result.bookPage}; {const home=result.navigation.find(item=>item.id==='noticias');if(home&&home.label==='Noticias')home.label='Inicio';} if(!result.deletedSections.includes('novedades')&&!result.navigation.some(item=>item.id==='novedades'))result.navigation.push({id:'novedades',label:'Noticias',icon:'none',visible:true}); if(!result.deletedSections.includes('comparte')&&!result.navigation.some(item=>item.id==='comparte'))result.navigation.push({id:'comparte',label:'Comparte tu trabajo',icon:'none',visible:true}); if(result.home.image&&result.home.slides?.length){result.home.slides[0].image=result.home.image;delete result.home.image;}
    for(const[key,value]of Object.entries(result.elementOverrides))if(value.image&&key==='page-noticias:section-home-hero'&&result.home.slides?.length){result.home.slides[0].image=value.image;delete value.image;}
    for(const block of [...Object.values(result.sectionBlocks).flat(),...result.pages.flatMap(page=>page.blocks)])if(block.type==='carousel'){block.presentation||='split';block.textMode||='shared';}
    return result;}
  return {
    cmsVersion:1, schemaVersion:1, restaurantName:seed.restaurantName || 'Balcón del Zócalo',
    appearance:{background:'#161716',text:'#f5f2ea',accent:'#c8ab6b',muted:'#b6b4ac',font:'Questrial',width:1440,density:'comfortable'},
    brand:{titleMode:'text',logo:'@brand',location:'CIUDAD DE MÉXICO',subtitle:'Investigación · Desarrollo · Diseño',footer:'Investigar. Aprovechar. Crear.',badge:''},
    home:{carouselTextMode:'shared',carouselPresentation:'overlay',...defaultLabHome(),eyebrow:'Balcón del Zócalo · Investigación y desarrollo',title:'El origen de\nlo que sigue.',description:'Ideas, procesos y aprovechamientos.\nLa cocina del chef Checo, en evolución.',buttonLabel:'Explorar el recetario',buttonLink:'#recetario',buttonIcon:'link',secondaryLabel:'',secondaryLink:'#recetario',welcomeTitle:'Investigar. Aprovechar. Crear.',welcomeText:'El laboratorio de nuestra cocina.',newsTitle:'Bitácora del Balcón',newsEyebrow:'Procesos · Ideas · Hallazgos',newsSubtitle:'Noticias del área de I+D',interval:3000,autoplay:true,alignment:'left',newsLayout:'carousel',sectionOrder:['welcome','news','shortcuts'],slides:[{id:'chef',image:'@chef',alt:'El chef junto a la vista de la ciudad',focus:'right'},{id:'table',image:'@table',alt:'Mesa del chef en Balcón del Zócalo',focus:'center'}]},
    recipeMenus:[],recipePage:{eyebrow:'Archivo de cocina · Chef Checo',title:'Recetario y aprovechamientos.',description:'Ingredientes, técnicas y procesos para seguir explorando. Descubre las fichas de cocina y guarda tus favoritas.',layout:'grid'},
    bookPage:{...defaultBookHighlights(),coverMedia:{},title:'Historias para saborear.',description:'El siguiente capítulo lo compartes tú.',heading:'Un lugar para cada página.',body:'Cuando compartas el libro, podrás recorrerlo aquí. Por ahora, prueba el lector con un PDF que tengas permiso de usar.',buttonLabel:'Cargar un PDF',cover:'',pdfURL:''},
    location:defaultLocation(),elementOverrides:{},workPage:defaultWorkPage(),newsPage:defaultNewsPage(),sectionBlocks:{noticias:[],novedades:[],recetario:[],libro:[],comparte:[]},navigation:[{id:'noticias',label:'Inicio',icon:'none',visible:true},{id:'recetario',label:'Recetario',icon:'none',visible:true},{id:'libro',label:'Nuestro libro',icon:'none',visible:true},{id:'comparte',label:'Comparte tu trabajo',icon:'none',visible:true},{id:'novedades',label:'Noticias',icon:'none',visible:true}],pages:[],shortcuts:[{id:'lab-recipes',label:'Recetario y aprovechamientos',link:'#recetario',icon:'utensils'},{id:'lab-community',label:'Investigación de la comunidad',link:'#comparte',icon:'sparkles'},{id:'lab-book',label:'El archivo del Balcón',link:'#libro',icon:'book'}],
    news:clone(seed.news).map((item,i)=>({...item,image:i?'@table':'@chef',icon:'news',buttonLabel:'Leer más'})),
    recipes:clone(seed.recipes).map(item=>({...item,image:'',icon:'utensils',buttonLabel:'Ver ingredientes'})),
    book:clone(seed.book)
  };
}
export function validateSiteDocument(site) {
  if (!site || site.cmsVersion!==1 || !site.home || !site.appearance || !site.brand || !site.recipePage || !site.bookPage) throw new Error('El archivo no tiene el formato del editor.');
  for (const [key,max] of [['news',100],['recipes',100],['recipeMenus',30],['navigation',20],['pages',20],['shortcuts',30]]) {
    if (!Array.isArray(site[key]) || site[key].length>max) throw new Error(`Revisa la cantidad de elementos en ${key}.`);
    const ids=new Set();
    for (const item of site[key]) {
      if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.id || '') || ids.has(item.id)) throw new Error('Cada elemento necesita un identificador único.');
      ids.add(item.id);
    }
  }
  if(site.brand.titleMode&&!['text','image','both'].includes(site.brand.titleMode))throw new Error('Elige texto, imagen o ambos para el título.');
  const a=site.appearance;
  if (['background','text','accent','muted'].some(key=>!/^#[\da-f]{6}$/i.test(a[key]))) throw new Error('Selecciona colores válidos.');
  if (!['Questrial','system-ui','Georgia'].includes(a.font) || !['comfortable','compact'].includes(a.density) || !Number.isFinite(a.width) || a.width<760 || a.width>1440) throw new Error('Revisa las opciones de diseño.');
  if(site.deletedSections&&(!Array.isArray(site.deletedSections)||site.deletedSections.length>100||site.deletedSections.some(id=>!/^[-a-z0-9]{1,80}$/.test(id))))throw new Error('Revisa las secciones eliminadas.');
  const pageIds=new Set(['noticias','novedades','recetario','libro','comparte',...site.pages.map(p=>p.id)]);
  if (site.navigation.some(item=>!pageIds.has(item.id) || !item.label?.trim())) throw new Error('Cada menú debe enlazar a una sección con nombre.');
  if (!Array.isArray(site.home.slides) || site.home.slides.length>20 || site.home.slides.some(slide=>!imageURL(slide.image) || !['left','center','right'].includes(slide.focus))) throw new Error('El carrusel admite hasta 20 imágenes.');
  if (!Number.isFinite(site.home.interval) || site.home.interval<2000 || site.home.interval>20000 || typeof site.home.autoplay!=='boolean') throw new Error('El intervalo debe estar entre 2 y 20 segundos.');
  if (site.recipePage.categories!==undefined&&(!Array.isArray(site.recipePage.categories)||site.recipePage.categories.length>30||site.recipePage.categories.some(name=>typeof name!=='string'||!name.trim()||name.length>40))) throw new Error('Revisa las categorías del recetario.');
  if (!['center','left'].includes(site.home.alignment) || !['carousel','grid','list'].includes(site.home.newsLayout) || !['grid','list'].includes(site.recipePage.layout)) throw new Error('Selecciona un acomodo válido.');
  if (!Array.isArray(site.home.sectionOrder) || site.home.sectionOrder.length!==3 || new Set(site.home.sectionOrder).size!==3 || site.home.sectionOrder.some(x=>!['welcome','news','shortcuts'].includes(x))) throw new Error('Revisa el orden de las secciones.');
  for (const item of site.recipes) {
    if (!item.name?.trim() || !item.category?.trim() || !Array.isArray(item.ingredients) || !Array.isArray(item.steps)) throw new Error('Cada receta necesita nombre, categoría y listas de ingredientes y preparación.');
    if(item.menuIds && (!Array.isArray(item.menuIds)||item.menuIds.some(id=>!site.recipeMenus.some(menu=>menu.id===id))))throw new Error('Selecciona menús existentes para cada receta.');
  }
  for(const menu of site.recipeMenus)if(!menu.name?.trim())throw new Error('Cada menú del recetario necesita un nombre.');
  for (const item of site.news) if (!item.title?.trim()) throw new Error('Cada noticia necesita un título.');
  for (const list of Object.values(site.sectionBlocks || {})) if (!Array.isArray(list) || list.length>30) throw new Error('Cada sección admite hasta 30 elementos.');
  for (const page of site.pages) if (!page.title?.trim() || !Array.isArray(page.blocks) || page.blocks.length>30) throw new Error('Revisa el nombre y los bloques de cada menú.');
  const blockIds=new Set();
  for (const block of [...Object.values(site.sectionBlocks || {}).flat(),...site.pages.flatMap(page=>page.blocks)]) {
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(block.id || '') || blockIds.has(block.id))throw new Error('Cada elemento necesita un identificador único.');blockIds.add(block.id);
    if(block.type==='carousel' && (!Number.isFinite(block.interval) || block.interval<2000 || block.interval>20000))throw new Error('El intervalo debe estar entre 2 y 20 segundos.');
    if (!['banner','carousel','image','text','title','button','shortcut','group'].includes(block.type || 'text')) throw new Error('Elige un tipo de elemento válido.');
    if (block.type==='carousel' && (!Array.isArray(block.slides) || block.slides.length>20 || block.slides.some(x=>!imageURL(x.image)))) throw new Error('El carrusel admite hasta 20 imágenes.');
  }
  if(site.elementOverrides && (Array.isArray(site.elementOverrides)||typeof site.elementOverrides!=='object'||Object.keys(site.elementOverrides).length>500))throw new Error('Revisa los elementos del editor.');
  for(const [key,item]of Object.entries(site.elementOverrides||{})){
    if(!/^[a-z0-9:._-]{1,300}$/i.test(key)||!item||typeof item!=='object')throw new Error('El elemento no tiene un identificador válido.');
    if(['color','backgroundColor','borderColor'].some(k=>item[k]&&!/^#[a-f0-9]{6}$/i.test(item[k])))throw new Error('Usa colores hexadecimales de seis dígitos.');
    if(item.size && (!Number.isFinite(item.size)||item.size<10||item.size>100))throw new Error('El tamaño de texto debe estar entre 10 y 100 px.');
    if(item.locked!==undefined&&typeof item.locked!=='boolean')throw new Error('Revisa el candado del elemento.');
    if(item.centered!==undefined&&typeof item.centered!=='boolean')throw new Error('Revisa el centrado del elemento.');
    if(item.align && !['left','center','right'].includes(item.align))throw new Error('Elige una alineación válida.');
    if(item.icon && !iconNames.includes(item.icon))throw new Error('Elige un icono disponible.');
    if(item.removed!==undefined&&typeof item.removed!=='boolean')throw new Error('Revisa los elementos eliminados.');
    if(item.positions){if(typeof item.positions!=='object'||Array.isArray(item.positions))throw new Error('Revisa las posiciones del elemento.');for(const[screen,pos]of Object.entries(item.positions)){if(!['phone','tablet','desktop'].includes(screen)||!pos||typeof pos.container!=='string'||!/^[a-z0-9:._-]{1,300}$/i.test(pos.container)||!Number.isFinite(pos.x)||pos.x<-1||pos.x>1||!Number.isFinite(pos.y)||pos.y<0||pos.y>50000||!Number.isFinite(pos.width)||pos.width<=0||pos.width>1)throw new Error('Revisa la posición libre del elemento.');}}
    if(item.placement && [item.placement.container,item.placement.before].some(k=>typeof k!=='string'||!/^[a-z0-9:._-]{1,300}$/i.test(k)))throw new Error('Revisa el destino del elemento.');
  }
  const walk=(value,key='')=>{
    if (typeof value==='string') {
      if (value.length>20000 && !value.startsWith('data:image/')) throw new Error('Un texto excede el límite de 20.000 caracteres.');
      if ((['image','cover','logo'].includes(key)||key.endsWith('Image')) && value && !imageURL(value)) throw new Error('Las imágenes necesitan una dirección HTTPS válida.');
      if ((['link','buttonLink','pdfURL'].includes(key)||key.endsWith('ButtonLink')) && value && !safeHref(value,'')) throw new Error('Usa enlaces HTTPS, correo, teléfono o una sección de la app.');
      if (key==='pdfURL' && value && !value.startsWith('https:')) throw new Error('El libro publicado necesita una dirección HTTPS.');
    } else if (Array.isArray(value)) value.forEach(v=>walk(v,key));
    else if (value && typeof value==='object') {for(const [name,limit] of [['moduleWidth',100],['moduleHeight',2000],['moduleOffset',100]])if(value[name]!=null&&(!Number.isFinite(value[name])||value[name]<0||value[name]>limit))throw new Error('Revisa las dimensiones del módulo.');if(value.moduleScreen&&!['phone','tablet','desktop'].includes(value.moduleScreen))throw new Error('Revisa la pantalla del módulo.');if(value.imageAlign&&!['left','center','right'].includes(value.imageAlign))throw new Error('Elige una ubicación válida para la imagen.');if(value.textMode&&!['shared','individual'].includes(value.textMode))throw new Error('Elige textos compartidos o por imagen.');if(value.presentation&&!['split','overlay'].includes(value.presentation))throw new Error('Elige un diseño de carrusel válido.');for(const field of ['imageWidth','imageHeight','imageFocusX','imageFocusY'])if(value[field]!==undefined&&value[field]!==null&&(!Number.isFinite(value[field])||value[field]<(field.startsWith('imageFocus')?0:1)||value[field]>(field==='imageHeight'?2000:100)))throw new Error('Revisa el tamaño o encuadre de la imagen.');if(value.imageFit&&!['cover','contain'].includes(value.imageFit))throw new Error('Selecciona un ajuste de imagen válido.');Object.entries(value).forEach(([k,v])=>walk(v,k));}
  };
  walk(site);
  if (JSON.stringify(site).length>4000000) throw new Error('El contenido supera los 4 MB. Usa imágenes cargadas en la biblioteca.');
  return site;
}
const paths={sparkles:'m10 1 2.5 6.5L19 10l-6.5 2.5L10 19l-2.5-6.5L1 10l6.5-2.5z',book:'M2 3h6q2 0 2 2v13q-1-2-3-2H2zM18 3h-6q-2 0-2 2v13q1-2 3-2h5z',utensils:'M4 2v6q0 2 2 2v8M8 2v6q0 2-2 2M6 2v6M15 2q-3 4-3 8h4V2v16',news:'M3 2h14v16H3zM6 6h8M6 10h8M6 14h5',heart:'M10 17 3 10C-1 5 5 0 10 5c5-5 11 0 7 5z',link:'M4 16 16 4M4 4h12v12',home:'m2 9 8-7 8 7M4 8v10h12V8M8 18v-6h4v6',image:'M2 3h16v14H2zM3 14l5-5 4 4 3-3 3 4M13 6h1',mail:'M2 4h16v12H2zM2 4l8 7 8-7',pin:'M10 19s7-7 7-11A7 7 0 0 0 3 8c0 4 7 11 7 11zM8 8a2 2 0 1 0 4 0 2 2 0 1 0-4 0',search:'M8.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM13 13l4.5 4.5',people:'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 16c0-3 2-5 5-5s5 2 5 5M14 8a2 2 0 1 0 0-4M14 11c2.5 0 4 1.8 4 4.5',sprout:'M10 17V9M10 9C10 5.5 7.5 3.5 4 3.5 4 7 6 9 10 9M10 11c0-3 2-5 6-5 0 3.500-2.500 5-6 5',cycle:'M16 8a6.500 6.500 0 0 0-11-2.500L3 8M3 3v5h5M4 12a6.500 6.500 0 0 0 11 2.500L17 12M17 17v-5h-5',cube:'M10 2 17 6v8l-7 4-7-4V6zM3 6l7 4 7-4M10 10v8',flask:'M8 2h4M9 2v5l-5 9a1 1 0 0 0 .9 1.500h10.200a1 1 0 0 0 .9-1.500l-5-9V2M6 12h8',doc:'M5 2h7l4 4v12H5zM12 2v4h4M8 10h5M8 13h5'};
export function iconMarkup(name, className='inline-icon') {
  if (!paths[name]) return '';
  return `<svg class="${className}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="${paths[name]}" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export function pencilMarkup(panel,id='') {
  return `<button class="edit-pencil" type="button" data-edit-panel="${panel}" data-edit-id="${id}" aria-label="Editar ${{workPage:"presentación de Comparte tu trabajo",newsPage:"encabezado de Noticias",homeBook:"banner de Nuestro libro",homePurpose:"Una cocina con propósito",home:"portada",news:"noticias",recipes:"recetario",pages:"menús",blocks:"bloque",shortcuts:"accesos directos",appearance:"diseño",book:"libro"}[panel] || panel}"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m3 14-1 4 4-1L17 6l-4-4zM11 4l4 4" stroke="currentColor" stroke-width="1.4"/></svg></button>`;
}

export function sectionBlocks(site,id) {return site.pages.find(page=>page.id===id)?.blocks || site.sectionBlocks?.[id] || []; }
