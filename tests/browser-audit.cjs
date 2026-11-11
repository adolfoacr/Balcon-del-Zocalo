/* Run with a local Chromium and Playwright. All service requests are intercepted;
   this suite never signs into, uploads to, or publishes to the real Supabase. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.BZ_PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(__dirname,'..');
const artifacts=process.env.BZ_AUDIT_ARTIFACTS || path.join(root,'.audit-artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const config=JSON.parse(fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script[^>]*id="service-config"[^>]*>(.*?)<\/script>/s)[1]);
const user={id:'00000000-0000-4000-8000-000000000001',email:'local-audit@example.test',user_metadata:{full_name:'Auditoría local'}};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const sampleFeed={version:1,sourceURL:'https://www.culinariamexicana.com.mx/',sourceName:'Culinaria Mexicana',updatedAt:'2026-11-11T00:00:00Z',items:[1,2,3].map(index=>({id:'external-test-'+index,title:'Noticia de prueba '+index,url:'https://www.culinariamexicana.com.mx/nota-de-prueba-'+index+'/',excerpt:'Resumen de prueba del medio.',image:'',publishedAt:'2026-11-10T12:00:00Z'}))};
const server=http.createServer((req,res)=>{
 const requested=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(requested!==root && !requested.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=requested===root ? path.join(root,'index.html') : requested;
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(data);});
});
const results=[];
let browser;
const check=async(name,work)=>{await work();results.push(name);console.log('PASS '+name);};
async function ready(page,route='noticias') {
 await page.goto(base+'/#'+route,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.BalconApp && document.querySelector('main').children.length>0);
 assert.equal(await page.locator('main').innerText().then(t=>t.includes('No pudimos cargar la experiencia')),false);
}
async function mock(context,state) {
 await context.route('**/*',async route=>{
  const request=route.request(), url=new URL(request.url());
  if(url.origin===base){
   if(url.pathname==='/data/media-news.json')return route.fulfill({contentType:'application/json',body:JSON.stringify(state.feed || sampleFeed)});
   return route.continue();
  }
  if(url.origin!==config.url) {if(url.protocol==='data:')return route.continue();return route.abort();}
  const pathname=url.pathname;
  let response=[];
  if(pathname==='/rest/v1/cms_site')response=state.document ? [{document:state.document,revision:state.revision || 1}] : [];
  else if(pathname==='/auth/v1/user')response=user;
  else if(pathname==='/rest/v1/cms_admins')response=[{user_id:user.id,owner:true,chef:true}];
  else if(pathname==='/rest/v1/rpc/publish_site') {
   if(state.failPublish)return route.fulfill({status:400,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:'22023',message:'invalid_document'})});
   const data=request.postDataJSON();assert.equal(data.expected_revision,state.revision || 1);
   state.document=data.new_document;state.revision=(state.revision || 1)+1;state.publications=(state.publications || 0)+1;
   response={revision:state.revision};
  } else if(pathname.startsWith('/storage/v1/object/site-media/')) {
   state.uploads=(state.uploads || 0)+1;state.lastUploadBytes=request.postDataBuffer()?.length;response={Key:pathname};
  } else if(pathname.startsWith('/storage/v1/object/public/')) {
   return route.fulfill({status:200,contentType:'image/png',body:Buffer.from(png.split(',')[1],'base64')});
  } else if(pathname.startsWith('/auth/'))response={};
  return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(response)});
 });
}
async function adminContext(state) {
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await mock(context,state);
 await context.addInitScript(({url})=>sessionStorage.setItem('balcon-session:'+url,JSON.stringify({access_token:'LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',expires_at:Date.now()/1000+3600})),{url:config.url});
 return context;
}
let base;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({executablePath:process.env.BZ_CHROMIUM || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 const publicContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await mock(publicContext,{});
 const page=await publicContext.newPage();page.on('pageerror',error=>errors.push(error.message));
 await ready(page);
 const initial=await page.evaluate(()=>structuredClone(window.BalconApp.site));
 await check('Public routes at desktop, tablet, and phone widths',async()=>{
  for(const width of [320,390,768,1100,1440]) {
   await page.setViewportSize({width,height:1000});
   for(const route of ['noticias','recetario','libro','comparte','novedades','section-fbc97490-7ba','cuenta','registro','recuperar']) {
    await page.evaluate(route=>{location.hash=route;},route);
    await page.waitForFunction(route=>document.body.dataset.tab===route,route);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow at ${width}px #${route}`);
   }
  }
 });
 await check('Sister companies template has no controls strip and keeps keyboard navigation',async()=>{
  await page.setViewportSize({width:1440,height:1000});await ready(page,'section-fbc97490-7ba');
  assert.equal(await page.locator('.sister-page').count(),1);
  const carousel=page.locator('.sister-hero [data-carousel]');
  assert.equal(await carousel.locator('[data-carousel-slide]:visible').count(),1);
  assert.equal(await page.locator('[data-carousel-controls]:visible,.carousel-controls:visible').count(),0);
  const step=async key=>{await carousel.locator('[data-carousel-slide]:visible .carousel-media').focus();await page.keyboard.press(key);};
  await step('ArrowRight');assert.equal(await carousel.getAttribute('data-active-slide'),'1');
  await step('ArrowRight');assert.equal(await carousel.getAttribute('data-active-slide'),'2');
  await step('ArrowLeft');assert.equal(await carousel.getAttribute('data-active-slide'),'1');
  await step('ArrowLeft');
  await carousel.locator('[data-carousel-slide]:visible .carousel-media').evaluate(el=>el.blur());
  await page.screenshot({path:path.join(artifacts,'empresas-hermanas-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>{const link=document.querySelector('.navigation [aria-current="page"]');if(!link)return false;const rect=link.getBoundingClientRect();return rect.left>=0 && rect.right<=innerWidth+1;});
  assert.equal(await page.locator('[data-carousel-controls]:visible,.carousel-controls:visible').count(),0);
  await page.screenshot({path:path.join(artifacts,'empresas-hermanas-mobile.png'),fullPage:true});
  assert.ok(await page.locator('.sister-spaces .custom-block').count()>=3);
 });
 await check('External news load original links and rotate automatically without controls',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await ready(page,'novedades');
  const carousel=page.locator('.media-feed-carousel');await carousel.waitFor();
  assert.equal(await carousel.locator('[data-carousel-slide]').count(),3);
  assert.equal(await carousel.getAttribute('data-interval'),'6000');
  assert.equal(await carousel.locator('.media-feed-slide:visible h3 a').getAttribute('href'),sampleFeed.items[0].url);
  assert.equal(await page.locator('[data-carousel-controls]:visible,.carousel-controls:visible').count(),0);
  await page.waitForFunction(()=>document.querySelector('.media-feed-carousel')?.dataset.activeSlide==='1',{},{timeout:9000});
  await page.emulateMedia({reducedMotion:'reduce'});
 });

 const make=(id,type,extra={})=>({id,type,title:'Título '+id,text:'Texto del elemento',image:'',icon:'none',slides:[],...extra});
 const fixture=structuredClone(initial);
 fixture.pages.push({id:'audit',title:'Pruebas del editor',layout:'list',blocks:[
  make('banner','banner',{image:'@table'}),
  make('image','image',{image:'@table'}),
  make('legacy','text',{plain:true}),
  make('text','text'),make('title','title'),
  make('button','button',{buttonLabel:'Abrir recetario',link:'#recetario'}),
  make('shortcut','shortcut',{image:'@table',buttonLabel:'Explorar',link:'#recetario'}),
  make('inline','image',{image:png}),
  make('group','group',{snapshot:{tag:'div',children:[{tag:'h2',children:[{text:'Grupo de prueba'}]}]}}),
  make('carousel','carousel',{presentation:'overlay',textMode:'individual',interval:2000,autoplay:false,slides:[
   {image:'@table',imageFit:'cover',imageFocusX:0,imageFocusY:100,title:'Primera imagen',text:'Un texto extenso. '.repeat(90),buttonLabel:'Recetario',buttonLink:'#recetario'},
   {image:'@chef',imageFit:'contain',imageZoom:150,title:'Segunda imagen',text:'Otro contenido',buttonLabel:'Visitar',buttonLink:'https://example.com/'}
  ]})
 ]});
 fixture.navigation.push({id:'audit',label:'Pruebas',visible:true,icon:'none'});
 // An older visual edit must not silently override a later edit in the block form.
 fixture.elementOverrides['page-audit:article-block-banner']={backgroundMode:'solid',backgroundColor:'#442211',borderMode:'none'};
 const state={document:fixture,revision:1};
 const admin=await adminContext(state);const editor=await admin.newPage();editor.on('pageerror',error=>errors.push(error.message));
 await ready(editor,'audit');
 const drawer=editor.locator('#cms-editor');
 const ensureEditing=async()=>{if(!await editor.evaluate(()=>document.body.classList.contains('visual-editing')))await editor.locator('[data-layout-toggle]').click();};
 const openBlock=async id=>{await ensureEditing();await editor.locator(`[data-edit-panel="blocks"][data-edit-id="${id}"]`).click();await drawer.waitFor({state:'visible'});};
 const submit=async()=>{await drawer.locator('button[type="submit"]').click();await drawer.waitFor({state:'hidden'});};
 await check('News source URL and rotation interval can be edited and automatic news disabled',async()=>{
  await ready(editor,'novedades');await ensureEditing();
  await editor.locator('.media-feed-actions [data-edit-panel="newsPage"]').click();
  assert.equal(await drawer.locator('[name="newsPage.mediaSourceURL"]').inputValue(),sampleFeed.sourceURL);
  await drawer.locator('[name="newsPage.mediaInterval"]').fill('3');await submit();
  await editor.waitForFunction(()=>document.querySelector('.media-feed-carousel')?.dataset.interval==='3000');
  await editor.locator('.media-feed-actions [data-edit-panel="newsPage"]').click();
  await drawer.locator('[name="newsPage.mediaEnabled"]').uncheck();await submit();
  assert.equal(await editor.locator('[data-media-feed]').count(),0);
  await editor.locator('.media-feed-actions [data-edit-panel="newsPage"]').click();
  await drawer.locator('[name="newsPage.mediaEnabled"]').check();await submit();await editor.locator('.media-feed-carousel').waitFor();
  await ready(editor,'audit');
 });
 await check('Independent background and border controls on all eight block types',async()=>{
  for(const id of ['banner','image','text','title','button','shortcut','group','carousel']) {
   await openBlock(id);
   await drawer.locator('[name="backgroundMode"]').selectOption('solid');
   await drawer.locator('[name="backgroundColor"]').fill('#234567');await drawer.locator('[name="backgroundColor"]').dispatchEvent('input');
   await drawer.locator('[name="borderMode"]').selectOption('solid');
   await drawer.locator('[name="borderColor"]').fill('#abcdef');await drawer.locator('[name="borderColor"]').dispatchEvent('input');
   await submit();
   const style=await editor.locator(`[data-layout-key="block-${id}"]`).evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopStyle,color:getComputedStyle(el).borderTopColor}));
   assert.deepEqual(style,{bg:'rgb(35, 69, 103)',border:'solid',color:'rgb(171, 205, 239)'},id);
   await openBlock(id);await drawer.locator('[name="backgroundMode"]').selectOption('transparent');await submit();
   assert.equal(await editor.locator(`[data-layout-key="block-${id}"]`).evaluate(el=>getComputedStyle(el).borderTopStyle),'solid',id+' keeps the border with no background');
   await openBlock(id);await drawer.locator('[name="borderMode"]').selectOption('none');await submit();
   const cleared=await editor.locator(`[data-layout-key="block-${id}"]`).evaluate(el=>({bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderTopWidth}));
   assert.deepEqual(cleared,{bg:'rgba(0, 0, 0, 0)',border:'0px'},id);
  }
 });
 await check('Legacy plain blocks can regain a background and border',async()=>{
  await openBlock('legacy');assert.equal(await drawer.locator('[name="backgroundMode"]').inputValue(),'transparent');assert.equal(await drawer.locator('[name="borderMode"]').inputValue(),'none');
  await drawer.locator('[name="backgroundMode"]').selectOption('glass');await drawer.locator('[name="borderMode"]').selectOption('solid');await submit();
  assert.equal(await editor.locator('[data-layout-key="block-legacy"]').getAttribute('data-bz-background'),'glass');
  assert.equal(await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='audit').blocks.find(b=>b.id==='legacy').plain),undefined);
 });
 await check('Saving text preserves automatic image fit and banner arrangement',async()=>{
  await openBlock('banner');assert.equal(await drawer.locator('[name="imageAlign"]').inputValue(),'');assert.equal(await drawer.locator('[name="imageFit"]').inputValue(),'');
  await drawer.locator('[name="title"]').fill('Banner corregido');await submit();
  assert.equal(await editor.locator('[data-layout-key="block-banner"]>.block-image').evaluate(el=>getComputedStyle(el).position),'absolute');
 });
 await check('Image width, height, fit, focus, and zoom survive draft reload',async()=>{
  await openBlock('image');
  for(const [name,value] of [['imageWidth','60'],['imageHeight','240'],['imageFocusX','0'],['imageFocusY','100'],['imageZoom','125']])await drawer.locator(`[name="${name}"]`).fill(value);
  await drawer.locator('[name="imageFit"]').selectOption('contain');await submit();
  const image=editor.locator('[data-layout-key="block-image"]>.block-image');
  const expected={fit:'contain',focus:'0% 100%',height:'240px',transform:'matrix(1.25, 0, 0, 1.25, 0, 0)'};
  const readImage=()=>image.evaluate(el=>{const s=getComputedStyle(el);return {fit:s.objectFit,focus:s.objectPosition,height:s.height,transform:s.transform};});
  assert.deepEqual(await readImage(),expected);
  await editor.reload({waitUntil:'networkidle'});assert.deepEqual(await readImage(),expected);
  await openBlock('image');assert.equal(await drawer.locator('[name="imageWidth"]').inputValue(),'60');await drawer.locator('[data-cms-close]').first().click();
 });
 await check('Minimum module height contains long carousel captions without a controls strip',async()=>{
  await openBlock('carousel');await drawer.locator('[name="moduleHeight"]').fill('420');await submit();
  const block=editor.locator('[data-layout-key="block-carousel"]');
  const rects=await block.evaluate(el=>{const copy=el.querySelector('.carousel-entry:not([hidden]) .carousel-copy').getBoundingClientRect(),bounds=el.getBoundingClientRect();return {bottom:copy.bottom,limit:bounds.bottom,height:bounds.height};});
  assert.ok(rects.height>=420);assert.ok(rects.limit>=rects.bottom-1,JSON.stringify(rects));
  await editor.locator('[data-layout-toggle]').click();await block.locator('[data-carousel-slide]:visible .carousel-media').focus();await editor.keyboard.press('ArrowRight');
  assert.equal(await block.locator('[data-carousel-slide]:visible img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
  assert.equal(await block.locator('[data-carousel-slide]:visible img').evaluate(el=>getComputedStyle(el).transform),'matrix(1.5, 0, 0, 1.5, 0, 0)');
 });
 await check('Visual element editor applies text, size, alignment, colors, and icon removal',async()=>{
  await ensureEditing();
  await editor.locator('[data-layout-key="block-text"] h2').click();
  await editor.locator('[data-layout-edit]:visible').click();
  await drawer.locator('[name="text"]').fill('Texto editado visualmente');
  await drawer.locator('[name="size"]').fill('34');await drawer.locator('[name="align"]').selectOption('right');
  await drawer.locator('[name="color"]').fill('#fedcba');await drawer.locator('[name="color"]').dispatchEvent('input');
  await drawer.locator('[name="backgroundMode"]').selectOption('solid');await drawer.locator('[name="backgroundColor"]').fill('#112233');await drawer.locator('[name="backgroundColor"]').dispatchEvent('input');
  await drawer.locator('[name="borderMode"]').selectOption('solid');await drawer.locator('[name="icon"]').selectOption('none');await submit();
  const title=editor.locator('[data-layout-key="block-text"] h2');
  assert.equal(await title.innerText(),'Texto editado visualmente');
  assert.deepEqual(await title.evaluate(el=>{let s=getComputedStyle(el);return [s.fontSize,s.textAlign,s.color,s.backgroundColor,s.borderTopStyle];}),['34px','right','rgb(254, 220, 186)','rgb(17, 34, 51)','solid']);
  await editor.locator('[data-layout-toggle]').click();
 });
 await check('Invalid links show an error inside the open editor and preserve the draft',async()=>{
  await openBlock('button');await drawer.locator('[name="link"]').fill('javascript:alert(1)');await drawer.locator('button[type="submit"]').click();
  await drawer.locator('.form-error:not([hidden])').waitFor();assert.ok(await drawer.isVisible());
  assert.equal(await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='audit').blocks.find(b=>b.id==='button').link),'#recetario');
  await drawer.locator('[data-cms-close]').first().click();
 });
 await check('Template selection persists without discarding existing content',async()=>{
  await ready(editor,'section-fbc97490-7ba');
  await editor.locator('[data-edit-panel="pages"]').first().click({force:true});
  await drawer.locator('[name="template"]').selectOption('standard');await submit();assert.equal(await editor.locator('.sister-page').count(),0);
  await editor.locator('[data-edit-panel="pages"]').first().click({force:true});await drawer.locator('[name="template"]').selectOption('sister-companies');await submit();assert.equal(await editor.locator('.sister-page').count(),1);
  assert.equal(await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='section-fbc97490-7ba').blocks.length),4);
 });
 await check('Explicit split presentation remains editable inside the immersive template',async()=>{
  const id=await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='section-fbc97490-7ba').blocks[0].id);
  await openBlock(id);await drawer.locator('[name="presentation"]').selectOption('split');await submit();
  assert.equal(await editor.locator('.sister-hero .carousel-entry:visible').getAttribute('class').then(value=>value.includes('presentation-split')),true);
  await openBlock(id);await drawer.locator('[name="presentation"]').selectOption('overlay');await submit();
 });
 await check('Original upload bytes are preserved and the resulting URL is saved',async()=>{
  await ready(editor,'audit');await openBlock('image');
  await drawer.locator('[data-cms-upload="image"]').setInputFiles({name:'original.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  await drawer.locator('[name="image"]').evaluate(async (input,origin)=>{
   if(input.value.startsWith(origin))return;
   await new Promise((resolve,reject)=>{let poll=setInterval(()=>{if(input.value.startsWith(origin)){clearInterval(poll);resolve();}},20);setTimeout(()=>{clearInterval(poll);reject(new Error('Upload did not finish'));},3000);});
  },config.url);
  await submit();assert.ok(state.uploads>0);assert.equal(state.lastUploadBytes,Buffer.from(png.split(',')[1],'base64').length);
  assert.ok(await editor.evaluate(origin=>window.BalconApp.site.pages.find(p=>p.id==='audit').blocks.find(b=>b.id==='image').image.startsWith(origin+'/storage/v1/object/public/'),config.url));
 });
 await check('Large inline originals are externalized and UTF-8 publication limits are checked',async()=>{
  const result=await editor.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=1300;canvas.height=900;
   const context=canvas.getContext('2d'),pixels=context.createImageData(canvas.width,canvas.height);
   for(let offset=0;offset<pixels.data.length;offset+=65536)crypto.getRandomValues(pixels.data.subarray(offset,Math.min(offset+65536,pixels.data.length)));
   context.putImageData(pixels,0,0);const image=canvas.toDataURL('image/png');let calls=0,size=0;
   const prepared=await window.BZUI.preparePublication({image,logo:image},async file=>{calls++;size=file.size;return 'https://example.test/original.png';});
   let limit='';try{await window.BZUI.preparePublication({parts:Array(400).fill('é'.repeat(5000))},async()=>{throw new Error('Unexpected upload');});}catch(error){limit=error.message;}
   return {calls,size,original:image.length,output:JSON.stringify(prepared).length,limit};
  });
  assert.ok(result.original>4000000);assert.ok(result.size>4000000);assert.equal(result.calls,1);assert.ok(result.output<1000);assert.match(result.limit,/4 MB/);
 });
 await check('Nested carousels, missing controls, and disposal are handled safely',async()=>{
  const result=await page.evaluate(()=>{
   const root=document.createElement('div');root.innerHTML='<section data-carousel="outer" data-autoplay="false"><div data-carousel-slide><section data-carousel="inner" data-autoplay="false"><div data-carousel-slide><button>Inner</button></div><div data-carousel-slide hidden>Inner 2</div></section></div><div data-carousel-slide hidden>Outer 2</div></section>';
   const dispose=window.BZUI.mountCarousels(root),inner=root.querySelector('[data-carousel="inner"]'),outer=root.querySelector('[data-carousel="outer"]'),button=inner.querySelector('button');
   button.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));const before=[outer.dataset.activeSlide,inner.dataset.activeSlide];
   dispose();button.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));return {before,after:[outer.dataset.activeSlide,inner.dataset.activeSlide]};
  });
  assert.deepEqual(result,{before:['0','1'],after:['0','1']});
 });
 await check('New elements can be created, linked, and deleted through the editor',async()=>{
  await ready(editor,'audit');await ensureEditing();
  await editor.locator('[data-cms-add-menu="audit"]').click();await drawer.locator('[data-new-element="button"]').click();
  const id=await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='audit').blocks.at(-1).id);
  await drawer.locator('[name="buttonLabel"]').fill('Acceso de prueba');await drawer.locator('[name="link"]').fill('#recetario');await submit();
  assert.equal(await editor.locator(`[data-layout-key="block-${id}"] a`).getAttribute('href'),'#recetario');
  await openBlock(id);await drawer.locator('[data-cms-delete="blocks"]').click();
  await editor.locator('#cms-confirm [data-cms-confirm]').click();
  await editor.locator(`[data-layout-key="block-${id}"]`).waitFor({state:'detached'});
 });
 await check('The immersive template creates a complete editable menu',async()=>{
  await editor.locator('[data-cms-add-menu="audit"]').click();
  await drawer.locator('[data-section-template]').selectOption('sister-companies');await drawer.locator('[data-new-element="menu"]').click();
  const id=await editor.evaluate(()=>window.BalconApp.site.pages.at(-1).id);
  await drawer.locator('[name="title"]').fill('Espacios de prueba');await submit();
  const section=await editor.evaluate(id=>{let s=window.BalconApp.site,p=s.pages.find(p=>p.id===id);return {template:p.template,blocks:p.blocks.length,label:s.navigation.find(n=>n.id===id).label};},id);
  assert.deepEqual(section,{template:'sister-companies',blocks:4,label:'Espacios de prueba'});
 });
 await check('Publication errors keep the local draft and explain the server rejection',async()=>{
  state.failPublish=true;await editor.locator('[data-cms-publish]').first().click();
  await editor.waitForFunction(()=>document.querySelector('#toast').textContent.includes('servidor rechazó'));
  assert.equal(state.publications || 0,0);state.uploadsAfterFailure=state.uploads;state.failPublish=false;
 });
 await check('Publication offloads inline originals once, then reloads the public result',async()=>{
  const prepared=await editor.evaluate(async png=>{
   let calls=0;const document=await window.BZUI.preparePublication({image:png,cover:png,text:png},async file=>{calls++;return `https://example.test/${file.name}`;});return {document,calls};
  },png);
  assert.equal(prepared.calls,1);assert.equal(prepared.document.image,prepared.document.cover);assert.equal(prepared.document.text,png);
  await editor.locator('[data-cms-publish]').first().click();await editor.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Cambios publicados'));
  assert.equal(state.publications,1);assert.equal(state.document.pages.find(p=>p.id==='audit').blocks.find(b=>b.id==='banner').title,'Banner corregido');
  assert.equal(state.uploads,state.uploadsAfterFailure,'Retry reuses the uploaded originals');
  assert.ok(state.document.pages.find(p=>p.id==='audit').blocks.find(b=>b.id==='inline').image.startsWith(config.url+'/storage/v1/object/public/'));
  const fresh=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await mock(fresh,state);
  const visitor=await fresh.newPage();await ready(visitor,'audit');assert.equal(await visitor.locator('[data-layout-key="block-banner"] h2').innerText(),'Banner corregido');
  assert.equal(await visitor.locator('[data-layout-key="block-text"] h2').innerText(),'Texto editado visualmente');
  assert.ok(await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await fresh.close();
 });
 await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
 fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify({passed:results.length,checks:results,service:'local mock; no production writes'},null,2));
 console.log(`Completed ${results.length} checks. Screenshots: ${artifacts}`);
 await publicContext.close();await admin.close();
})().catch(async error=>{
 console.error(error);process.exitCode=1;
 for(const [i,context] of (browser?.contexts() || []).entries())for(const [j,page] of context.pages().entries()) {
  await page.screenshot({path:path.join(artifacts,`failure-${i}-${j}.png`)}).catch(()=>{});
 }
}).finally(async()=>{await browser?.close();server.close();});
