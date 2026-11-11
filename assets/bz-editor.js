/* Small, task-focused forms and reusable content editing. Authorization stays in the CMS. */
(() => {
  'use strict';
  const clone=value=>structuredClone(value);
  const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
  const screen=()=>innerWidth<=700?'phone':innerWidth<=1100?'tablet':'desktop';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const allBlocks=site=>[...Object.values(site.sectionBlocks||{}).flat(),...(site.pages||[]).flatMap(page=>page.blocks)];

  function fields(type,item,list,render,context={}) {
    let primary=[];
    if(type==='recipes')primary=['name','image','description','ingredients','steps','servings'];
    else if(type==='blocks'&&context.button)primary=['buttonLabel','link','buttonColor'];
    else if(type==='blocks')primary={
      carousel:['title','text','buttonLabel','link','buttonColor','slides','interval'],
      banner:['image','title','text','buttonLabel','link','buttonColor'],
      image:['image','title','text'],text:['text'],title:['title'],
      button:['buttonLabel','link','buttonColor'],shortcut:['image','title','buttonLabel','link','buttonColor'],group:['title']
    }[item.type]||['title','text'];
    else if(type==='element')primary=context.tag==='IMG'?['image','alt']:['A','BUTTON'].includes(context.tag)?['text','link','backgroundColor','color']:context.container?['backgroundMode','backgroundColor','borderMode']:['text','color'];
    else if(type==='news')primary=['title','image','excerpt','body','source','sourceURL'];
    else if(type==='pages')primary=['title','description'];
    else if(type==='navigation')primary=['label','visible'];
    else if(type==='slides')primary=['image','alt'];
    else if(type==='recipeMenus')primary=['name','image','description'];
    else if(type==='colors')primary=list.map(field=>field.path);
    else if(type==='appearance')primary=['restaurantName','brand.logo','brand.subtitle','appearance.background','appearance.accent'];
    else if(type==='location')primary=['location.title','location.address','location.buttonLabel'];
    else if(type==='shortcuts')primary=['image','label','text','link'];
    else if(type==='home')primary=[list.find(field=>/^home\.slides\.\d+\.image$/.test(field.path))?.path,'home.title','home.description','home.buttonLabel','home.buttonLink','home.interval'].filter(Boolean);
    else if(type==='workPage')primary=['workPage.image','workPage.title','workPage.description'];
    else if(type==='newsPage')primary=['newsPage.title','newsPage.description','newsPage.mediaSourceURL','newsPage.mediaInterval','newsPage.mediaEnabled'];
    else primary=list.filter(field=>/image$|\.title$|\.description$|\.buttonLabel$|\.buttonLink$/i.test(field.path)).slice(0,8).map(field=>field.path);
    const labels={name:type==='recipes'?'Nombre del platillo':'Nombre',image:type==='recipes'?'Foto del platillo':'Foto',description:'Descripción',ingredients:'Ingredientes (uno por renglón)',steps:'Elaboración (un paso por renglón)',servings:'Número de porciones',buttonLabel:'Texto del botón',link:'Enlace del botón',buttonColor:'Color del botón',slides:'Fotos del carrusel',interval:'Cambiar de foto cada (segundos)',text:type==='blocks'&&item.type==='text'?'Escribe tu texto':'Texto',title:'Título'};
    const basic=primary.map(path=>list.find(field=>field.path===path)).filter(Boolean);
    const advanced=list.filter(field=>!primary.includes(field.path));
    const drawField=field=>{
      let markup=render({...field,label:labels[field.path]||field.label});
      if((type==='recipes'&&field.path==='name')||((context.button||item.type==='button')&&['buttonLabel','link'].includes(field.path)))markup=markup.replace('<input ','<input required ');
      if(type==='recipes'&&field.path==='servings')markup=markup.replace('step="any"','step="1"');
      if(field.type==='optional-color')markup+=`<button type="button" class="cms-color-reset" data-editor-theme-color="${esc(field.path)}">Usar color del sitio</button>`;
      return markup;
    };
    return `<div class="cms-primary">${basic.map(drawField).join('')}</div>${advanced.length?`<details class="cms-advanced"><summary>Opciones avanzadas</summary><div class="cms-advanced-fields">${advanced.map(render).join('')}</div></details>`:''}`;
  }

  function slideFields(list,render) {
    const basic=list.filter(field=>['image','alt'].includes(field.path));
    const advanced=list.filter(field=>!['image','alt'].includes(field.path));
    return basic.map(render).join('')+`<details class="cms-advanced cms-slide-advanced"><summary>Ajustar esta foto</summary>${advanced.map(render).join('')}</details>`;
  }

  function imageField(markup) {
    return markup.replace(/(<input\b[^>]*type="text"[^>]*>)/, '<details class="cms-photo-url"><summary>Usar un enlace de imagen</summary>$1</details>');
  }

  function prepareSite(site) {
    for(const page of site.pages||[]) {
      const candidates=page.blocks.filter(block=>block.type==='carousel' && block.slides?.length);
      const migrated=[];
      for(const block of candidates) {
        if(block.reservationTemplateVersion===1)continue;
        const overrides=Object.entries(site.elementOverrides||{}).filter(([key])=>key.includes('block-'+block.id));
        const identity=fold([block.title,...block.slides.map(slide=>slide.title),...overrides.map(([,value])=>value?.text)].join(' '));
        if(!identity.includes('salon central')&&!identity.includes('taco tasting room'))continue;
        const first=block.slides[0];
        const titleOverride=overrides.find(([key,value])=>/\.h[123]-0$/.test(key)&&value?.text)?.[1].text;
        const buttonOverride=overrides.find(([key,value])=>/\.a-0$/.test(key)&&value?.text)?.[1];
        block.title=titleOverride || first.title || block.title;
        block.text=first.text || block.text || '';
        block.eyebrow=first.eyebrow || block.eyebrow || '';
        block.buttonLabel=buttonOverride?.text || first.buttonLabel || block.buttonLabel || 'Reserva';
        block.link=buttonOverride?.link || first.buttonLink || block.buttonLink || block.link || '';
        block.presentation='overlay';block.textMode='shared';block.carouselDesign='immersive';
        block.imageFit='cover';block.buttonStyle='solid';
        for(const slide of block.slides){slide.imageFit='cover';delete slide.imageWidth;delete slide.imageHeight;}
        block.reservationTemplateVersion=1;
        migrated.push(block);
        // Layout belonged to the first photo; the shared copy keeps those keys.
        for(const [key,value] of overrides)if(/\.a-0$/.test(key)) {
          if(value.backgroundColor)block.buttonColor=value.backgroundColor;
          for(const property of ['removed','removedImagePath','moduleWidth','moduleHeight','moduleOffset','moduleScreen','backgroundMode','backgroundColor','borderMode','borderColor','color','size','lockAppearance','icon','imageFit','imageZoom','imageWidth','imageHeight','imageFocusX','imageFocusY'])delete value[property];
        }
      }
      const reference=candidates.find(block=>fold(block.title).includes('salon central'));
      if(reference)for(const block of migrated)if(fold(block.title).includes('taco tasting room'))block.buttonColor=reference.buttonColor||site.appearance?.accent||'#c7ac72';
    }
    return site;
  }

  function duplicate(site,source,destination,title,overrides,id) {
    const existing=allBlocks(site).slice();
    const result=clone(source),oldId=source.id;
    result.id=id('block');if(title)result.title=title;
    const destinationBlocks=site.pages.find(page=>page.id===destination)?.blocks || (site.sectionBlocks[destination] ||= []);
    const sameIndex=destinationBlocks.findIndex(block=>block.id===oldId);
    destinationBlocks.splice(sameIndex<0?destinationBlocks.length:sameIndex+1,0,result);
    const ids=new Map([[oldId,result.id]]),children=[];
    for(let progress=true;progress;){progress=false;for(const block of existing){
      if(ids.has(block.id)||!block.floating?.anchor?.startsWith('block-')||!ids.has(block.floating.anchor.slice(6)))continue;
      const child=clone(block);child.id=id('block');child.floating.anchor='block-'+ids.get(block.floating.anchor.slice(6));ids.set(block.id,child.id);children.push(child);progress=true;
    }}
    destinationBlocks.splice(destinationBlocks.indexOf(result)+1,0,...children);
    const oldToken='block-'+oldId,newToken='block-'+result.id;
    const remap=value=>{if(typeof value!=='string')return value;let mapped=value.replace(/^page-[^:]+:/,'page-'+destination+':');for(const [before,after]of ids)mapped=mapped.replaceAll('block-'+before,'block-'+after);return mapped;};
    const original=document.querySelector(`[data-layout-key="${CSS.escape(oldToken)}"]`),bounds=original?.getBoundingClientRect();
    const remapDeep=value=>{
      if(Array.isArray(value))return value.map(remapDeep);
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,remapDeep(entry)]));
      return typeof value==='string'&&(value.startsWith('page-')||[...ids.keys()].some(id=>value==='block-'+id))?remap(value):value;
    };
    site.elementOverrides ||= {};
    const attachedIds=[...ids.keys()].filter(id=>id!==oldId);
    const attachedOverrides=Object.fromEntries(Object.entries(site.elementOverrides).filter(([key])=>attachedIds.some(id=>key.includes('block-'+id))));
    for(const [key,override] of Object.entries({...overrides,...attachedOverrides})) {
      const copy=remapDeep(clone(override));
      if(copy.positions && bounds?.width && !key.endsWith(oldToken)) {
        const node=[...(original?.querySelectorAll('[data-edit-key]')||[])].find(node=>node.dataset.editKey===key);
        const position=copy.positions[screen()];
        if(node&&position&&!position.container?.includes(newToken)) {
          const rect=node.getBoundingClientRect();
          Object.assign(position,{container:`page-${destination}:article-${newToken}`,x:Math.max(-1,Math.min(1,(rect.left-bounds.left)/bounds.width)),y:Math.max(0,rect.top-bounds.top),width:Math.max(.01,Math.min(1,rect.width/bounds.width))});
        }
      }
      site.elementOverrides[remap(key)]=copy;
    }
    return result;
  }

  function pruneOverlays(site,previous) {
    const oldIds=new Set(allBlocks(previous).map(block=>'block-'+block.id)),removed=new Set();
    for(let progress=true;progress;){progress=false;const currentIds=new Set(allBlocks(site).map(block=>'block-'+block.id));
      for(const block of allBlocks(site))if(block.floating&&oldIds.has(block.floating.anchor)&&!currentIds.has(block.floating.anchor)){removed.add(block.id);progress=true;}
      if(progress){for(const page of site.pages||[])page.blocks=page.blocks.filter(block=>!removed.has(block.id));for(const [key,blocks]of Object.entries(site.sectionBlocks||{}))site.sectionBlocks[key]=blocks.filter(block=>!removed.has(block.id));}
    }
    for(const key of Object.keys(site.elementOverrides||{}))if([...removed].some(id=>key.includes('block-'+id)))delete site.elementOverrides[key];
  }

  function copyItem(item,node) {
    const result=clone(item);
    if(node.closest('.sister-hero,.carousel-design-immersive'))result.carouselDesign='immersive';
    return result;
  }

  function editPath(node) {
    let current=node,parts=[];
    while(current&&current.parentElement) {
      if(current.dataset.bzEditPath)return current.dataset.bzEditPath+(parts.length?'.'+parts.join('.'):'');
      if(current.dataset.layoutKey)break;
      parts.unshift(`${current.tagName.toLowerCase()}-${[...current.parentElement.children].filter(sibling=>sibling.tagName===current.tagName&&!sibling.hasAttribute('data-visual-image')&&!sibling.hasAttribute('data-visual-icon')).indexOf(current)}`);
      current=current.parentElement;
    }
    return '';
  }

  let mounted=[],activeSite=null,parentStyles=new Map();
  function beforeRefresh(){for(const record of mounted){if(record.parent.isConnected)record.parent.insertBefore(record.node,record.before?.parentElement===record.parent?record.before:null);}mounted=[];for(const [parent,style] of parentStyles)Object.assign(parent.style,style);parentStyles.clear();}
  function placeOverlays(site) {
    activeSite=site;
    for(const block of allBlocks(site)) {
      if(!block.floating)continue;
      const node=document.querySelector(`[data-layout-key="block-${CSS.escape(block.id)}"]`);
      if(!node)continue;
      const target=block.floating.anchor==='page'?document.querySelector('main'):document.querySelector(`[data-layout-key="${CSS.escape(block.floating.anchor)}"]`);
      if(!target||target===node||node.contains(target))continue;
      if(!mounted.some(record=>record.node===node))mounted.push({node,parent:node.parentElement,before:node.nextSibling});
      const ownPosition=block.floating.positions?.[screen()];
      const pos=ownPosition||block.floating.positions?.desktop||Object.values(block.floating.positions||{})[0];
      if(!pos)continue;
      if(!parentStyles.has(target))parentStyles.set(target,{position:target.style.position,minHeight:target.style.minHeight});
      if(getComputedStyle(target).position==='static')target.style.position='relative';
      target.append(node);node.classList.add('drawn-element');
      const y=block.floating.anchor==='page'?pos.y:pos.y*target.clientHeight;
      // A desktop rectangle must remain readable before a phone-specific placement is made.
      const width=!ownPosition&&screen()!=='desktop'?Math.max(pos.width,Math.min(1,(block.type==='button'?160:220)/target.clientWidth)):pos.width;
      const x=Math.max(0,Math.min(pos.x,1-width));
      Object.assign(node.style,{position:'absolute',left:`${x*100}%`,top:`${y}px`,width:`${width*100}%`,minHeight:`${pos.height}px`,height:'auto',margin:'0',zIndex:'6'});
      if(block.floating.anchor==='page')target.style.minHeight=Math.max(parseFloat(target.style.minHeight)||0,y+node.offsetHeight+24)+'px';
    }
  }

  function draw(type='button') {
    return new Promise(resolve=>{
      const surface=document.createElement('div');surface.className='text-draw-surface';
      surface.innerHTML=`<div class="text-draw-help"><strong>Dibuja dónde colocar el contenido</strong><label>Agregar <select data-draw-kind><option value="button" ${type==='button'?'selected':''}>Botón</option><option value="text" ${type==='text'?'selected':''}>Texto</option></select></label><button type="button" data-draw-cancel>Cancelar</button></div><div class="text-draw-box" hidden></div>`;
      document.body.append(surface);const box=surface.querySelector('.text-draw-box');let start,anchor;
      const finish=value=>{document.removeEventListener('keydown',key);surface.remove();resolve(value);};
      const key=event=>{if(event.key==='Escape')finish(null);};document.addEventListener('keydown',key);
      surface.querySelector('[data-draw-cancel]').onclick=()=>finish(null);
      surface.onpointerdown=event=>{
        if(event.target.closest('.text-draw-help'))return;
        surface.style.pointerEvents='none';const under=document.elementFromPoint(event.clientX,event.clientY);surface.style.pointerEvents='';
        const main=document.querySelector('main');if(!main?.contains(under))return;
        anchor=under.closest('.custom-block:not(.drawn-element),[data-layout-key]')||main;
        if(!main.contains(anchor))anchor=main;
        start={x:event.clientX,y:event.clientY};surface.setPointerCapture(event.pointerId);box.hidden=false;event.preventDefault();
      };
      surface.onpointermove=event=>{if(!start)return;Object.assign(box.style,{left:Math.min(start.x,event.clientX)+'px',top:Math.min(start.y,event.clientY)+'px',width:Math.abs(event.clientX-start.x)+'px',height:Math.abs(event.clientY-start.y)+'px'});};
      surface.onpointerup=event=>{
        if(!start)return;
        const rect={left:Math.min(start.x,event.clientX),top:Math.min(start.y,event.clientY),width:Math.abs(event.clientX-start.x),height:Math.abs(event.clientY-start.y)},bounds=anchor.getBoundingClientRect();
        if(rect.width<50||rect.height<24){start=null;box.hidden=true;return;}
        const page=anchor.tagName==='MAIN';
        finish({type:surface.querySelector('[data-draw-kind]').value,floating:{anchor:page?'page':anchor.dataset.layoutKey,positions:{[screen()]:{x:Math.max(0,Math.min(1,((rect.left-bounds.left)/bounds.width))),y:page?Math.max(0,rect.top-bounds.top):Math.max(0,Math.min(1,(rect.top-bounds.top)/bounds.height)),width:Math.max(.02,Math.min(1,rect.width/bounds.width)),height:Math.round(rect.height)}}}});
      };
      surface.onpointercancel=()=>finish(null);
    });
  }

  function recipeDetail(recipe,{escape:escapeHTML,image}) {
    return `${recipe.image?`<img class="detail-recipe-photo" src="${escapeHTML(image(recipe.image))}" alt="${escapeHTML(recipe.name)}">`:''}<span class="eyebrow">Recetario</span><h2 id="detail-title">${escapeHTML(recipe.name)}</h2>${recipe.description?`<p>${escapeHTML(recipe.description)}</p>`:''}${recipe.servings?`<p class="recipe-servings">${escapeHTML(recipe.servings)} porciones</p>`:''}<section class="recipe-ingredients"><h3>Ingredientes</h3><ul>${(recipe.ingredients||[]).map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></section>${recipe.steps?.length?`<section class="recipe-method"><h3>Elaboración</h3><ol>${recipe.steps.map(step=>`<li>${escapeHTML(step)}</li>`).join('')}</ol></section>`:''}`;
  }

  document.addEventListener('invalid',event=>{let parent=event.target.parentElement;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}},true);
  document.addEventListener('click',async event=>{
    const reset=event.target.closest('[data-editor-theme-color]');
    if(reset){const form=reset.closest('form'),enabled=form?.elements.namedItem(reset.dataset.editorThemeColor+'-enabled');if(enabled)enabled.checked=false;return;}
    const duplicateButton=event.target.closest('[data-editor-duplicate]');
    if(duplicateButton){
      const context=window.BZEditor.context?.();if(!context?.admin?.isAdmin)return;
      const source=allBlocks(context.site).find(block=>block.id===duplicateButton.dataset.editorDuplicate);
      if(!source)return;
      const node=document.querySelector(`[data-layout-key="block-${CSS.escape(source.id)}"]`);
      const item=node?copyItem(source,node):clone(source);
      const overrides=Object.fromEntries(Object.entries(context.site.elementOverrides||{}).filter(([key])=>key.includes('block-'+source.id)));
      const destination=context.site.navigation.some(section=>section.id===context.route)?context.route:context.site.pages.find(page=>page.blocks.some(block=>block.id===source.id))?.id||Object.entries(context.site.sectionBlocks||{}).find(([,blocks])=>blocks.some(block=>block.id===source.id))?.[0];
      try{await context.admin.duplicateContent(item,destination,source.title,overrides);document.querySelector('#cms-editor[open]')?.close();}catch(error){window.BalconApp?.notify(error.message);}
      return;
    }
    const button=event.target.closest('[data-editor-draw]');if(!button)return;
    const context=window.BZEditor.context?.();if(!context?.admin?.isAdmin)return;
    try{document.querySelector('#cms-editor[open]')?.close();const result=await draw();if(result)await context.admin.addDrawn(result,context.route);}catch(error){window.BalconApp?.notify(error.message);}
  });
  let dragging=null;
  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.drawn-move-handle');
    const context=window.BZEditor.context?.();
    if(!handle||!context?.admin?.isAdmin||!document.body.classList.contains('visual-editing'))return;
    event.preventDefault();event.stopImmediatePropagation();
    const node=handle.closest('.drawn-element'),rect=node.getBoundingClientRect();
    dragging={node,rect,style:node.style.cssText,x:event.clientX,y:event.clientY};handle.setPointerCapture(event.pointerId);
  },true);
  document.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const {node,rect,x,y}=dragging,parent=node.parentElement.getBoundingClientRect();
    node.style.left=rect.left-parent.left+event.clientX-x+'px';node.style.top=rect.top-parent.top+event.clientY-y+'px';
  });
  document.addEventListener('pointerup',async event=>{
    if(!dragging)return;
    const current=dragging;dragging=null;
    const context=window.BZEditor.context?.(),main=document.querySelector('main'),rect=current.node.getBoundingClientRect();
    current.node.style.visibility='hidden';const underneath=document.elementFromPoint(event.clientX,event.clientY);current.node.style.visibility='';
    const anchor=underneath?.closest('.custom-block:not(.drawn-element),[data-layout-key]');
    const target=anchor&&main.contains(anchor)?anchor:main,bounds=target.getBoundingClientRect(),page=target===main;
    try {
      const site=clone(context.site),block=allBlocks(site).find(block=>'block-'+block.id===current.node.dataset.layoutKey);
      block.floating.anchor=page?'page':target.dataset.layoutKey;
      block.floating.positions[screen()]={x:Math.max(0,Math.min(1-rect.width/bounds.width,(rect.left-bounds.left)/bounds.width)),y:page?Math.max(0,rect.top-bounds.top):Math.max(0,Math.min(1,(rect.top-bounds.top)/bounds.height)),width:Math.max(.02,Math.min(1,rect.width/bounds.width)),height:Math.round(rect.height)};
      await context.admin.applyDocument(site);
    }catch(error){current.node.style.cssText=current.style;window.BalconApp?.notify(error.message);}
  });
  document.addEventListener('pointercancel',()=>{if(dragging)dragging.node.style.cssText=dragging.style;dragging=null;});
  addEventListener('resize',()=>requestAnimationFrame(()=>{if(activeSite)placeOverlays(activeSite);}));
  window.BZEditor={fields,slideFields,imageField,prepareSite,duplicate,pruneOverlays,copyItem,editPath,beforeRefresh,placeOverlays,draw,recipeDetail};
})();
