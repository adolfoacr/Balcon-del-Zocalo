/* External news are read from a same-origin snapshot refreshed by the site. */
(() => {
  'use strict';
  const defaultSource='https://www.culinariamexicana.com.mx/';
  const snapshotURL=new URL('./data/media-news.json',document.baseURI);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const https=value=>{try{const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password ? url.href : '';}catch{return '';}};
  const canonical=value=>{const url=https(value);return url ? url.replace(/\/$/,'') : '';};
  const date=value=>{const parsed=new Date(value);return Number.isNaN(parsed.getTime()) ? '' : new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Mexico_City'}).format(parsed);};
  let cleanup=()=>{},cache=null,cacheAt=0;

  function render(items,settings,sourceName) {
    const interval=Math.max(2000,Math.min(20000,Number(settings.mediaInterval)||6000));
    return `<div class="media-feed-carousel carousel" data-carousel="noticias-del-medio" data-interval="${interval}" data-autoplay="true" role="region" aria-roledescription="carrusel" aria-label="Noticias de ${escape(sourceName)}">${items.map((item,index)=>{
      const link=https(item.url),image=https(item.image),published=date(item.publishedAt);
      return `<article class="media-feed-slide${image?' has-image':''}" data-carousel-slide ${index?'hidden':''}>
        ${image?`<a class="media-feed-image" href="${escape(link)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${escape(image)}" alt="" loading="${index?'lazy':'eager'}" decoding="async" referrerpolicy="no-referrer"></a>`:''}
        <div class="media-feed-copy"><div class="media-feed-meta"><span class="eyebrow">${escape(sourceName)}</span>${published?`<time datetime="${escape(item.publishedAt)}">${escape(published)}</time>`:''}</div>
          <h3><a href="${escape(link)}" target="_blank" rel="noopener noreferrer">${escape(item.title)}</a></h3>
          ${item.excerpt?`<p>${escape(item.excerpt)}</p>`:''}
          <a class="text-link" href="${escape(link)}" target="_blank" rel="noopener noreferrer">Leer en ${escape(sourceName)} <span aria-hidden="true">↗</span></a>
        </div></article>`;
    }).join('')}</div>`;
  }

  function attach(settings={},editing=false) {
    cleanup();
    const section=document.querySelector('#noticias-del-medio');
    if(!section)return;
    const sourceURL=https(settings.mediaSourceURL || defaultSource);
    let sourceName=String(settings.mediaSourceName || '').trim() || (canonical(sourceURL)===canonical(defaultSource)?'Culinaria Mexicana':new URL(sourceURL || defaultSource).hostname.replace(/^www\./,''));
    const actions=document.createElement('div');actions.className='media-feed-actions';
    actions.innerHTML=`${sourceURL?`<a class="text-link" href="${escape(sourceURL)}" target="_blank" rel="noopener noreferrer">Visitar ${escape(sourceName)} ↗</a>`:''}${editing?'<button type="button" class="button secondary" data-edit-panel="newsPage">Configurar fuente de noticias</button>':''}`;
    section.querySelector('.media-feed-actions')?.remove();
    section.querySelector('.section-heading')?.after(actions);
    if(settings.mediaEnabled===false || !sourceURL)return;
    // Manual articles remain in the CMS; this view now displays the connected medium.
    section.querySelectorAll(':scope > .media-grid,:scope > .media-empty,:scope > [data-media-feed]').forEach(node=>node.remove());
    const stage=document.createElement('div');stage.className='media-feed-stage';stage.dataset.mediaFeed='';
    stage.innerHTML='<p class="media-feed-status" role="status">Cargando noticias del medio…</p>';
    actions.after(stage);
    const hint=section.querySelector('.section-heading .subtle');
    if(hint?.textContent.includes('resumido por el equipo'))hint.textContent='Noticias recientes del mundo culinario, con enlace a su publicación original.';
    const footnote=section.parentElement.querySelector('.news-footnote');
    if(footnote?.textContent.startsWith('El contenido definitivo se publicará'))footnote.textContent='Consulta cada noticia en la publicación original del medio.';
    const abort=new AbortController();let disposeCarousel=()=>{},timer,stopped=false;
    const observer=new MutationObserver(()=>{if(!stage.isConnected)stop();});
    observer.observe(section.parentElement,{childList:true,subtree:true});
    function stop(){stopped=true;abort.abort();disposeCarousel();clearTimeout(timer);observer.disconnect();}
    cleanup=stop;
    function fallback(message) {
      if(!stage.isConnected || stopped)return;
      disposeCarousel();
      stage.innerHTML=`<div class="media-feed-empty"><p>${escape(message)}</p><a class="text-link" href="${escape(sourceURL)}" target="_blank" rel="noopener noreferrer">Leer las noticias en ${escape(sourceName)} ↗</a></div>`;
    }
    async function update() {
      if(stopped || !stage.isConnected)return;
      try {
        let feed=cache;
        if(!feed || Date.now()-cacheAt>5*60*1000) {
          const url=new URL(snapshotURL);url.searchParams.set('v',String(Math.floor(Date.now()/300000)));
          const response=await fetch(url,{signal:abort.signal,cache:'no-cache'});
          if(!response.ok)throw new Error('snapshot');
          feed=await response.json();cache=feed;cacheAt=Date.now();
        }
        if(stopped || !stage.isConnected)return;
        if(canonical(feed.sourceURL)!==canonical(sourceURL)) {
          fallback(editing?'Publica la dirección del medio para sincronizar sus noticias.':'Las noticias de este medio se están actualizando.');return;
        }
        const items=(Array.isArray(feed.items)?feed.items:[]).filter(item=>item && typeof item.title==='string' && https(item.url)).slice(0,10);
        if(!items.length){fallback('Las noticias se están sincronizando. Puedes consultar las publicaciones en su fuente.');return;}
        sourceName=String(settings.mediaSourceName || feed.sourceName || sourceName).slice(0,120);
        const previous=Number(stage.querySelector('[data-carousel]')?.dataset.activeSlide)||0;
        disposeCarousel();stage.innerHTML=render(items,settings,sourceName);
        for(const img of stage.querySelectorAll('img'))img.addEventListener('error',()=>{img.closest('.media-feed-slide')?.classList.remove('has-image');img.parentElement?.remove();},{once:true});
        disposeCarousel=window.BZUI.mountCarousels(stage,{activeSlides:new Map([['noticias-del-medio',Math.min(previous,items.length-1)]])});
      } catch(error) {
        if(error.name!=='AbortError' && !stage.querySelector('[data-carousel]'))fallback('No pudimos actualizar las noticias en este momento.');
      } finally {
        if(!stopped && stage.isConnected)timer=setTimeout(update,5*60*1000);
      }
    }
    update();
  }
  addEventListener('hashchange',()=>cleanup());
  window.BZMedia={attach};
})();
