export const frameScreen=()=>innerWidth<=700?'phone':innerWidth<=1100?'tablet':'desktop';
export function applyModuleFrame(el,value){
 if(!value?.moduleWidth||value.moduleScreen&&value.moduleScreen!==frameScreen())return;
 const width=Math.max(5,Math.min(100,Number(value.moduleWidth))),offset=Math.max(0,Math.min(100-width,Number(value.moduleOffset)||0));
 el.classList.add('module-framed');el.style.width=width+'%';el.style.marginInlineStart=offset+'%';el.style.height=Math.max(80,Math.min(2000,Number(value.moduleHeight)||300))+'px';
}
export function drawModuleBox(){return new Promise(resolve=>{
 const main=document.querySelector('main'),base=main.getBoundingClientRect();let start,box;
 const surface=document.createElement('div');surface.className='module-draw-surface';surface.setAttribute('role','dialog');surface.setAttribute('aria-label','Dibujar espacio del módulo');surface.innerHTML='<div class="module-draw-help"><strong>Dibuja el espacio del módulo</strong><span>Arrastra con el dedo, lápiz o ratón. El contenido se acomodará dentro del cuadro.</span><button type="button" data-draw-auto>Usar tamaño automático</button><button type="button" data-draw-cancel>Cancelar dibujo</button></div><div class="module-draw-box" hidden></div>';document.body.append(surface);const previous=document.activeElement;surface.querySelector('button').focus();const marker=surface.querySelector('.module-draw-box');
 const finish=value=>{window.removeEventListener('keydown',escape);surface.remove();previous?.focus?.({preventScroll:true});resolve(value);};const escape=e=>{if(e.key==='Escape')finish(null);};window.addEventListener('keydown',escape);
 surface.querySelector('[data-draw-cancel]').onclick=()=>finish(null);surface.querySelector('[data-draw-auto]').onclick=()=>finish({});
 const point=e=>({x:Math.max(base.left,Math.min(base.right,e.clientX)),y:Math.max(100,Math.min(innerHeight,e.clientY))});
 surface.onpointerdown=e=>{if(e.target.closest('button,.module-draw-help'))return;e.preventDefault();start=point(e);surface.setPointerCapture(e.pointerId);marker.hidden=false;};
 surface.onpointermove=e=>{if(!start)return;e.preventDefault();const p=point(e);box={x:Math.min(p.x,start.x),y:Math.min(p.y,start.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};Object.assign(marker.style,{left:box.x+'px',top:box.y+'px',width:box.w+'px',height:box.h+'px'});};
 surface.onpointerup=e=>{if(!start)return;surface.onpointermove(e);if(box.w<40||box.h<40){start=null;marker.hidden=true;return;}const before=[...main.querySelectorAll('.custom-block')].find(el=>el.getBoundingClientRect().top>=box.y)?.dataset.layoutKey?.replace('block-','');finish({moduleWidth:Math.min(100,box.w/base.width*100),moduleHeight:Math.min(2000,box.h),moduleOffset:Math.max(0,(box.x-base.left)/base.width*100),moduleScreen:frameScreen(),before});};surface.onpointercancel=()=>{start=null;marker.hidden=true;};
});}
export function sectionTemplate(kind,uid){const block=(type,title,extra={})=>({id:uid('block'),type,title,text:'',image:'',icon:'none',slides:[],...extra});
 if(kind==='editorial')return {layout:'list',blocks:[block('banner','Presentación de la sección',{image:'@table'}),block('text','Una historia por contar',{text:'Escribe aquí la presentación de tu sección.'})]};
 if(kind==='gallery')return {layout:'grid',blocks:[block('image','Primer proyecto',{image:'@chef'}),block('image','Segundo proyecto',{image:'@table'})]};
 if(kind==='research')return {layout:'list',blocks:[block('banner','Investigación y desarrollo',{image:'@chef'}),block('text','Propósito y proceso',{text:'Documenta el objetivo, la técnica y tus observaciones.'}),block('carousel','Resultados y aprovechamientos',{presentation:'split',textMode:'individual',interval:3000,autoplay:true,slides:[{image:'@table',alt:'Fotografía de muestra',title:'Primer hallazgo',text:'',imageAlign:'left'},{image:'@chef',alt:'Fotografía de muestra',title:'Desarrollo',text:'',imageAlign:'right'}]})]};
 return {layout:'list',blocks:[],empty:true};}
