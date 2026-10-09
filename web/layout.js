import {esc} from './markup.js';
import {clone,safeHref,imageURL,iconMarkup} from './site-model.js';
import {elementBindings,getContentField} from './content-binding.js';
const cross='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4" stroke="currentColor" stroke-width="1.5"/></svg>';
const screenKind=()=>innerWidth<=700?'phone':innerWidth<=1100?'tablet':'desktop';
const screenLabels={phone:'móvil',tablet:'tableta',desktop:'escritorio'};
export function createLayout({getSite,getAdmin,notify,onLayoutChange}){
 let nodes=new Map(),containers=new Map(),regions=new Map(),tab='',fullEditing=false,selected='',frame,drag,suppressClick=0,lastScreen=screenKind();
 const originalStyles=new WeakMap(),originalParents=new WeakMap(),regionStyles=new WeakMap(),tools=new Map();
 const layer=document.createElement('div');layer.id='layout-edit-layer';layer.setAttribute('aria-label','Herramientas de edición visual');document.body.append(layer);
 const moveDialog=document.createElement('dialog');moveDialog.id='layout-move-dialog';moveDialog.setAttribute('aria-labelledby','layout-move-title');document.body.append(moveDialog);
 const excluded='form,#my-works,#public-works,#lab-count,[data-work-review],.reader-controls,.pdf-stage,#editor-tools,#brand-edit,.section-admin-toolbar,.carousel-controls';
 function restorePositions(){
  for(const el of nodes.values())if(el.isConnected&&originalStyles.has(el)){const origin=originalParents.get(el);if(origin?.parent.isConnected&&el.parentElement!==origin.parent)origin.parent.insertBefore(el,origin.before?.parentElement===origin.parent?origin.before:null);el.style.cssText=originalStyles.get(el);el.classList.remove('free-layout-element');}
  for(const el of regions.values())if(regionStyles.has(el)){const saved=regionStyles.get(el);el.style.position=saved.position;el.style.minHeight=saved.minHeight;}
 }
 function collect(currentTab){tab=currentTab;nodes=new Map();containers=new Map();regions=new Map();
  const roots=[[document.querySelector('.masthead'),'cabecera'],[document.querySelector('.navigation'),'navegacion'],[document.querySelector('main'),`page-${tab}`],[document.querySelector('#restaurant-location'),'ubicacion'],[document.querySelector('.footer'),'pie']];
  for(const[root,prefix]of roots){if(!root)continue;root.dataset.editContainer=prefix;regions.set(prefix,root);
   const keyOf=el=>{if(el===root)return prefix;if(el.dataset.editKey)return el.dataset.editKey;if(el.dataset.editContainer)return el.dataset.editContainer;
    const parts=[];let node=el;while(node&&node!==root){const id=node.dataset.layoutKey||node.dataset.recipe||node.dataset.news||node.dataset.favorite||node.dataset.nav;if(id){parts.unshift(`${node.tagName.toLowerCase()}-${id}`);break;}parts.unshift(`${node.tagName.toLowerCase()}-${[...node.parentElement.children].filter(x=>x.tagName===node.tagName&&!x.hasAttribute('data-visual-image')&&!x.hasAttribute('data-visual-icon')).indexOf(node)}`);node=node.parentElement;}return prefix+':'+parts.join('.');};
   for(const el of [root,...root.querySelectorAll('*')]){if(el.closest(excluded)||el.matches('.edit-pencil,.close-button')||el.closest('[data-visual-image],[data-visual-icon]'))continue;
    const key=keyOf(el);el.dataset.editContainer=key;containers.set(key,el);
    if(el.matches('h1,h2,h3,p,img,a,button,strong,small,.eyebrow,.subtle,.text-link,.location-label,.location-label>span,.shortcut-card>span,.pilot-label,.footer>span,[data-layout-key]')){el.dataset.editKey=key;nodes.set(key,el);}
   }
  }
 }
 const isGroup=el=>el.matches('[data-layout-key]')||!!el.querySelector('h1,h2,h3,p,form');
 function replaceText(el,text){
  if(el.dataset.visualText===text)return;
  const media=[...el.children].filter(child=>child.matches('img,svg,[aria-hidden="true"],[data-visual-image],[data-visual-icon]'));
  const span=document.createElement('span');span.className='visual-text';span.textContent=text;el.replaceChildren(span,...media);el.dataset.visualText=text;
 }
 function apply(){
  for(const[key,value]of Object.entries(getSite().elementOverrides||{})){const el=nodes.get(key);if(!el)continue;
   if(!originalStyles.has(el))originalStyles.set(el,el.style.cssText);
   if(value.text!==undefined&&el.tagName!=='IMG'&&!isGroup(el))replaceText(el,value.text);
   if(el.tagName!=='IMG'&&value.image){let photo=el.querySelector(':scope>[data-visual-image]');if(!photo){photo=document.createElement('img');photo.dataset.visualImage='';photo.className='element-added-image';el.append(photo);}photo.src=imageURL(value.image);photo.alt=value.alt||'';}
   if(el.tagName==='IMG'&&value.image)el.src=imageURL(value.image);
   if(el.tagName==='IMG'&&value.alt!==undefined)el.alt=value.alt;
   if(el.tagName==='A'&&value.link)el.href=safeHref(value.link);
   if(value.icon&&value.icon!=='none'&&el.tagName!=='IMG'){let icon=el.querySelector(':scope>[data-visual-icon]');if(!icon){icon=document.createElement('span');icon.dataset.visualIcon='';el.append(icon);}icon.innerHTML=iconMarkup(value.icon);}
   for(const property of ['color','backgroundColor','borderColor'])if(/^#[a-f0-9]{6}$/i.test(value[property]||''))el.style[property]=value[property];
   if(value.align)el.style.textAlign=value.align;if(value.size)el.style.fontSize=`${value.size}px`;
   if(value.placement){const parent=containers.get(value.placement.container),before=nodes.get(value.placement.before);if(parent&&parent!==el&&!el.contains(parent)&&!parent.closest('button,a,form')&&(parent!==document.querySelector('.navigation')||el.tagName==='A')){if(!before||before.parentElement===parent)parent.insertBefore(el,before||null);}}
  }
  applyFreePositions();
 }
 function applyFreePositions(){
  const heights=new Map([...regions].map(([key,root])=>[key,root.getBoundingClientRect().height]));
  for(const[key,value]of Object.entries(getSite().elementOverrides||{})){const position=value.positions?.[screenKind()],el=nodes.get(key),root=regions.get(position?.container);if(!position||!el||!root||el===root||el.contains(root))continue;
   if(!originalStyles.has(el))originalStyles.set(el,el.style.cssText);
   if(!originalParents.has(el))originalParents.set(el,{parent:el.parentElement,before:el.nextSibling});
   if(!regionStyles.has(root))regionStyles.set(root,{position:root.style.position,minHeight:root.style.minHeight});
   root.style.position='relative';const width=root.getBoundingClientRect().width;if(!width)continue;
   const fraction=Math.min(1,Math.max(Math.min(44/width,1),position.width)),left=Math.min(1-fraction,Math.max(0,position.x));
   root.append(el);el.classList.add('free-layout-element');Object.assign(el.style,{position:'absolute',left:`${left*100}%`,top:`${position.y}px`,width:`${fraction*100}%`,maxWidth:'100%',margin:'0',transform:'none',zIndex:'2'});
   const height=Math.max(heights.get(position.container)||0,position.y+el.getBoundingClientRect().height+24);heights.set(position.container,height);root.style.minHeight=`${height}px`;
  }
 }
 function label(el){return(el.dataset.layoutLabel||el.getAttribute('alt')||el.getAttribute('aria-label')||el.textContent||'Imagen').trim().slice(0,65);}
 const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(paint);};
 function paint(){if(drag)return;const visible=new Set();for(const el of nodes.values())el.classList.remove('visual-edit-selected');
  const available=getAdmin()?.isAdmin&&!['admin','cuenta','registro','recuperar','nueva-clave'].includes(tab),bar=document.querySelector('#editor-tools');let hint=bar?.querySelector('.visual-edit-help');
  if(fullEditing&&available&&!hint){hint=document.createElement('span');hint.className='visual-edit-help';hint.textContent='Toca un elemento: lápiz para editar, cruz para mover. Cierra la edición para usar los menús.';bar?.append(hint);}else if(!fullEditing||!available)hint?.remove();
  if(!available){for(const tool of tools.values())tool.remove();tools.clear();return;}
  const toggle=document.querySelector('[data-layout-toggle]');if(toggle){toggle.setAttribute('aria-pressed',String(fullEditing));toggle.textContent=fullEditing?'Cerrar edición de elementos':'Editar todos los elementos';}
  if(fullEditing&&(!nodes.has(selected)||!nodes.get(selected).isConnected)){selected=[...nodes].find(([,el])=>el.tagName==='H1')?.[0]||'';}
  const entries=[...nodes].filter(([key,el])=>fullEditing?key===selected:el.matches('[data-layout-key],.footer>span'));
  for(const[key,el]of entries){const r=el.getBoundingClientRect();if(r.width<12||r.height<8||r.bottom<0||r.top>innerHeight||(!fullEditing&&r.top<0)||el.closest('[hidden]'))continue;
   if(fullEditing)el.classList.add('visual-edit-selected');const toolKey=`${fullEditing?'element':'group'}:${key}`;visible.add(toolKey);let tool=tools.get(toolKey);
   if(!tool){tool=document.createElement('div');tool.className='layout-float-tools';tool.innerHTML=(fullEditing?`<button type="button" data-layout-edit="${esc(key)}">✎</button>`:'')+`<button type="button" class="layout-cross" data-layout-move="${esc(key)}">${cross}</button>`;tools.set(toolKey,tool);layer.append(tool);}
   tool.querySelector('[data-layout-edit]')?.setAttribute('aria-label',`Editar elemento: ${label(el)}`);tool.querySelector('[data-layout-move]').setAttribute('aria-label',`Mover elemento: ${label(el)}`);
   tool.style.left=`${Math.max(4,Math.min(innerWidth-110,r.right-110))}px`;tool.style.top=`${Math.max(2,Math.min(innerHeight-50,fullEditing?r.top-46:r.top+10))}px`;
  }
  for(const[key,tool]of tools)if(!visible.has(key)){tool.remove();tools.delete(key);}
 }
 async function moveBefore(key,targetKey){const el=nodes.get(key),target=nodes.get(targetKey);if(!el||!target||el===target||el.contains(target)||target.parentElement.closest('button,a,form'))throw new Error('Elige otro elemento como destino.');const parent=target.parentElement;if(parent===document.querySelector('.navigation')&&el.tagName!=='A')throw new Error('La navegación admite accesos a secciones.');const next=clone(getSite());next.elementOverrides||={};const value=next.elementOverrides[key]||={};value.placement={container:parent.dataset.editContainer,before:targetKey};if(value.positions)delete value.positions[screenKind()];await getAdmin().applyDocument(next);notify('Ubicación cambiada en el borrador. Puedes devolverla a su origen.');}
 async function moveFree(key,container,x,y,width){const el=nodes.get(key),root=regions.get(container);if(!el||!root||el===root||el.contains(root))throw new Error('Elige otra zona de la página.');const next=clone(getSite());next.elementOverrides||={};const value=next.elementOverrides[key]||={};value.positions||={};value.positions[screenKind()]={container,x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(50000,y)),width:Math.max(.01,Math.min(1,width))};selected=key;await getAdmin().applyDocument(next);notify(`Posición libre guardada para ${screenLabels[screenKind()]}. Puedes devolverla a su origen.`);}
 function openEdit(key){const el=nodes.get(key);if(!el)return;const bindings=elementBindings(el),defaults={text:el.tagName==='IMG'||isGroup(el)?'':el.textContent,link:el.tagName==='A'?el.getAttribute('href'):'',image:el.tagName==='IMG'?el.getAttribute('src'):'',alt:el.getAttribute('alt')||'',icon:'none',align:el.style.textAlign||'left',size:Math.min(100,parseFloat(getComputedStyle(el).fontSize)||16)};for(const[property,path]of Object.entries(bindings)){const value=getContentField(getSite(),path);if(value!==undefined)defaults[property]=value;}getAdmin().editElement(key,defaults,el.tagName,isGroup(el),bindings);}
 function openMove(key){const el=nodes.get(key);if(!el)return;const saved=getSite().elementOverrides?.[key]?.positions?.[screenKind()];const options=[...nodes].filter(([k,target])=>k!==key&&!el.contains(target)&&target.getBoundingClientRect().height>0&&!target.parentElement.closest('button,a,form')).map(([k,target])=>`<option value="${esc(k)}">${esc(label(target))}</option>`).join('');
  moveDialog.innerHTML=`<button class="close-button" data-layout-close aria-label="Cerrar">✕</button><h2 id="layout-move-title">Mover ${esc(label(el))}</h2><p>Arrastra la cruz a cualquier punto, incluso un espacio vacío. Las posiciones libres se guardan por pantalla para conservar el diseño en móvil, tableta y escritorio.</p><form data-layout-position="${esc(key)}"><label class="cms-field">Forma de mover<select name="mode"><option value="order">Antes de un elemento</option><option value="free" ${saved?'selected':''}>Posición libre</option></select></label><div data-order-fields><label class="cms-field">Colocar antes de<select name="target">${options}</select></label></div><div data-free-fields ${saved?'':'hidden'}><label class="cms-field">Zona de la página<select name="container">${[...regions].map(([id,root])=>`<option value="${id}" ${(saved?.container||`page-${tab}`)===id?'selected':''}>${{cabecera:'Cabecera',navegacion:'Navegación',ubicacion:'Ubicación',pie:'Pie de página'}[id]||'Contenido de esta sección'}</option>`).join('')}</select></label><label class="cms-field">Posición horizontal (%)<input name="x" type="number" min="0" max="100" value="${Math.round((saved?.x||0)*100)}" required></label><label class="cms-field">Distancia desde arriba (px)<input name="y" type="number" min="0" max="50000" value="${Math.round(saved?.y||0)}" required></label><p class="subtle">Editando la posición para ${screenLabels[screenKind()]}.</p></div><button class="button">Mover aquí</button></form><button class="button secondary" data-layout-reset="${esc(key)}">Devolver a su origen</button>`;
  moveDialog.querySelector('[data-order-fields]').hidden=!!saved;moveDialog.showModal();
 }
 layer.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-layout-move],[data-layout-edit]');if(!button)return;const key=button.dataset.layoutMove||button.dataset.layoutEdit,el=nodes.get(key),r=el.getBoundingClientRect();drag={key,kind:button.hasAttribute('data-layout-edit')?'edit':'move',startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,width:r.width,height:r.height,moved:false,button};button.setPointerCapture(event.pointerId);});
 layer.addEventListener('pointermove',event=>{if(!drag||drag.kind==='edit')return;drag.lastX=event.clientX;drag.lastY=event.clientY;if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>8){drag.moved=true;document.body.classList.add('is-layout-dragging');if(!drag.ghost){const ghost=nodes.get(drag.key).cloneNode(true);ghost.querySelectorAll('[id],.edit-pencil').forEach(child=>{child.removeAttribute('id');if(child.matches('.edit-pencil'))child.remove();});ghost.removeAttribute('id');ghost.className='layout-drag-preview';ghost.style.width=`${Math.min(drag.width,innerWidth-20)}px`;ghost.style.maxHeight='180px';drag.ghost=ghost;layer.append(ghost);}drag.ghost.style.left=`${Math.max(0,event.clientX-Math.min(drag.width,innerWidth-20)/2)}px`;drag.ghost.style.top=`${event.clientY}px`;}});
 function edgeScroll(){if(!drag?.moved)return;if(drag.lastY<90)window.scrollBy(0,-20);else if(drag.lastY>innerHeight-90)window.scrollBy(0,20);drag.scrollFrame=requestAnimationFrame(edgeScroll);}
 layer.addEventListener('pointermove',()=>{if(drag?.moved&&!drag.scrollFrame)drag.scrollFrame=requestAnimationFrame(edgeScroll);});
 function stopDrag(){if(!drag)return;cancelAnimationFrame(drag.scrollFrame);drag.ghost?.remove();document.body.classList.remove('is-layout-dragging');const current=drag;drag=null;return current;}
 layer.addEventListener('pointerup',event=>{const current=stopDrag();if(!current)return;if(!current.moved){suppressClick=Date.now()+400;if(current.kind==='edit')openEdit(current.key);else openMove(current.key);schedule();return;}suppressClick=Date.now()+400;layer.hidden=true;const under=document.elementFromPoint(event.clientX,event.clientY);layer.hidden=false;const destination=[...regions].find(([,root])=>root.contains(under))||[...regions].find(([key])=>key===`page-${tab}`);if(destination){const[key,root]=destination,r=root.getBoundingClientRect();void moveFree(current.key,key,(event.clientX-r.left-current.width/2)/r.width,event.clientY-r.top,current.width/r.width).catch(error=>notify(error.message));}schedule();});
 layer.addEventListener('pointercancel',()=>{stopDrag();schedule();});
 document.addEventListener('pointerdown',()=>{suppressClick=0;},true);
 document.addEventListener('click',event=>{if(event.detail>0&&Date.now()<suppressClick){suppressClick=0;event.preventDefault();event.stopImmediatePropagation();return;}if(!fullEditing||['admin','cuenta','registro','recuperar','nueva-clave'].includes(tab)||!getAdmin()?.isAdmin||event.target.closest('dialog,#layout-edit-layer,#editor-tools,.edit-pencil,.section-admin-toolbar,form,.carousel-controls'))return;const el=event.target.closest('[data-edit-key]');if(!el||!nodes.has(el.dataset.editKey))return;event.preventDefault();event.stopImmediatePropagation();selected=el.dataset.editKey;schedule();},true);
 document.addEventListener('click',event=>{const button=event.target.closest('[data-layout-edit],[data-layout-move],[data-layout-reset],[data-layout-close],[data-layout-toggle],[data-layout-reset-all]');if(!button||!getAdmin()?.isAdmin||(button.closest('#layout-edit-layer')&&Date.now()<suppressClick))return;
  if(button.hasAttribute('data-layout-toggle')){fullEditing=!fullEditing;document.body.classList.toggle('visual-editing',fullEditing);schedule();return;}
  if(button.hasAttribute('data-layout-close')){moveDialog.close();return;}
  if(button.dataset.layoutEdit){openEdit(button.dataset.layoutEdit);return;}
  if(button.dataset.layoutMove){openMove(button.dataset.layoutMove);return;}
  if(button.dataset.layoutReset||button.hasAttribute('data-layout-reset-all')){const next=clone(getSite());for(const[key,value]of Object.entries(next.elementOverrides||{}))if(button.hasAttribute('data-layout-reset-all')||key===button.dataset.layoutReset){delete value.placement;delete value.positions;}moveDialog.close();void getAdmin().applyDocument(next).then(()=>notify('Se restauró la ubicación original.')).catch(error=>notify(error.message));}
 });
 moveDialog.addEventListener('change',event=>{if(event.target.name==='mode'){const free=event.target.value==='free';moveDialog.querySelector('[data-order-fields]').hidden=free;moveDialog.querySelector('[data-free-fields]').hidden=!free;}});
 moveDialog.addEventListener('submit',event=>{event.preventDefault();const form=event.target,value=new FormData(form),key=form.dataset.layoutPosition;const el=nodes.get(key),root=regions.get(value.get('container'));const action=value.get('mode')==='free'?moveFree(key,value.get('container'),Number(value.get('x'))/100,Number(value.get('y')),getSite().elementOverrides?.[key]?.positions?.[screenKind()]?.width||el.getBoundingClientRect().width/root.getBoundingClientRect().width):moveBefore(key,value.get('target'));void action.then(()=>moveDialog.close()).catch(error=>notify(error.message));});
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',()=>{const next=screenKind();if(next!==lastScreen){lastScreen=next;onLayoutChange?.();}else{applyFreePositions();schedule();}});document.addEventListener('pointerup',schedule);
 return {mount(currentTab){restorePositions();collect(currentTab);apply();schedule();},beforeRefresh(){restorePositions();},refresh(){collect(tab);apply();schedule();}};
}
