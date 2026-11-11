/* Rendering shared by the public site and both editors. No account permissions live here. */
(() => {
  'use strict';
  const color = value => /^#[\da-f]{6}$/i.test(value || '') ? value : '';
  const number = (value, min, max) => value === '' || value == null || !Number.isFinite(Number(value))
    ? null : Math.max(min, Math.min(max, Number(value)));
  const background = data => ['transparent','glass','solid'].includes(data.backgroundMode) ? data.backgroundMode : (data.plain ? 'transparent' : color(data.backgroundColor) ? 'solid' : '');
  const border = data => ['none','solid'].includes(data.borderMode) ? data.borderMode : (data.plain ? 'none' : color(data.borderColor) ? 'solid' : '');

  function surfaceAttributes(data) {
    const bg = background(data), edge = border(data), styles = [];
    if (color(data.backgroundColor)) styles.push(`--bz-surface-color:${data.backgroundColor}`);
    if (color(data.borderColor)) styles.push(`--bz-border-color:${data.borderColor}`);
    return `${bg ? ` data-bz-background="${bg}"` : ''}${edge ? ` data-bz-border="${edge}"` : ''}${styles.length ? ` style="${styles.join(';')}"` : ''}`;
  }

  function applySurface(element, data = {}) {
    if (!element) return;
    const bg = background(data), edge = border(data);
    if (bg) element.dataset.bzBackground = bg;
    if (edge) element.dataset.bzBorder = edge;
    if (color(data.backgroundColor)) {
      element.style.setProperty('--bz-surface-color', data.backgroundColor);
      if (bg !== 'transparent' && bg !== 'glass') element.style.backgroundColor = data.backgroundColor;
    }
    if (color(data.borderColor)) element.style.setProperty('--bz-border-color', data.borderColor);
    if (bg === 'transparent') {
      element.style.background = 'transparent';
      element.style.boxShadow = 'none';
      element.style.backdropFilter = 'none';
    } else if (bg === 'solid') {
      element.style.background = color(data.backgroundColor) || 'var(--soft)';
      element.style.backdropFilter = 'none';
    } else if (bg === 'glass') {
      element.style.background = color(data.backgroundColor)
        ? `color-mix(in srgb, ${data.backgroundColor} 18%, transparent)` : 'rgb(130 130 130 / .16)';
      element.style.backdropFilter = 'blur(14px) saturate(1.15)';
    }
    if (edge === 'none') element.style.border = '0';
    else if (edge === 'solid') element.style.border = `1px solid ${color(data.borderColor) || 'var(--line)'}`;
  }

  function imageStyle(data = {}, framed = false) {
    const styles = [], width = number(data.imageWidth, 1, 100), height = number(data.imageHeight, 1, 2000);
    const x = number(data.imageFocusX, 0, 100), y = number(data.imageFocusY, 0, 100);
    const zoom = number(data.imageZoom, 100, 400);
    if (width != null) styles.push(`width:${width}%`, 'max-width:100%', `height:${height != null ? `${height}px` : framed ? '100%' : 'auto'}`);
    if (height != null) styles.push(`height:${height}px`, 'max-height:none');
    if (['cover', 'contain', 'fill'].includes(data.imageFit)) styles.push(`object-fit:${data.imageFit}`);
    if (x != null || y != null) styles.push(`object-position:${x ?? 50}% ${y ?? 50}%`);
    if (zoom != null) styles.push(`transform:${zoom > 100 ? `scale(${zoom / 100})` : 'none'}`, `transform-origin:${x ?? 50}% ${y ?? 50}%`);
    return styles.join(';');
  }

  function applyImage(element, data = {}) {
    if (!element) return;
    const framed = !!element.closest('.hero-slide,.type-banner.image-center,.carousel-media,.lab-pathway-media,.news-image,.dish-art,.note-photo');
    const styles = imageStyle(data, framed);
    const temporary = document.createElement('span');
    temporary.style.cssText = styles;
    for (const property of temporary.style) element.style.setProperty(property, temporary.style.getPropertyValue(property));
    if (Number(data.imageZoom) > 100 && element.parentElement) element.parentElement.style.overflow = 'hidden';
    if (data.imageAlign && data.imageWidth) {
      element.style.marginInlineStart = data.imageAlign === 'left' ? '0' : 'auto';
      element.style.marginInlineEnd = data.imageAlign === 'right' ? '0' : 'auto';
    }
  }

  function applyIcon(element, data, renderIcon) {
    if (data.icon === undefined || element.tagName === 'IMG') return;
    const icons = [...element.querySelectorAll(':scope > .inline-icon,:scope > .arrow-icon,:scope > [data-visual-icon]')];
    icons.forEach(icon => icon.remove());
    if (data.icon && data.icon !== 'none') {
      const icon = document.createElement('span');
      icon.dataset.visualIcon = '';
      icon.innerHTML = renderIcon(data.icon);
      element.append(icon);
    }
  }

  function controls(label, escape) {
    return `<div class="carousel-controls" data-carousel-controls hidden>
      <div class="carousel-progress" data-carousel-pagination aria-label="Elegir imagen"></div>
      <span class="carousel-counter" data-carousel-counter aria-live="off">1 / 1</span>
      <button type="button" data-carousel-prev aria-label="Imagen anterior de ${escape(label)}">‹</button>
      <button type="button" data-carousel-pause aria-label="Pausar carrusel" aria-pressed="false">Ⅱ</button>
      <button type="button" data-carousel-next aria-label="Imagen siguiente de ${escape(label)}">›</button>
    </div>`;
  }

  function renderBlocks(blocks, options, deps) {
    const {escape: esc, image, icon, link, safeLink, text, snapshot, edit, caption} = deps;
    return (blocks || []).map(block => {
      const type = ['banner','carousel','image','text','title','button','shortcut','group'].includes(block.type) ? block.type : 'text';
      const alignment = ['left','center','right'].includes(block.imageAlign) ? block.imageAlign : 'center';
      const attrs = `data-layout-key="block-${esc(block.id)}" data-module-width="${number(block.moduleWidth,0,100) || 0}" data-module-height="${number(block.moduleHeight,0,2000) || 0}" data-module-offset="${number(block.moduleOffset,0,100) || 0}" data-module-screen="${esc(block.moduleScreen || '')}"${surfaceAttributes(block)}`;
      const pencil = options.editing ? edit('blocks', block.id) : '';
      const featured = options.featured ? ' sister-hero' : '';
      if (type === 'group') return `<article class="custom-block type-group editable-block${featured}" ${attrs} data-snapshot-group aria-label="${esc(block.title)}">${snapshot(block.snapshot,0,block.id)}${pencil}</article>`;
      const slides = Array.isArray(block.slides) ? block.slides : [];
      let media = '';
      if (type === 'carousel' && slides.length) {
        media = `<div class="block-carousel carousel" data-carousel="carrusel ${esc(block.id)}" data-interval="${number(block.interval,2000,20000) || 5000}" data-autoplay="${block.autoplay !== false}" role="region" aria-roledescription="carrusel" aria-label="${esc(block.title || 'Fotografías')}"><div class="block-carousel-track">${slides.map((slide,index) => {
          const copy = caption(slide,block,block.textMode);
          const presentation = block.presentation === 'overlay' ? 'overlay' : 'split';
          const align = ['left','center','right'].includes(slide.imageAlign) ? slide.imageAlign : 'left';
          const settings = {...block,...slide};
          for(const key of ['imageWidth','imageHeight','imageFit','imageZoom','imageFocusX','imageFocusY']) {
            if(slide[key]==null || slide[key]==='')settings[key]=block[key];
          }
          return `<div class="carousel-entry presentation-${presentation} image-${align}" data-carousel-info="block" data-block-id="${esc(block.id)}" data-slide-index="${index}" data-carousel-slide ${index ? 'hidden' : ''}>
            <button type="button" class="carousel-media" data-carousel-detail="block" data-block-id="${esc(block.id)}" data-slide-index="${index}" aria-label="Ver información de ${esc(copy.title || slide.alt || 'esta imagen')}"><img src="${esc(image(slide.image))}" alt="${esc(slide.alt || copy.title || '')}" loading="${options.featured && index === 0 ? 'eager' : 'lazy'}" ${options.featured && index === 0 ? 'fetchpriority="high"' : ''} style="${imageStyle(settings,true)}"><span class="image-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span></button>
            <div class="carousel-copy">${copy.eyebrow ? `<span class="eyebrow">${esc(copy.eyebrow)}</span>` : ''}${copy.title ? `<h2>${esc(copy.title)}</h2>` : ''}${copy.text ? `<p>${text(copy.text)}</p>` : ''}${copy.buttonLabel && safeLink(copy.buttonLink,'') ? `<a class="button secondary" ${link(copy.buttonLink)}>${esc(copy.buttonLabel)} ${icon('link')}</a>` : ''}${slide.dialogBody || slide.dialogTitle ? `<button type="button" class="text-link" data-carousel-detail="block" data-block-id="${esc(block.id)}" data-slide-index="${index}">Conocer el espacio ${icon('link')}</button>` : ''}</div>
          </div>`;
        }).join('')}</div>${controls(block.title || 'Fotografías',esc)}</div>`;
      } else if (block.image && image(block.image)) {
        media = `<img class="block-image" src="${esc(image(block.image))}" alt="${esc(block.alt || block.title || '')}" loading="${options.featured ? 'eager' : 'lazy'}" style="${imageStyle(block,type === 'banner' && alignment === 'center')}">`;
      }
      return `<article class="custom-block type-${type} image-${alignment} editable-block${featured}" ${attrs} data-text-mode="${block.textMode === 'individual' ? 'individual' : 'shared'}">${media}${type === 'carousel' && slides.length ? '' : `<div class="block-copy">${icon(block.icon)}${block.title ? `<h2>${esc(block.title)}</h2>` : ''}${block.text ? `<p>${text(block.text)}</p>` : ''}${block.buttonLabel && safeLink(block.link,'') ? `<a class="button secondary" ${link(block.link)}>${esc(block.buttonLabel)} ${icon('link','arrow-icon')}</a>` : ''}</div>`}${pencil}</article>`;
    }).join('');
  }

  const isSisterPage = page => page && (page.template === 'sister-companies' || (page.template !== 'standard' &&
    (page.id === 'section-fbc97490-7ba' || String(page.title).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim() === 'empresas hermanas')));

  function renderPage(page, options, deps) {
    if (!page) return '';
    const {escape: esc,image,edit} = deps;
    const heading = `<header class="intro editable-block" data-layout-key="custom-heading">${page.image ? `<img class="intro-photo" src="${esc(image(page.image))}" alt="">` : ''}<span class="eyebrow">${esc(page.eyebrow)}</span><h1>${esc(page.title)}</h1>${page.description ? `<p>${esc(page.description)}</p>` : ''}${options.editing ? edit('pages',page.id) : ''}</header>`;
    if (!isSisterPage(page)) return `${page.empty && !page.description && !page.image ? '' : heading}<section class="custom-blocks layout-${page.layout === 'list' ? 'list' : 'grid'}">${renderBlocks(page.blocks,options,deps)}</section>`;
    const blocks = page.blocks || [], first = blocks.findIndex(block => block.type === 'carousel' && block.slides?.length || block.type === 'banner' && block.image);
    const rest = blocks.filter((_,index) => index !== first);
    return `<div class="sister-page"><header class="sister-heading editable-block" data-layout-key="custom-heading"><span class="eyebrow">01 / Inmersiva</span><h1>${esc(page.title || 'Empresas hermanas')}</h1>${page.description ? `<p>${esc(page.description)}</p>` : ''}${options.editing ? edit('pages',page.id) : ''}</header>
      ${first >= 0 ? renderBlocks([blocks[first]],{...options,featured:true},deps) : page.image ? heading : ''}
      ${rest.length ? `<section class="sister-spaces"><h2>${esc(page.spacesTitle || 'Espacios. Una misma búsqueda.')}</h2><div class="custom-blocks layout-grid">${renderBlocks(rest,options,deps)}</div></section>` : ''}</div>`;
  }

  function sisterTemplate(id) {
    const block = (type,title,extra = {}) => ({id:id('block'),type,title,text:'',image:'',icon:'none',slides:[],...extra});
    return {template:'sister-companies',title:'Empresas hermanas',eyebrow:'Empresas hermanas',description:'',layout:'list',spacesTitle:'Tres espacios. Una misma búsqueda.',blocks:[
      block('carousel','Nuestros espacios',{presentation:'overlay',textMode:'individual',interval:6000,autoplay:true,borderMode:'none',slides:[
        {image:'@table',alt:'Balcón del Zócalo y el Centro Histórico',imageAlign:'left',imageFit:'cover',eyebrow:'Empresas hermanas',title:'Restaurante',text:'Una mesa, una vista, una nueva historia.',buttonLabel:'Conocer el espacio',buttonLink:'#noticias'},
        {image:'@chef-tasting',alt:'El trabajo en la cocina del Balcón',imageAlign:'left',imageFit:'cover',eyebrow:'Empresas hermanas',title:'Cocina',text:'El ingrediente como punto de partida.',buttonLabel:'Explorar el recetario',buttonLink:'#recetario'},
        {image:'@jars',alt:'Procesos y fermentos del laboratorio',imageAlign:'left',imageFit:'cover',eyebrow:'Empresas hermanas',title:'Laboratorio',text:'Investigar, experimentar y compartir.',buttonLabel:'Conocer el laboratorio',buttonLink:'#comparte'}
      ]}),
      block('shortcut','Restaurante',{image:'@table',imageFit:'cover',text:'Balcón del Zócalo',buttonLabel:'Conocer el espacio',link:'#noticias',borderMode:'solid'}),
      block('shortcut','Cocina',{image:'@chef-tasting',imageFit:'cover',text:'Recetario',buttonLabel:'Explorar',link:'#recetario',borderMode:'solid'}),
      block('shortcut','Laboratorio',{image:'@jars',imageFit:'cover',text:'I + D culinario',buttonLabel:'Conocer más',link:'#comparte',borderMode:'solid'})
    ]};
  }

  function prepareSite(site, fromSeed) {
    if (fromSeed && !site.pages.some(isSisterPage)) {
      let index=0;
      const page={id:'section-fbc97490-7ba',...sisterTemplate(prefix => `${prefix}-sister-${++index}`)};
      site.pages.push(page);
      site.navigation.push({id:page.id,label:page.title,icon:'none',visible:true});
    }
    for(const page of site.pages) {
      if(!page.template && isSisterPage(page)) {
        page.template='sister-companies';
        const hero=page.blocks?.find(block=>block.type==='carousel' && block.slides?.length || block.type==='banner' && block.image);
        if(hero){hero.presentation='overlay';hero.imageAlign='center';}
      }
    }
    return site;
  }

  function mountCarousels(root, {activeSlides=new Map()} = {}, safeLink = value => value) {
    const cleanups = [...root.querySelectorAll('[data-carousel]')].map(carousel => {
      const own = selector => [...carousel.querySelectorAll(selector)].filter(node => node.closest('[data-carousel]') === carousel);
      const slides=own('[data-carousel-slide]'), controls=own('[data-carousel-controls]')[0];
      if (!slides.length) { if (controls) controls.hidden=true; return () => {}; }
      const abort=new AbortController(), media=matchMedia('(prefers-reduced-motion: reduce)');
      const on=(target,event,listener,options={}) => target.addEventListener(event,listener,{...options,signal:abort.signal});
      const counter=controls?.querySelector('[data-carousel-counter]'), pause=controls?.querySelector('[data-carousel-pause]');
      const pagination=controls?.querySelector('[data-carousel-pagination]');
      let current=0, userPaused=media.matches || carousel.dataset.autoplay === 'false', hover=false, focused=false, timer;
      const stop=()=>{clearTimeout(timer);timer=undefined;};
      const schedule=()=>{
        stop();
        if (slides.length>1 && !userPaused && !hover && !focused && !document.hidden) timer=setTimeout(()=>{
          if (!document.querySelector('dialog[open]') && !document.body.classList.contains('visual-editing')) show(current+1);
          schedule();
        },number(carousel.dataset.interval,2000,20000) || 5000);
      };
      if (pagination) {
        pagination.replaceChildren(...slides.map((_,index)=>{
          const button=document.createElement('button');button.type='button';button.dataset.carouselGo=String(index);
          button.setAttribute('aria-label',`Mostrar imagen ${index+1}`);button.textContent=String(index+1).padStart(2,'0');return button;
        }));
      }
      function show(index) {
        current=(index+slides.length)%slides.length;
        slides.forEach((slide,i)=>{
          slide.hidden=i!==current;slide.setAttribute('aria-hidden',String(i!==current));
          slide.setAttribute('aria-label',`${i+1} de ${slides.length}`);
          slide.setAttribute('aria-roledescription','diapositiva');
        });
        if (carousel.classList.contains('hero')) {
          carousel.classList.remove('image-left','image-center','image-right');
          carousel.classList.add(`image-${slides[current].dataset.imageAlign || 'center'}`);
          if (carousel.dataset.copyMode==='individual') {
            let copy={};try {copy=JSON.parse(slides[current].dataset.slideCaption || '{}');} catch {}
            for (const field of ['eyebrow','title','text','buttonLabel']) {
              const element=carousel.querySelector(`[data-caption-field="${field}"]`);
              if (!element) continue;
              element.hidden=!copy[field];
              if (field==='buttonLabel') {
                const label=element.querySelector('[data-caption-button-text]');if(label)label.textContent=copy[field] || '';
                const href=safeLink(copy.buttonLink,'');
                element.hidden=!copy[field] || !href;
                if(href) {element.href=href;href.startsWith('https:') ? (element.target='_blank',element.rel='noopener noreferrer') : (element.removeAttribute('target'),element.removeAttribute('rel'));}
                else element.removeAttribute('href');
              } else element.textContent=copy[field] || '';
            }
          }
        }
        if(counter)counter.textContent=`${current+1} / ${slides.length}`;
        pagination?.querySelectorAll('[data-carousel-go]').forEach((button,index)=>button.setAttribute('aria-current',String(index===current)));
        carousel.dataset.activeSlide=String(current);
        carousel.dispatchEvent(new CustomEvent('balcon:slide-change',{bubbles:true}));
      }
      const updatePause=()=>{if(pause){pause.innerHTML=userPaused?'<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="m7 4 8 6-8 6z" fill="currentColor"/></svg>':'<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7 4v12M13 4v12" stroke="currentColor" stroke-width="1.5"/></svg>';pause.setAttribute('aria-pressed',String(userPaused));pause.setAttribute('aria-label',userPaused?'Reproducir carrusel':'Pausar carrusel');}};
      if(controls)controls.hidden=slides.length<2;
      show(Math.min(slides.length-1,activeSlides.get(carousel.dataset.carousel) || 0));updatePause();schedule();
      on(carousel,'click',event=>{
        const button=event.target.closest('[data-carousel-prev],[data-carousel-next],[data-carousel-pause],[data-carousel-go]');
        if(!button || button.closest('[data-carousel]')!==carousel)return;
        if(button.hasAttribute('data-carousel-pause')){userPaused=!userPaused;updatePause();}
        else show(button.hasAttribute('data-carousel-go') ? Number(button.dataset.carouselGo) : current+(button.hasAttribute('data-carousel-prev')?-1:1));
        schedule();
      });
      on(carousel,'keydown',event=>{
        if(event.target.closest('[data-carousel]')!==carousel || !['ArrowLeft','ArrowRight'].includes(event.key) || event.target.matches('input,textarea,select,[contenteditable]') || document.body.classList.contains('visual-editing'))return;
        event.preventDefault();show(current+(event.key==='ArrowRight'?1:-1));schedule();
      });
      on(carousel,'pointerenter',event=>{if(event.pointerType==='mouse'){hover=true;schedule();}});
      on(carousel,'pointerleave',()=>{hover=false;schedule();});
      on(carousel,'focusin',()=>{focused=true;schedule();});
      on(carousel,'focusout',event=>{if(!carousel.contains(event.relatedTarget)){focused=false;schedule();}});
      let touch;
      on(carousel,'touchstart',event=>{if(event.touches.length===1 && !event.target.closest('.carousel-controls,a,button:not(.carousel-media):not(.hero-photo-button)')) touch={x:event.touches[0].clientX,y:event.touches[0].clientY};},{passive:true});
      on(carousel,'touchend',event=>{
        if(!touch)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;
        if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.5){show(current+(dx<0?1:-1));schedule();}
      });
      on(document,'visibilitychange',schedule);
      on(media,'change',event=>{if(event.matches){userPaused=true;updatePause();schedule();}});
      return ()=>{stop();abort.abort();};
    });
    return ()=>cleanups.forEach(cleanup=>cleanup());
  }

  async function preparePublication(document, upload) {
    const result=structuredClone(document), replacements=new Map();
    async function visit(node) {
      if(!node || typeof node!=='object')return;
      for(const [key,value] of Object.entries(node)) {
        if(typeof value==='string' && (['image','cover','logo','src'].includes(key) || key.endsWith('Image')) && /^data:image\/(jpeg|png|webp|gif);base64,/i.test(value)) {
          if(!replacements.has(value)) {
            const response=await fetch(value), blob=await response.blob();
            const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[blob.type];
            replacements.set(value,await upload(new File([blob],`imagen.${extension}`,{type:blob.type}),'image'));
          }
          node[key]=replacements.get(value);
        } else if(value && typeof value==='object')await visit(value);
      }
    }
    await visit(result);
    // Match the existing Postgres RPC limit, including jsonb's formatting overhead.
    const json=JSON.stringify(result), bytes=new TextEncoder().encode(json).length;
    if(bytes + countJSONSeparators(json) > 4000000) throw new Error('El documento supera los 4 MB de publicación aun con las fotos en la biblioteca. Exporta una copia y divide el contenido antes de publicar.');
    return result;
  }
  function countJSONSeparators(json) {
    let quoted=false, escaped=false, count=0;
    for(const character of json) {
      if(escaped){escaped=false;continue;}
      if(quoted && character==='\\'){escaped=true;continue;}
      if(character==='"')quoted=!quoted;
      else if(!quoted && (character===',' || character===':'))count++;
    }
    return count;
  }

  document.addEventListener('load',event=>{
    const img=event.target;
    if(!(img instanceof HTMLImageElement) || !img.matches('.cms-image-preview'))return;
    let info=img.parentElement.querySelector('[data-image-resolution]');
    if(!info){info=document.createElement('small');info.dataset.imageResolution='';img.after(info);}
    info.textContent=`Original: ${img.naturalWidth} × ${img.naturalHeight} px.${img.naturalWidth<1600 ? ' Para portadas grandes usa una foto de al menos 1920 px de ancho; ampliarla no recupera detalle.' : ''}`;
  },true);
  window.BZUI={applySurface,applyImage,applyIcon,imageStyle,surfaceAttributes,controls,renderBlocks,renderPage,sisterTemplate,prepareSite,mountCarousels,preparePublication};
})();
