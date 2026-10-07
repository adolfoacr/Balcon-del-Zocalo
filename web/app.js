import { mountCarousels } from "./carousel.js";
import { createSiteDocument, validateSiteDocument, imageURL, safeHref, iconMarkup, pencilMarkup } from "./site-model.js";
import {createWork} from "./work.js";
import { createAdmin } from "./admin.js";
import { SiteService } from "./service.js";
import { esc, newsMarkup, customPageMarkup, extraBlocksMarkup } from "./markup.js";
import { getPdfModule, pdfDocumentOptions } from "./pdf-runtime.js";
const main = document.querySelector('main');
const detail = document.querySelector('#detail-dialog');
const favoritesKey = 'balcon-favorites-v1';
let admin, work, uiReady=false;
let content, favorites = new Set(), category = 'Todos', query = '', book = null, bookName = '', currentPage = 1;
let renderTask, renderVersion = 0, toastTimer, bookBusy = false, dbPromise;
const documentTasks = new WeakMap();
let detailOpener;
let disposeCarousels = () => {};

const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const safeSource = item => item.sourceURL?.startsWith('https://') ? `<a href="${esc(item.sourceURL)}" target="_blank" rel="noopener noreferrer">Consultar fuente</a>` : '';
function dishArt(kind) {
  if(!['fideo','sope'].includes(kind))return '<svg viewBox="0 0 320 220" aria-hidden="true"><ellipse cx="160" cy="110" rx="117" ry="78" fill="#f7f4e7"/><ellipse cx="160" cy="110" rx="95" ry="58" fill="none" stroke="#bda77a" stroke-width="2"/><path d="M140 85v50M135 85v15q5 10 10 0V85M180 85v50m0-50q-15 10-10 30h10" fill="none" stroke="#786445" stroke-width="3"/></svg>';
  return `<svg viewBox="0 0 320 220" aria-hidden="true"><ellipse cx="160" cy="178" rx="111" ry="15" fill="#c0c4ad" opacity=".6"/><ellipse cx="160" cy="110" rx="117" ry="78" fill="#f7f4e7"/><ellipse cx="160" cy="110" rx="100" ry="64" fill="none" stroke="#d9d8c8" stroke-width="2"/>${kind === 'sope' ? '<ellipse cx="160" cy="111" rx="69" ry="44" fill="#707489"/><ellipse cx="160" cy="111" rx="56" ry="34" fill="#423f32"/><path d="M117 109q18-30 35-4t43-1M121 122q18-30 35-4t43-1" fill="none" stroke="#b95e36" stroke-width="13"/><path d="M141 84l11 34 15-30 9 33" stroke="#f0dec0" stroke-width="4" fill="none"/>' : '<ellipse cx="158" cy="112" rx="71" ry="40" fill="#b86833"/><path d="M106 105q18-25 37-3t39-1 24 5M104 120q18-25 37-3t39-1 24 5M111 130q16-19 29-1t34-1 21 0" fill="none" stroke="#dd9a50" stroke-width="5"/><path d="M138 88l19 26 19-30 10 22" fill="none" stroke="#815037" stroke-width="14"/>'}<path d="M184 87q24-29 27-8-16 22-27 8M133 88q-26-27-27-5 19 21 27 5" fill="#638664"/><circle cx="172" cy="122" r="3" fill="#f2e2b9"/><circle cx="148" cy="104" r="3" fill="#f2e2b9"/></svg>`;
}
function toast(message) { clearTimeout(toastTimer); const el = document.querySelector('#toast'); el.textContent = message; el.hidden = false; toastTimer = setTimeout(() => el.hidden = true, 3200); }
function persistFavorites() { try { localStorage.setItem(favoritesKey, JSON.stringify([...favorites])); } catch { toast('Favorito guardado durante esta visita; el navegador no permite conservarlo.'); } }
function favoriteButton(item) { const saved = favorites.has(item.id); return `<button class="favorite-button" data-favorite="${esc(item.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${esc(item.name)}">${saved ? '♥' : '♡'}</button>`; }
function openDetail(kind, id) {
  const item = (kind === 'recipe' ? content.recipes : content.news).find(x => x.id === id); if (!item) return;
  const html = kind === 'recipe' ? `<span class="eyebrow">${esc(item.category)} · Contenido de muestra</span><h2 id="detail-title">${esc(item.name)}</h2><p>${esc(item.description)}</p><h3>Ingredientes destacados</h3><ul>${item.ingredients.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${item.steps.length ? `<h3>Preparación</h3><ol>${item.steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="notice">La receta completa se añadirá cuando el restaurante comparta cantidades y preparación. Esta ficha no es una guía para cocinar.</p>'}${item.complexity ? `<p>Dificultad: ${esc(item.complexity)}</p>` : ''}${item.servings ? `<p>Porciones: ${item.servings}</p>` : ''}<button class="button" data-detail-favorite="${esc(item.id)}" aria-pressed="${favorites.has(item.id)}">${favorites.has(item.id) ? 'Quitar de favoritos' : 'Guardar en favoritos'}</button>` : `<span class="eyebrow">${esc(item.kind)}</span><h2 id="detail-title">${esc(item.title)}</h2><p>${esc(item.body)}</p>`;
  document.querySelector('#detail-content').innerHTML = html + `<div class="detail-source"><strong>Sobre este contenido</strong><p>${esc(item.source)}</p>${safeSource(item)}</div>`;
  detailOpener = document.activeElement;
  detail.showModal();
}
function renderNews() { main.innerHTML = newsMarkup(content,{editing:admin?.isAdmin}); }
function renderMenu() {
  main.innerHTML = `<header class="intro editable-block"><span class="eyebrow">${esc(content.recipePage.eyebrow)}</span><h1>${esc(content.recipePage.title)}</h1><p>${esc(content.recipePage.description)}</p>${admin?.isAdmin?pencilMarkup("recipePage"):""}</header><div class="menu-tools"><label class="search-label"><span aria-hidden="true">⌕</span><input type="search" id="search" placeholder="Buscar un plato o ingrediente" aria-label="Buscar un plato o ingrediente" value="${esc(query)}"></label><div class="filters" role="group" aria-label="Filtrar platos">${['Todos',...new Set(content.recipes.map(x => x.category)),'Favoritos'].map(x => `<button class="filter" data-category="${esc(x)}" aria-pressed="${category === x}">${esc(x)}</button>`).join('')}</div></div><p class="notice">Contenido gastronómico de muestra. Los ingredientes y la preparación completa se confirmarán con el restaurante.</p><p id="result-count" class="subtle" role="status" aria-live="polite"></p><section id="dish-list" class="cards" aria-label="Platos del recetario"></section>`;
  document.querySelector('#dish-list').style.marginTop = '20px';
  document.querySelector("#dish-list").classList.toggle("layout-list",content.recipePage.layout==="list");
  renderDishes();
}
function renderDishes() {
  const filtered = content.recipes.filter(item => (category === 'Todos' || (category === 'Favoritos' ? favorites.has(item.id) : item.category === category)) && normalize([item.name,...item.ingredients].join(' ')).includes(normalize(query)));
  document.querySelector('#result-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'plato' : 'platos'}`;
  document.querySelector('#dish-list').innerHTML = filtered.length ? filtered.map(item => `<article class="dish-card"><div class="dish-art">${item.image?`<img class="recipe-photo" src="${esc(imageURL(item.image))}" alt="${esc(item.name)}" loading="lazy">`:dishArt(item.art)+'<span class="art-caption">Ilustración de muestra</span>'}</div>${favoriteButton(item)}<div class="dish-content"><div class="dish-meta"><span class="eyebrow">${iconMarkup(item.icon)} ${esc(item.category)}</span>${item.verification!=="verified"?'<span class="tag">Muestra</span>':""}</div><h3>${esc(item.name)}</h3><p>${esc(item.description)}</p><button class="button secondary" data-recipe="${esc(item.id)}">${esc(item.buttonLabel || "Ver ingredientes")} <span aria-hidden="true">→</span></button></div>${admin?.isAdmin?pencilMarkup("recipes",item.id):""}</article>`).join('') : `<div class="empty-result"><h3>${category === 'Favoritos' ? 'Aquí estarán tus favoritos' : 'No encontramos ese sabor'}</h3><p class="subtle">${category === 'Favoritos' ? 'Toca el corazón de un plato para guardarlo.' : 'Prueba con otro nombre o ingrediente.'}</p><button class="button secondary" data-reset>Ver todos los platos</button></div>`;
}
function fileInput() { return '<input type="file" id="book-file" accept="application/pdf,.pdf" hidden><p id="book-error" class="error-message" role="alert" hidden></p>'; }
function renderBook() {
  main.innerHTML = book ? `<div class="reader-top"><div><span class="eyebrow">Nuestro libro · Copia local</span><h1 class="reader-title">${esc(bookName)}</h1></div><div class="reader-actions"><button class="button secondary" id="import-book">Cambiar PDF</button><button class="button secondary" id="remove-book">Retirar libro</button></div></div>${fileInput()}<p class="subtle">Tu PDF se conserva en este navegador. No se envía a un servidor.</p><div class="reader-controls"><button id="prev-page" class="button secondary" aria-label="Página anterior">← Anterior</button><label for="page-number">Página <input type="number" id="page-number" min="1" max="${book.numPages}" value="${currentPage}"> de <span id="page-total">${book.numPages}</span></label><button id="next-page" class="button secondary" aria-label="Página siguiente">Siguiente →</button></div><p id="reader-status" role="status" class="subtle" aria-live="polite"></p><div class="pdf-stage"><canvas id="pdf-canvas" aria-label="Página del documento PDF"></canvas></div><p id="page-text" class="notice"></p>` : `<header class="intro editable-block"><span class="eyebrow">${esc(content.book.title)}</span><h1>${esc(content.bookPage.title)}</h1><p>${esc(content.bookPage.description)}</p>${admin?.isAdmin?pencilMarkup("book"):""}</header><section class="book-empty"><div class="book-cover" aria-label="Portada provisional, libro pendiente">${content.bookPage.cover?`<img class="book-cover-image" src="${esc(imageURL(content.bookPage.cover))}" alt="Portada del libro">`:""}<span class="eyebrow">Balcón del Zócalo</span><h2>${esc(content.book.title)}</h2><span class="ornament" aria-hidden="true">✧</span><small>ESPACIO RESERVADO</small></div><div class="book-copy"><span class="eyebrow">Listo para recibirlo</span><h2>${esc(content.bookPage.heading)}</h2><p>${esc(content.bookPage.body)}</p>${content.bookPage.pdfURL?'<button class="button" id="open-published-book">Abrir libro publicado</button>':""}<button class="button" id="import-book">${esc(content.bookPage.buttonLabel || "Cargar un PDF")} <span aria-hidden="true">↑</span></button><p class="helper">PDF de hasta 30 MB. Se guarda solo en este navegador.</p>${fileInput()}</div></section><section class="book-status" aria-label="Contenido pendiente"><div><strong>El libro</strong><span>Pendiente de que lo compartas</span></div><div><strong>Índice y capítulos</strong><span>Se añadirán con tu información</span></div><div><strong>El lector</strong><span>Preparado para explorar tu PDF</span></div></section>`;
  if (bookBusy) {
    document.querySelector('#import-book').disabled = true;
    document.querySelector('#import-book').textContent = 'Preparando el libro…';
    const remove = document.querySelector('#remove-book'); if (remove) remove.disabled = true;
  }
  if (book) void renderPage();
}
function route() {
  if (!content || !uiReady) return;
  disposeCarousels(); disposeCarousels = () => {};
  ++renderVersion; renderTask?.cancel();
  const requested=location.hash.slice(1);
  const tab = ['noticias','recetario','libro','comparte','cuenta','registro','recuperar','nueva-clave','admin',...content.pages.map(page=>page.id)].includes(requested) ? requested : 'noticias';
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === tab) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
  }
  document.title = `${tab === 'recetario' ? 'Recetario' : tab === 'libro' ? 'Nuestro libro' : tab==='comparte'?'Comparte tu trabajo':tab==='admin'?'Administración':'Noticias'} · Balcón del Zócalo`;
  if (tab==='admin') main.innerHTML=admin.adminMarkup();
  else if(['cuenta','registro','recuperar','nueva-clave'].includes(tab)) main.innerHTML=admin.accountMarkup(tab);
  else {
    if(tab==='recetario')renderMenu();else if(tab==='libro')renderBook();else if(tab==='noticias')renderNews();else if(tab==='comparte'){main.innerHTML=work.markup(content);void work.load();}else main.innerHTML=customPageMarkup(content.pages.find(page=>page.id===tab),{editing:admin.isAdmin});
    if(['noticias','recetario','libro','comparte'].includes(tab))main.insertAdjacentHTML('beforeend',extraBlocksMarkup(content,tab,{editing:admin.isAdmin}));
    main.insertAdjacentHTML('afterbegin',admin.addMarkup(tab));
    disposeCarousels=mountCarousels(main);
  }
}
async function loadDocument(bytes) {
  const pdf = await getPdfModule();
  const task = pdf.getDocument({ data: bytes, isEvalSupported:false, ...pdfDocumentOptions });
  try {
    const document = await task.promise;
    documentTasks.set(document, task);
    return document;
  } catch (error) {
    await task.destroy();
    throw error;
  }
}
async function disposeDocument(document) {
  if (!document) return;
  const task = documentTasks.get(document);
  if (task) { await task.destroy(); documentTasks.delete(document); }
}
function database() {
  if (!dbPromise) dbPromise = new Promise((resolve,reject) => {
    const request = indexedDB.open('balcon-library',1);
    request.onupgradeneeded = () => request.result.createObjectStore('books');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
async function storedBook(action, value) {
  const db = await database();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction('books', action === 'get' ? 'readonly':'readwrite');
    const store = transaction.objectStore('books');
    const request = action === 'get' ? store.get('current') : action === 'put' ? store.put(value,'current') : store.delete('current');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
function bookError(message) { const el = document.querySelector('#book-error'); if (el) { el.textContent = message; el.hidden = false; } else toast(message); }
async function importBook(file) {
  if (!file || bookBusy) return;
  if (file.size > 30 * 1024 * 1024) { bookError('El PDF supera los 30 MB. Elige un archivo más pequeño.'); return; }
  if (!file.name.toLowerCase().endsWith('.pdf')) { bookError('Elige un archivo PDF para abrir el libro.'); return; }
  bookBusy = true;
  const button = document.querySelector('#import-book'); if (button) { button.disabled = true; button.textContent = 'Preparando el libro…'; }
  const remove = document.querySelector('#remove-book'); if (remove) remove.disabled = true;
  let candidate;
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!new TextDecoder().decode(bytes.slice(0,1024)).includes('%PDF-')) throw new Error('invalid');
    candidate = await loadDocument(bytes);
    if (!candidate.numPages || candidate.numPages > 1000) throw new Error('page-count');
    await candidate.getPage(1);
    let retained = true;
    try { await storedBook('put',{ name:file.name, blob:file }); } catch { retained = false; }
    ++renderVersion; renderTask?.cancel(); await disposeDocument(book);
    book = candidate; bookName = file.name; currentPage = 1;
    if (location.hash === '#libro') renderBook();
    toast(retained ? 'Libro cargado y guardado en este navegador.' : 'Libro abierto para esta visita. No se pudo guardar en el navegador.');
  } catch (error) {
    await disposeDocument(candidate);
    bookError(error?.name === 'PasswordException' ? 'Este PDF tiene contraseña. Usa una copia sin protección.' : 'No pudimos abrir ese PDF. Usa un documento válido de hasta 1.000 páginas.');
  } finally {
    bookBusy = false;
    const active = document.querySelector('#import-book'); if (active) { active.disabled = false; active.textContent = book ? 'Cambiar PDF':'Cargar un PDF ↑'; }
    const remove = document.querySelector('#remove-book'); if (remove) remove.disabled = false;
  }
}
async function renderPage() {
  const version = ++renderVersion, activeBook = book;
  renderTask?.cancel();
  const canvas = document.querySelector('#pdf-canvas'); if (!canvas || !activeBook) return;
  const number = currentPage;
  document.querySelector('#prev-page').disabled = number <= 1;
  document.querySelector('#next-page').disabled = number >= activeBook.numPages;
  document.querySelector('#page-number').value = number;
  document.querySelector('#reader-status').textContent = `Abriendo página ${number}…`;
  try {
    const page = await activeBook.getPage(number); if (version !== renderVersion) return;
    const base = page.getViewport({ scale:1 });
    const available = Math.min(850, Math.max(200, canvas.parentElement.clientWidth - 40));
    const scale = available / base.width, pixelRatio = Math.min(devicePixelRatio || 1,2);
    const viewport = page.getViewport({ scale:scale * pixelRatio });
    canvas.width = viewport.width; canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / pixelRatio}px`; canvas.style.height = `${viewport.height / pixelRatio}px`;
    canvas.setAttribute('aria-label',`Página ${number} de ${activeBook.numPages} del libro`);
    renderTask = page.render({ canvasContext:canvas.getContext('2d'), viewport });
    await renderTask.promise;
    const text = await page.getTextContent(); if (version !== renderVersion) return;
    const pageText = text.items.map(x => x.str || '').join(' ');
    document.querySelector('#page-text').textContent = pageText || 'Esta página contiene imágenes sin texto seleccionable.';
    document.querySelector('#reader-status').textContent = `Página ${number} de ${activeBook.numPages}`;
  } catch (error) { if (error?.name !== 'RenderingCancelledException' && version === renderVersion) bookError('No se pudo mostrar esta página. Intenta abrir otra.'); }
}
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.matches('.close-button')) detail.close();
  if (target.dataset.news) openDetail('news',target.dataset.news);
  if (target.dataset.recipe) openDetail('recipe',target.dataset.recipe);
  if (target.dataset.favorite || target.dataset.detailFavorite) {
    const id = target.dataset.favorite || target.dataset.detailFavorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id); persistFavorites();
    if (location.hash === '#recetario') renderDishes();
    if (target.dataset.favorite) {
      const replacement = document.querySelector(`[data-favorite="${CSS.escape(id)}"]`) || document.querySelector('[data-category][aria-pressed="true"]');
      replacement?.focus({ preventScroll:true });
    }
    if (target.dataset.detailFavorite) { target.textContent = favorites.has(id) ? 'Quitar de favoritos':'Guardar en favoritos'; target.setAttribute('aria-pressed',String(favorites.has(id))); }
    toast(favorites.has(id) ? 'Plato guardado en favoritos.':'Plato retirado de favoritos.');
  }
  if (target.dataset.category) { category = target.dataset.category; for (const button of document.querySelectorAll('[data-category]')) button.setAttribute('aria-pressed',String(button.dataset.category === category)); renderDishes(); }
  if (target.hasAttribute('data-reset')) { category = 'Todos'; query = ''; renderMenu(); document.querySelector('#search').focus(); }
  if (target.id === 'open-published-book') void openPublishedBook();
  if (target.id === 'import-book') document.querySelector('#book-file').click();
  if (target.id === 'prev-page' && currentPage > 1) { currentPage--; void renderPage(); }
  if (target.id === 'next-page' && currentPage < book.numPages) { currentPage++; void renderPage(); }
  if (target.id === 'remove-book') document.querySelector('#remove-dialog').showModal();
  if (target.id === 'cancel-remove') document.querySelector('#remove-dialog').close();
  if (target.id === 'confirm-remove') void removeBook();
});
async function removeBook() {
  try { await storedBook('delete'); } catch { toast('No pudimos retirar la copia guardada. Intenta de nuevo.'); return; }
  ++renderVersion; renderTask?.cancel(); await disposeDocument(book); book = null; bookName = ''; currentPage = 1;
  document.querySelector('#remove-dialog').close(); renderBook(); toast('Se retiró la copia del libro.');
}
document.addEventListener('input', event => { if (event.target.id === 'search') { query = event.target.value; renderDishes(); } });
document.addEventListener('change', event => {
  if (event.target.id === 'book-file') void importBook(event.target.files?.[0]);
  if (event.target.id === 'page-number' && book) {
    const requested = Number(event.target.value);
    if (Number.isInteger(requested) && requested >= 1 && requested <= book.numPages) { currentPage = requested; void renderPage(); }
    else { event.target.value = currentPage; toast(`Elige una página entre 1 y ${book.numPages}.`); }
  }
});
window.addEventListener('hashchange',() => { detail.close(); route(); main.focus({ preventScroll:true }); window.scrollTo(0,0); });
document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); main.focus(); main.scrollIntoView(); });
detail.addEventListener('close',() => { if (detailOpener && !detailOpener.isConnected) document.querySelector('[data-category][aria-pressed="true"]')?.focus({ preventScroll:true }); });
let resizeTimer; window.addEventListener('resize',() => { clearTimeout(resizeTimer); if (location.hash === '#libro' && book) resizeTimer = setTimeout(() => void renderPage(),150); });

function updateShell() {
  if(!content || !admin)return;
  const a=content.appearance;
  for(const [variable,key] of [['--paper','background'],['--ink','text'],['--gold','accent'],['--muted','muted']])if(/^#[a-f\d]{6}$/i.test(a[key]))document.documentElement.style.setProperty(variable,a[key]);
  document.documentElement.style.setProperty('--site-width',`${Math.max(760,Math.min(1440,a.width))}px`);
  document.documentElement.style.setProperty('--site-font',a.font==='system-ui'?'system-ui':a.font==='Georgia'?'Georgia':'Questrial');
  document.body.classList.add('cms-theme');document.body.classList.toggle('compact-layout',a.density==='compact');document.body.classList.toggle('is-admin',admin.isAdmin);
  const brand=document.querySelector('.brand');brand.setAttribute('aria-label',content.restaurantName+', inicio');brand.querySelector('img').src=imageURL(content.brand.logo);brand.querySelector('img').alt=content.restaurantName;
  document.querySelector('.location-label').innerHTML=esc(content.brand.location)+'<br><span>'+esc(content.brand.subtitle)+'</span>';
  document.querySelector('.edition').innerHTML=(content.brand.badge?`<span class="pilot-label">${esc(content.brand.badge)}</span>`:'')+`<div class="account-tools">${admin.accountTools()}</div>`;
  const nav=document.querySelector('.navigation'),items=content.navigation.filter(item=>item.visible);
  nav.classList.toggle('many-menus',items.length>4);nav.classList.toggle('four-menus',items.length===4);nav.innerHTML=items.map(item=>`<a href="#${esc(item.id)}" data-nav="${esc(item.id)}">${iconMarkup(item.icon)}<span>${esc(item.label)}</span></a>`).join('');
  document.querySelector('.footer').innerHTML=`<span>${esc(content.restaurantName)}</span><span>${esc(content.brand.footer)}</span><span class="footer-edition">${esc(content.brand.subtitle)}</span>`;
  const bar=document.querySelector('#editor-tools');bar.hidden=!admin.isAdmin;bar.innerHTML=admin.toolsMarkup();
  document.querySelector('#brand-edit').hidden=!admin.isAdmin;
}
async function openPublishedBook(){
  const button=document.querySelector('#open-published-book');if(button)button.disabled=true;
  try{const url=safeHref(content.bookPage.pdfURL,'');if(!url.startsWith('https:'))throw new Error();const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok || Number(response.headers.get('Content-Length'))>30*1024*1024)throw new Error();const blob=await response.blob();if(blob.size>30*1024*1024)throw new Error();await importBook(new File([blob],content.book.title+'.pdf',{type:'application/pdf'}));}catch{bookError('No pudimos abrir el libro publicado. Intenta de nuevo.');}finally{if(button?.isConnected)button.disabled=false;}
}

async function initialize() {
try {
  const embedded = document.querySelector('#pilot-content');
  if (embedded) content = JSON.parse(embedded.textContent);
  else {
    const response = await fetch('/content.json'); if (!response.ok) throw new Error('content');
    content = await response.json();
  }
  content=createSiteDocument(content);
  const serviceConfig=document.querySelector('#service-config');
  const config=serviceConfig?JSON.parse(serviceConfig.textContent):await (await fetch('/service-config.json')).json();
  const service=new SiteService(config);
  work=createWork({service,notify:toast});
  admin=createAdmin({service,work,initialSite:content,onPreview(site){validateSiteDocument(site);content=site;updateShell();if(uiReady)route();},onAccountChange(){updateShell();if(uiReady && ['admin','cuenta','registro','recuperar','nueva-clave'].includes(location.hash.slice(1)))route();},notify:toast});
  await admin.initialize();uiReady=true;updateShell();
  try { const stored = JSON.parse(localStorage.getItem(favoritesKey) || '[]'); if (Array.isArray(stored)) favorites = new Set(stored.filter(id => content.recipes.some(x => x.id === id))); } catch { /* Storage is optional. */ }
  route();
  try {
    const saved = await storedBook('get');
    if (saved && !book && !bookBusy) {
      const restored = await loadDocument(new Uint8Array(await saved.blob.arrayBuffer()));
      if (!book && !bookBusy) {
        book = restored; bookName = saved.name;
        if (location.hash === '#libro') renderBook();
      } else await disposeDocument(restored);
    }
  } catch { toast('No pudimos recuperar el PDF guardado. Puedes volver a cargarlo.'); }
} catch { main.innerHTML = '<section class="empty-result"><h1>No pudimos cargar la experiencia</h1><p>Revisa la conexión y vuelve a intentarlo.</p><button class="button" id="retry">Intentar de nuevo</button></section>'; document.querySelector('#retry').addEventListener('click',() => location.reload()); }

}
void initialize();
