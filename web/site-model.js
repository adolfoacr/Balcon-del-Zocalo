import { tableImage, chefImage, brandImage } from './images.js';
export const clone = value => structuredClone(value);
export const iconNames = ['none','sparkles','book','utensils','news','heart','link','home','image','mail','pin'];
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
  if (typeof value==='string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value) && value.length < 4000000) return value;
  const url=safeHref(value,''); return url.startsWith('https:') ? url : fallback;
}
export function defaultWorkPage() {return {eyebrow:'Laboratorio abierto · I+D',title:'Comparte tu trabajo',description:'Investigar, desarrollar y compartir: nuevas posibilidades para la cocina del Balcón del Zócalo.',galleryEyebrow:'Laboratorio del Balcón',galleryTitle:'Investigación y desarrollo',galleryDescription:'Investigaciones, procesos y aprovechamientos compartidos por la comunidad. Un espacio para observar, experimentar y conectar ideas con el chef Checo.',invitation:'Comparte tu investigación o desarrollo con el área de I+D. Checo revisará las propuestas y podrá seleccionar investigaciones para explorar una colaboración contigo. Enviar tu trabajo no garantiza una selección.'};}
export function defaultLabHome(){return {labTitle:'Cada ingrediente, una posibilidad.',labDescription:'Un espacio dedicado a la investigación, el desarrollo y los aprovechamientos del chef Checo en Balcón del Zócalo.',methodOneTitle:'Investigar',methodOneText:'Observar los ingredientes, hacer preguntas y documentar el proceso.',methodTwoTitle:'Aprovechar',methodTwoText:'Explorar nuevas posibilidades para cada ingrediente y cada parte.',methodThreeTitle:'Desarrollar',methodThreeText:'Convertir las pruebas y los hallazgos en conocimiento para nuestra cocina.',labEyebrow:'Área de investigación y desarrollo',labButtonLabel:'Explorar investigaciones',labButtonLink:'#comparte',chefEyebrow:'El trabajo del chef Checo',chefTitle:'Una idea. Muchas posibilidades.',chefDescription:'Un espacio propio para las investigaciones, los desarrollos y los aprovechamientos del chef Checo. Procesos y recetas que documentan su trabajo en la cocina.',chefImage:'@chef',chefButtonLabel:'Explorar su recetario',chefButtonLink:'#recetario'};}
export function defaultLocation(){return {title:'Encuéntranos en el corazón de la ciudad',address:'Av. 5 de Mayo 61, Centro Histórico, Ciudad de México',query:'Balcón del Zócalo, Av. 5 de Mayo 61, Ciudad de México',buttonLabel:'Cómo llegar',image:''};}
export function createSiteDocument(seed) {
  if (seed?.cmsVersion===1) {const result=clone(seed); result.home={...defaultLabHome(),...result.home};result.recipeMenus ||= []; result.location ||= defaultLocation(); result.elementOverrides ||= {}; result.workPage={...defaultWorkPage(),...result.workPage}; result.sectionBlocks ||= {}; for(const id of ['noticias','recetario','libro','comparte'])result.sectionBlocks[id] ||= []; if(!result.navigation.some(item=>item.id==='comparte'))result.navigation.push({id:'comparte',label:'Comparte tu trabajo',icon:'none',visible:true}); return result;}
  return {
    cmsVersion:1, schemaVersion:1, restaurantName:seed.restaurantName || 'Balcón del Zócalo',
    appearance:{background:'#1c1c1b',text:'#f6f3ed',accent:'#c7ac72',muted:'#b6b4ac',font:'Questrial',width:1160,density:'comfortable'},
    brand:{logo:'@brand',location:'CIUDAD DE MÉXICO',subtitle:'Investigación y desarrollo',footer:'Investigar. Aprovechar. Crear.',badge:'Piloto I+D'},
    home:{...defaultLabHome(),eyebrow:'Balcón del Zócalo · Investigación y desarrollo',title:'El origen de\nlo que sigue.',description:'Ideas, procesos y aprovechamientos.\nLa cocina del chef Checo, en evolución.',buttonLabel:'Explorar el recetario',buttonLink:'#recetario',buttonIcon:'link',welcomeTitle:'Investigar. Aprovechar. Crear.',welcomeText:'El laboratorio de nuestra cocina.',newsTitle:'Bitácora del Balcón',newsEyebrow:'Procesos · Ideas · Hallazgos',newsSubtitle:'Noticias del área de I+D',interval:3000,autoplay:true,alignment:'left',newsLayout:'carousel',sectionOrder:['welcome','news','shortcuts'],slides:[{id:'chef',image:'@chef',alt:'El chef junto a la vista de la ciudad',focus:'right'},{id:'table',image:'@table',alt:'Mesa del chef en Balcón del Zócalo',focus:'center'}]},
    recipeMenus:[],recipePage:{eyebrow:'Archivo de cocina · Chef Checo',title:'Recetario y aprovechamientos.',description:'Ingredientes, técnicas y procesos para seguir explorando. Descubre las fichas de cocina y guarda tus favoritas.',layout:'grid'},
    bookPage:{title:'Historias para saborear.',description:'El siguiente capítulo lo compartes tú.',heading:'Un lugar para cada página.',body:'Cuando compartas el libro, podrás recorrerlo aquí. Por ahora, prueba el lector con un PDF que tengas permiso de usar.',buttonLabel:'Cargar un PDF',cover:'',pdfURL:''},
    location:defaultLocation(),elementOverrides:{},workPage:defaultWorkPage(),sectionBlocks:{noticias:[],recetario:[],libro:[],comparte:[]},navigation:[{id:'noticias',label:'Noticias',icon:'none',visible:true},{id:'recetario',label:'Recetario',icon:'none',visible:true},{id:'libro',label:'Nuestro libro',icon:'none',visible:true},{id:'comparte',label:'Comparte tu trabajo',icon:'none',visible:true}],pages:[],shortcuts:[{id:'lab-recipes',label:'Recetario y aprovechamientos',link:'#recetario',icon:'utensils'},{id:'lab-community',label:'Investigación de la comunidad',link:'#comparte',icon:'sparkles'},{id:'lab-book',label:'El archivo del Balcón',link:'#libro',icon:'book'}],
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
  const a=site.appearance;
  if (['background','text','accent','muted'].some(key=>!/^#[\da-f]{6}$/i.test(a[key]))) throw new Error('Selecciona colores válidos.');
  if (!['Questrial','system-ui','Georgia'].includes(a.font) || !['comfortable','compact'].includes(a.density) || !Number.isFinite(a.width) || a.width<760 || a.width>1440) throw new Error('Revisa las opciones de diseño.');
  if (!site.navigation.some(item=>item.visible)) throw new Error('Conserva al menos una sección visible.');
  const pageIds=new Set(['noticias','recetario','libro','comparte',...site.pages.map(p=>p.id)]);
  if (site.navigation.some(item=>!pageIds.has(item.id) || !item.label?.trim())) throw new Error('Cada menú debe enlazar a una sección con nombre.');
  if (!Array.isArray(site.home.slides) || site.home.slides.length<1 || site.home.slides.length>20 || site.home.slides.some(slide=>!imageURL(slide.image) || !['left','center','right'].includes(slide.focus))) throw new Error('El carrusel necesita entre 1 y 20 imágenes.');
  if (!Number.isFinite(site.home.interval) || site.home.interval<2000 || site.home.interval>20000 || typeof site.home.autoplay!=='boolean') throw new Error('El intervalo debe estar entre 2 y 20 segundos.');
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
    if (!['banner','carousel','image','text','title','button','shortcut'].includes(block.type || 'text')) throw new Error('Elige un tipo de elemento válido.');
    if (block.type==='carousel' && (!Array.isArray(block.slides) || block.slides.length<1 || block.slides.length>20 || block.slides.some(x=>!imageURL(x.image)))) throw new Error('Añade entre 1 y 20 imágenes al carrusel.');
  }
  if(site.elementOverrides && (Array.isArray(site.elementOverrides)||typeof site.elementOverrides!=='object'||Object.keys(site.elementOverrides).length>500))throw new Error('Revisa los elementos del editor.');
  for(const [key,item]of Object.entries(site.elementOverrides||{})){
    if(!/^[a-z0-9:._-]{1,300}$/i.test(key)||!item||typeof item!=='object')throw new Error('El elemento no tiene un identificador válido.');
    if(['color','backgroundColor','borderColor'].some(k=>item[k]&&!/^#[a-f0-9]{6}$/i.test(item[k])))throw new Error('Usa colores hexadecimales de seis dígitos.');
    if(item.size && (!Number.isFinite(item.size)||item.size<10||item.size>100))throw new Error('El tamaño de texto debe estar entre 10 y 100 px.');
    if(item.align && !['left','center','right'].includes(item.align))throw new Error('Elige una alineación válida.');
    if(item.icon && !iconNames.includes(item.icon))throw new Error('Elige un icono disponible.');
    if(item.placement && [item.placement.container,item.placement.before].some(k=>typeof k!=='string'||!/^[a-z0-9:._-]{1,300}$/i.test(k)))throw new Error('Revisa el destino del elemento.');
  }
  const walk=(value,key='')=>{
    if (typeof value==='string') {
      if (value.length>20000 && !value.startsWith('data:image/')) throw new Error('Un texto excede el límite de 20.000 caracteres.');
      if ((['image','cover','logo'].includes(key)||key.endsWith('Image')) && value && !imageURL(value)) throw new Error('Las imágenes necesitan una dirección HTTPS válida.');
      if ((['link','buttonLink','pdfURL'].includes(key)||key.endsWith('ButtonLink')) && value && !safeHref(value,'')) throw new Error('Usa enlaces HTTPS, correo, teléfono o una sección de la app.');
      if (key==='pdfURL' && value && !value.startsWith('https:')) throw new Error('El libro publicado necesita una dirección HTTPS.');
    } else if (Array.isArray(value)) value.forEach(v=>walk(v,key));
    else if (value && typeof value==='object') Object.entries(value).forEach(([k,v])=>walk(v,k));
  };
  walk(site);
  if (JSON.stringify(site).length>4000000) throw new Error('El contenido supera los 4 MB. Usa imágenes cargadas en la biblioteca.');
  return site;
}
const paths={sparkles:'m10 1 2.5 6.5L19 10l-6.5 2.5L10 19l-2.5-6.5L1 10l6.5-2.5z',book:'M2 3h6q2 0 2 2v13q-1-2-3-2H2zM18 3h-6q-2 0-2 2v13q1-2 3-2h5z',utensils:'M4 2v6q0 2 2 2v8M8 2v6q0 2-2 2M6 2v6M15 2q-3 4-3 8h4V2v16',news:'M3 2h14v16H3zM6 6h8M6 10h8M6 14h5',heart:'M10 17 3 10C-1 5 5 0 10 5c5-5 11 0 7 5z',link:'M4 16 16 4M4 4h12v12',home:'m2 9 8-7 8 7M4 8v10h12V8M8 18v-6h4v6',image:'M2 3h16v14H2zM3 14l5-5 4 4 3-3 3 4M13 6h1',mail:'M2 4h16v12H2zM2 4l8 7 8-7',pin:'M10 19s7-7 7-11A7 7 0 0 0 3 8c0 4 7 11 7 11zM8 8a2 2 0 1 0 4 0 2 2 0 1 0-4 0'};
export function iconMarkup(name, className='inline-icon') {
  if (!paths[name]) return '';
  return `<svg class="${className}" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="${paths[name]}" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
export function pencilMarkup(panel,id='') {
  return `<button class="edit-pencil" type="button" data-edit-panel="${panel}" data-edit-id="${id}" aria-label="Editar ${{workPage:"presentación de Comparte tu trabajo",home:"portada",news:"noticias",recipes:"recetario",pages:"menús",blocks:"bloque",shortcuts:"accesos directos",appearance:"diseño",book:"libro"}[panel] || panel}"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m3 14-1 4 4-1L17 6l-4-4zM11 4l4 4" stroke="currentColor" stroke-width="1.4"/></svg></button>`;
}

export function sectionBlocks(site,id) {return site.pages.find(page=>page.id===id)?.blocks || site.sectionBlocks?.[id] || []; }
