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
function samplePDF(){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
 let data='%PDF-1.4\n',offsets=[0];objects.forEach((value,index)=>{offsets.push(Buffer.byteLength(data));data+=`${index+1} 0 obj\n${value}\nendobj\n`;});const offset=Buffer.byteLength(data);data+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(value=>String(value).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;return Buffer.from(data);
}
const sampleFeed={version:1,sourceURL:'https://www.culinariamexicana.com.mx/',sourceName:'Culinaria Mexicana',updatedAt:'2026-11-11T00:00:00Z',items:[1,2,3].map(index=>({id:'external-test-'+index,title:'Noticia de prueba '+index,url:'https://www.culinariamexicana.com.mx/nota-de-prueba-'+index+'/',excerpt:'Resumen de prueba del medio.',image:'',publishedAt:'2026-11-10T12:00:00Z'}))};
const server=http.createServer((req,res)=>{
 const requested=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
 if(requested!==root && !requested.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const file=requested===root ? path.join(root,'index.html') : requested;
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'text/html');res.end(data);});
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
  else if(pathname==='/auth/v1/user') {if(request.method()==='PUT')state.passwordChanges=(state.passwordChanges||0)+1;response=user;}
  else if(pathname==='/auth/v1/signup') {state.registrations=(state.registrations||0)+1;response={user};}
  else if(pathname==='/auth/v1/token')response={access_token:'LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',expires_in:3600,user};
  else if(pathname==='/auth/v1/recover') {state.recoveryRedirect=url.searchParams.get('redirect_to');response={};}
  else if(pathname==='/auth/v1/verify')response={access_token:'LOCAL_TEST_ONLY',refresh_token:'LOCAL_TEST_ONLY',expires_in:3600,user};
  else if(pathname==='/rest/v1/cms_admins')response=state.roles??[{user_id:user.id,owner:true,chef:true}];
  else if(pathname==='/rest/v1/rpc/public_works') {
   if(state.failGallery)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Galería temporalmente no disponible'})});
   const data=request.postDataJSON();response=(state.works||[]).filter(work=>work.visibility==='public').slice(data.skip,data.skip+data.take);
  } else if(pathname==='/rest/v1/work_submissions')response=(state.works||[]).filter(work=>!url.searchParams.has('author_id')||url.searchParams.get('author_id')==='eq.'+work.author_id);
  else if(pathname==='/rest/v1/rpc/delete_work') {
   state.deleteCalls=(state.deleteCalls||0)+1;
   if(state.forbidDelete)return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({code:'42501',message:'admin_required'})});
   if(!state.permanentDelete)return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'Function not installed'})});
   state.works=state.works.filter(work=>work.id!==request.postDataJSON().work_id);response=null;
  }
  else if(pathname==='/rest/v1/rpc/publish_site') {
   if(state.failPublish)return route.fulfill({status:400,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:'22023',message:'invalid_document'})});
   const data=request.postDataJSON();assert.equal(data.expected_revision,state.revision || 1);
   state.document=data.new_document;state.revision=(state.revision || 1)+1;state.publications=(state.publications || 0)+1;
   response={revision:state.revision};
  } else if(pathname.startsWith('/storage/v1/object/site-media/')) {
   state.uploads=(state.uploads || 0)+1;state.lastUploadBytes=request.postDataBuffer()?.length;response={Key:pathname};
  } else if(pathname.startsWith('/storage/v1/object/public/')) {
   if(pathname.endsWith('.pdf'))return route.fulfill({status:200,contentType:'application/pdf',body:samplePDF()});
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
 const business=(id,title)=>make(id,'carousel',{title,text:'',textMode:'shared',presentation:'overlay',buttonLabel:'RESERVA',link:'https://example.com/'+id,slides:[{image:'@table',alt:'Foto uno',buttonLabel:''},{image:'@chef',alt:'Foto dos',buttonLabel:''},{image:'@jars',alt:'Foto tres',buttonLabel:''}],interval:6000,autoplay:false});
 fixture.pages.push({id:'businesses',title:'Empresas hermanas',template:'sister-companies',layout:'list',spacesTitle:'Espacios. Una misma búsqueda.',blocks:[business('salon-test','SALÓN CENTRAL'),business('taco-test','TACO TASTING ROOM')]});
 fixture.navigation.push({id:'businesses',label:'Empresas de prueba',visible:true,icon:'none'});
 const salonButtonKey='page-businesses:article-block-salon-test.div-0.div-0.div-0.div-0.a-0';
 fixture.elementOverrides[salonButtonKey]={removed:true,moduleWidth:100,moduleHeight:80,backgroundMode:'transparent',lockAppearance:{fontFamily:'Questrial',fontSize:'13px'}};
 fixture.elementOverrides['page-businesses:article-block-taco-test.div-0.div-0.div-0.div-0.a-0']={moduleWidth:100,moduleHeight:80,backgroundMode:'transparent',backgroundColor:'#c7ac72'};
 // An older visual edit must not silently override a later edit in the block form.
 fixture.elementOverrides['page-audit:article-block-banner']={backgroundMode:'solid',backgroundColor:'#442211',borderMode:'none'};
 const state={document:fixture,revision:1};
 const admin=await adminContext(state);const editor=await admin.newPage();editor.on('pageerror',error=>errors.push(error.message));
 await ready(editor,'audit');
 const drawer=editor.locator('#cms-editor');
 const ensureEditing=async()=>{if(!await editor.evaluate(()=>document.body.classList.contains('visual-editing')))await editor.locator('[data-layout-toggle]').click();};
 const expandAdvanced=async()=>drawer.locator('details').evaluateAll(details=>details.forEach(detail=>detail.open=true));
 const openBlock=async id=>{await ensureEditing();await editor.locator(`[data-edit-panel="blocks"][data-edit-id="${id}"]`).click();await drawer.waitFor({state:'visible'});await expandAdvanced();};
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
 await check('Salon and Taco share the immersive design and a single fixed reservation button',async()=>{
  await ready(editor,'businesses');
  assert.equal(await editor.locator('main').innerText().then(text=>text.includes('Una misma búsqueda')),false);
  let reservationColor;
  for(const id of ['salon-test','taco-test']){
   const block=editor.locator(`[data-layout-key="block-${id}"]`),button=block.locator('[data-button-owner]'),carousel=block.locator('[data-carousel]');
   assert.equal(await block.getAttribute('class').then(value=>value.includes('carousel-design-immersive')),true);
   assert.equal(await button.count(),1);assert.equal(await button.isVisible(),true);
   const position=()=>button.evaluate(el=>{const rect=el.getBoundingClientRect(),parent=el.closest('.custom-block').getBoundingClientRect();return {x:rect.left-parent.left,y:rect.top-parent.top};});
   const start=await position();await button.evaluate(el=>window.reservationReference=el);
   for(let i=0;i<3;i++){
    await carousel.locator('[data-carousel-slide]:visible .carousel-media').focus();await editor.keyboard.press('ArrowRight');
    assert.equal(await button.isVisible(),true);assert.equal(await button.evaluate(el=>el===window.reservationReference),true);
    const rect=await position();assert.ok(Math.abs(rect.x-start.x)<1&&Math.abs(rect.y-start.y)<1,JSON.stringify({start,rect}));
   }
   const shade=await button.evaluate(el=>getComputedStyle(el).backgroundColor);if(reservationColor)assert.equal(shade,reservationColor);else reservationColor=shade;
  }
 });
 await check('Editing a reservation shows only its label, link and color and applies to every photo',async()=>{
  await ensureEditing();await editor.locator('[data-layout-key="block-taco-test"] [data-button-owner]').click();
  await editor.locator('[data-layout-edit]:visible').click();await drawer.waitFor({state:'visible'});
  assert.equal(await drawer.locator('.cms-primary > .cms-field').count(),3);
  await drawer.locator('[name="buttonLabel"]').fill('Reservar mesa');
  await drawer.locator('[name="buttonColor"]').fill('#dfb14c');await drawer.locator('[name="buttonColor"]').dispatchEvent('input');await submit();
  const button=editor.locator('[data-layout-key="block-taco-test"] [data-button-owner]');
  assert.match(await button.innerText(),/Reservar mesa/);assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(223, 177, 76)');
 });
 await check('Duplicating a carousel preserves all slides, shared button and appearance',async()=>{
  await openBlock('taco-test');
  const original=await editor.evaluate(()=>structuredClone(window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.id==='taco-test')));
  await drawer.locator('[data-editor-duplicate]').click();await drawer.waitFor({state:'hidden'});
  const copied=await editor.evaluate(()=>structuredClone(window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks[2]));
  assert.notEqual(copied.id,original.id);delete copied.id;delete original.id;assert.deepEqual(copied,original);
  assert.equal(await editor.locator('.carousel-design-immersive').count(),3);
 });
 await check('Drawing creates an editable button attached to the chosen carousel and cancel creates nothing',async()=>{
  await ensureEditing();await editor.locator('[data-editor-draw]').first().click();
  const bounds=await editor.locator('[data-layout-key="block-salon-test"]').boundingBox();
  const x=bounds.x+80,y=Math.min(700,Math.max(240,bounds.y+Math.min(bounds.height*.6,350)));
  await editor.mouse.move(x,y);await editor.mouse.down();await editor.mouse.move(x+180,y+50,{steps:5});await editor.mouse.up();await drawer.waitFor({state:'visible'});
  await drawer.locator('[name="buttonLabel"]').fill('Botón dibujado');await drawer.locator('[name="link"]').fill('https://example.com/reservar');await submit();
  const record=await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.floating));
  assert.equal(record.floating.anchor,'block-salon-test');
  const drawn=editor.locator(`[data-layout-key="block-${record.id}"]`);
  assert.equal(await drawn.evaluate(el=>el.parentElement.dataset.layoutKey),'block-salon-test');
  assert.match(await drawn.innerText(),/Botón dibujado/);
  const count=await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.length);
  await editor.locator('[data-editor-draw]').first().click();await editor.keyboard.press('Escape');
  assert.equal(await editor.locator('.text-draw-surface').count(),0);
  assert.equal(await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.length),count);
  await editor.reload({waitUntil:'networkidle'});
  assert.equal(await editor.locator(`[data-layout-key="block-${record.id}"]`).evaluate(el=>el.parentElement.dataset.layoutKey),'block-salon-test');
 });
 await check('Drawn buttons can be moved onto Taco, keep their fill, and save the new placement',async()=>{
  await ensureEditing();
  const record=await editor.evaluate(()=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.floating&&b.type==='button'));
  const drawn=editor.locator(`[data-layout-key="block-${record.id}"]`),handle=drawn.locator('.drawn-move-handle');
  await handle.scrollIntoViewIfNeeded();const start=await handle.boundingBox();
  // Scrolling during the drag is the same operation a person uses between banners.
  await editor.mouse.move(start.x+20,start.y+12);await editor.mouse.down();
  await editor.locator('[data-layout-key="block-taco-test"]').scrollIntoViewIfNeeded();
  const target=await editor.locator('[data-layout-key="block-taco-test"]').boundingBox();
  await editor.mouse.move(target.x+340,Math.min(700,target.y+target.height*.6),{steps:8});await editor.mouse.up();
  await editor.waitForFunction(id=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.id===id)?.floating.anchor==='block-taco-test',record.id);
  assert.equal(await drawn.evaluate(el=>el.parentElement.dataset.layoutKey),'block-taco-test');
  assert.notEqual(await drawn.locator('[data-button-owner]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  const position=await editor.evaluate(id=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.id===id).floating.positions.desktop,record.id);
  await editor.reload({waitUntil:'networkidle'});
  assert.deepEqual(await editor.evaluate(id=>window.BalconApp.site.pages.find(p=>p.id==='businesses').blocks.find(b=>b.id===id).floating.positions.desktop,record.id),position);
 });
 await check('Drawing text opens a single main field and duplication includes attached content and overrides',async()=>{
  await ensureEditing();await editor.locator('[data-layout-key="block-taco-test"]').scrollIntoViewIfNeeded();
  await editor.locator('[data-editor-draw]').first().click();await editor.locator('[data-draw-kind]').selectOption('text');
  await editor.locator('[data-layout-key="block-taco-test"]').scrollIntoViewIfNeeded();
  const target=await editor.locator('[data-layout-key="block-taco-test"]').boundingBox();
  await editor.mouse.move(target.x+50,Math.max(200,target.y+80));await editor.mouse.down();await editor.mouse.move(target.x+290,Math.max(200,target.y+80)+60,{steps:5});await editor.mouse.up();
  await drawer.waitFor({state:'visible'});assert.equal(await drawer.locator('.cms-primary > .cms-field').count(),1);
  await drawer.locator('[name="text"]').fill('Texto dibujado');await submit();
  const original=await editor.evaluate(async()=>{
   const site=structuredClone(window.BalconApp.site),key='page-businesses:article-block-taco-test.div-0.h2-0';
   site.elementOverrides[key]={color:'#fedcba',lockAppearance:{fontFamily:'Georgia'},positions:{phone:{container:'page-businesses:article-block-taco-test',x:.1,y:12,width:.7}}};
   await window.BZEditor.context().admin.applyDocument(site);
   return {key,children:site.pages.find(p=>p.id==='businesses').blocks.filter(b=>b.floating?.anchor==='block-taco-test')};
  });
  assert.equal(original.children.length,2);
  await openBlock('taco-test');await drawer.locator('[data-editor-duplicate]').click();await drawer.waitFor({state:'hidden'});
  const result=await editor.evaluate(()=>{
   const site=window.BalconApp.site,blocks=site.pages.find(p=>p.id==='businesses').blocks,index=blocks.findIndex(b=>b.id==='taco-test'),copy=blocks[index+1];
   return {copy,children:blocks.filter(b=>b.floating?.anchor==='block-'+copy.id),override:site.elementOverrides['page-businesses:article-block-'+copy.id+'.div-0.h2-0']};
  });
  assert.equal(result.children.length,2);assert.notEqual(result.copy.id,'taco-test');
  assert.equal(result.override.color,'#fedcba');assert.equal(result.override.lockAppearance.fontFamily,'Georgia');
  assert.equal(result.override.positions.phone.container,'page-businesses:article-block-'+result.copy.id);
  for(let i=0;i<original.children.length;i++){
   assert.notEqual(result.children[i].id,original.children[i].id);
   assert.deepEqual(result.children[i].floating.positions,original.children[i].floating.positions);
  }
  const copiedButton=result.children.find(b=>b.type==='button');await openBlock(copiedButton.id);await drawer.locator('[name="buttonLabel"]').fill('Solo la copia');await submit();
  const originalButton=original.children.find(b=>b.type==='button');
  assert.match(await editor.locator(`[data-layout-key="block-${originalButton.id}"]`).innerText(),/Botón dibujado/);
  await openBlock(result.copy.id);await drawer.locator('[data-cms-delete="blocks"]').click();await editor.locator('#cms-confirm [data-cms-confirm]').click();
  for(const child of result.children)assert.equal(await editor.locator(`[data-layout-key="block-${child.id}"]`).count(),0);
  assert.equal(await editor.locator(`[data-layout-key="block-${originalButton.id}"]`).count(),1);
 });
 await check('Desktop drawings remain readable inside their carousel on a phone',async()=>{
  if(await editor.evaluate(()=>document.body.classList.contains('visual-editing')))await editor.locator('[data-layout-toggle]').click();
  await editor.setViewportSize({width:390,height:844});
  const drawn=editor.locator('[data-layout-key="block-taco-test"] .drawn-element.type-button');
  await drawn.waitFor();
  await editor.waitForFunction(()=>document.querySelector('[data-layout-key="block-taco-test"] .drawn-element.type-button')?.getBoundingClientRect().width>=159);
  const rect=await drawn.boundingBox(),parent=await editor.locator('[data-layout-key="block-taco-test"]').boundingBox();
  assert.ok(rect.width>=159&&rect.x>=parent.x-1&&rect.x+rect.width<=parent.x+parent.width+1);
  assert.ok(await editor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await editor.setViewportSize({width:1440,height:1000});
 });
 await check('Adding a dish needs only six basic fields and its public recipe contains those details',async()=>{
  await ready(editor,'recetario');await ensureEditing();await editor.locator('[data-cms-add="recipes"]').first().click();await drawer.waitFor({state:'visible'});
  const fields=await drawer.locator('.cms-primary > .cms-field').evaluateAll(nodes=>nodes.map(node=>node.querySelector('[name]')?.name));
  assert.deepEqual(fields,['name','image','description','ingredients','steps','servings']);
  assert.equal(await drawer.locator('details.cms-advanced').first().getAttribute('open'),null);
  await editor.screenshot({path:path.join(artifacts,'recetario-formulario-simple.png')});
  await drawer.locator('[name="name"]').fill('Platillo sencillo');await drawer.locator('[name="description"]').fill('Descripción del platillo.');
  await drawer.locator('[name="ingredients"]').fill('2 tomates\nUna pizca de sal');await drawer.locator('[name="steps"]').fill('Cortar los tomates.\nAgregar sal y servir.');await drawer.locator('[name="servings"]').fill('4');
  await drawer.locator('[data-cms-upload="image"]').setInputFiles({name:'platillo.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  await editor.waitForFunction(()=>document.querySelector('#cms-editor [name="image"]').value.startsWith('https:'));await submit();
  const dish=await editor.evaluate(()=>window.BalconApp.site.recipes.find(recipe=>recipe.name==='Platillo sencillo'));
  assert.deepEqual(dish.ingredients,['2 tomates','Una pizca de sal']);assert.equal(dish.servings,4);
  if(await editor.evaluate(()=>document.body.classList.contains('visual-editing')))await editor.locator('[data-layout-toggle]').click();
  await editor.locator(`[data-recipe="${dish.id}"]`).first().click();
  const detail=editor.locator('#detail-content');await detail.waitFor({state:'visible'});
  assert.equal(await detail.locator('h2').innerText(),'Platillo sencillo');assert.equal(await detail.locator('.detail-recipe-photo').count(),1);
  assert.equal(await detail.locator('.recipe-ingredients li').count(),2);assert.equal(await detail.locator('.recipe-method li').count(),2);
  assert.match(await detail.innerText(),/4 porciones/);assert.doesNotMatch(await detail.innerText(),/Investigación|Dificultad|Procedencia/);
  await editor.keyboard.press('Escape');await ready(editor,'audit');
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
  await expandAdvanced();
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
  await expandAdvanced();
  await drawer.locator('[name="template"]').selectOption('standard');await submit();assert.equal(await editor.locator('.sister-page').count(),0);
  await editor.locator('[data-edit-panel="pages"]').first().click({force:true});await expandAdvanced();await drawer.locator('[name="template"]').selectOption('sister-companies');await submit();assert.equal(await editor.locator('.sister-page').count(),1);
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
  await expandAdvanced();
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
 const galleryState={document:structuredClone(initial),revision:1,roles:[{user_id:user.id,owner:false,chef:false}],works:[{
  id:'10000000-0000-4000-8000-000000000001',author_id:user.id,author_name:'Participante de prueba',kind:'research',visibility:'public',status:'received',
  title:'Investigación de prueba',summary:'Una propuesta pública del servicio para comprobar la moderación.',body:'Método y resultados enviados por el participante. <img src=x onerror="window.injected=true">',attachment_paths:[],created_at:'2026-11-11T12:00:00Z'
 }]};
 const galleryVisitor=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await mock(galleryVisitor,galleryState);
 const gp=await galleryVisitor.newPage();gp.on('pageerror',error=>errors.push(error.message));
 await check('Gallery shows four clearly identified full demonstration projects alongside real work',async()=>{
  await ready(gp,'comparte');await gp.locator('.lab-work-card').first().waitFor();
  assert.equal(await gp.locator('.work-demo').count(),4);assert.equal(await gp.locator('.lab-work-card').count(),5);
  assert.equal(await gp.locator('[data-work-delete]').count(),0);
  assert.match(await gp.locator('#lab-count').innerText(),/1 publicación.*4 ejemplos/);
  for(const item of await gp.locator('.work-demo').all()){
   assert.match(await item.innerText(),/Demostración/);assert.match(await item.innerText(),/autor ficticio/);
   const photo=item.locator('.lab-card-media>.work-project-photo');await photo.scrollIntoViewIfNeeded();await photo.evaluate(img=>img.decode());assert.equal(await photo.evaluate(img=>img.naturalWidth),1536);
   await item.locator('summary').click();assert.equal(await item.locator('.work-reading-section').count(),6);
   const detailPhoto=item.locator('.work-project-figure img');await detailPhoto.scrollIntoViewIfNeeded();await detailPhoto.evaluate(img=>img.decode());assert.equal(await detailPhoto.evaluate(img=>img.naturalHeight),1024);
   assert.match(await item.locator('details').innerText(),/fictici/);await item.locator('summary').click();
  }
  await gp.locator('[data-work-id="10000000-0000-4000-8000-000000000001"] summary').click();
  assert.equal(await gp.locator('.work-body img').count(),0);assert.equal(await gp.evaluate(()=>window.injected),undefined);
  await gp.locator('[data-work-id="10000000-0000-4000-8000-000000000001"] summary').click();
  await gp.locator('.lab-gallery').screenshot({path:path.join(artifacts,'galeria-proyectos-demostracion.png')});
 });
 await check('Gallery filters and complete project reading work on phones without page overflow',async()=>{
  await gp.locator('[data-lab-kind="research"]').click();assert.equal(await gp.locator('.work-demo').count(),2);assert.equal(await gp.locator('.lab-work-card').count(),3);
  await gp.locator('[data-lab-kind="development"]').click();assert.equal(await gp.locator('.lab-work-card').count(),2);
  await gp.setViewportSize({width:390,height:844});await gp.locator('.work-demo summary').first().click();
  assert.ok(await gp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await gp.locator('.work-demo').first().screenshot({path:path.join(artifacts,'proyecto-lectura-movil.png')});
 });
 const gaContext=await adminContext(galleryState),ga=await gaContext.newPage();ga.on('pageerror',error=>errors.push(error.message));
 await ready(ga,'comparte');await ga.locator('#public-works [data-work-delete]').first().waitFor();
 const confirm=ga.locator('.work-delete-dialog');
 await check('Every administrator can withdraw a project; cancellation changes nothing',async()=>{
  assert.equal(await ga.locator('#public-works [data-work-delete]').count(),5);
  assert.equal(await ga.evaluate(()=>window.BalconApp.service.isChef),false);
  await ga.locator('#public-works [data-work-delete="10000000-0000-4000-8000-000000000001"]').click();await confirm.waitFor();
  await confirm.locator('[data-cancel]').click();assert.equal(galleryState.publications||0,0);assert.equal(galleryState.deleteCalls||0,0);
  assert.equal(await ga.locator('.lab-work-card').count(),5);
 });
 await check('Withdrawal persists for visitors and preserves unrelated unpublished edits',async()=>{
  const publishedTitle=galleryState.document.restaurantName;
  await ga.evaluate(async()=>{const doc=structuredClone(window.BalconApp.site);doc.restaurantName='Cambio pendiente sin publicar';await window.BZEditor.context().admin.applyDocument(doc);});
  await ga.locator('#public-works [data-work-delete="10000000-0000-4000-8000-000000000001"]').click();await confirm.locator('[data-confirm]').click();
  await ga.waitForFunction(()=>document.querySelector('#toast').textContent.includes('eliminado de la galería'));
  assert.equal(galleryState.publications,1);assert.equal(galleryState.document.restaurantName,publishedTitle);
  assert.equal(await ga.evaluate(()=>window.BalconApp.site.restaurantName),'Cambio pendiente sin publicar');
  assert.equal(await ga.evaluate(()=>window.BZEditor.context().admin.dirty),true);
  assert.equal(await ga.locator('[data-work-id="10000000-0000-4000-8000-000000000001"]').count(),0);
  await gp.reload({waitUntil:'networkidle'});assert.equal(await gp.locator('.lab-work-card').count(),4);
  assert.ok(galleryState.document.workPage.removedWorkIds.includes('10000000-0000-4000-8000-000000000001'));
 });
 await check('Removing a demonstration stays removed after reloading and leaves the other examples',async()=>{
  await ga.locator('#public-works [data-work-delete="demo-pan-crujiente"]').click();await confirm.locator('[data-confirm]').click();
  await ga.waitForFunction(()=>!document.querySelector('[data-work-id="demo-pan-crujiente"]'));
  await gp.reload({waitUntil:'networkidle'});assert.equal(await gp.locator('.work-demo').count(),3);
  await ga.reload({waitUntil:'networkidle'});assert.equal(await ga.locator('.work-demo').count(),3);
 });
 await check('A failed moderation publication keeps the card and reports failure',async()=>{
  galleryState.failPublish=true;
  await ga.locator('#public-works [data-work-delete="demo-tallos-brocoli"]').click();await confirm.locator('[data-confirm]').click();
  await ga.waitForFunction(()=>document.querySelector('#toast').textContent.includes('servidor rechazó'));
  assert.equal(await ga.locator('[data-work-id="demo-tallos-brocoli"]').count(),1);assert.equal(galleryState.publications,2);
  galleryState.failPublish=false;
 });
 await check('Database deletion is used when installed and permission errors never pretend success',async()=>{
  const record={...galleryState.works[0],id:'10000000-0000-4000-8000-000000000002',title:'Segundo trabajo'};galleryState.works.push(record);galleryState.permanentDelete=true;
  await ga.reload({waitUntil:'networkidle'});await ga.locator('#public-works [data-work-delete="'+record.id+'"]').waitFor();
  galleryState.forbidDelete=true;await ga.locator('#public-works [data-work-delete="'+record.id+'"]').click();await confirm.locator('[data-confirm]').click();
  await ga.waitForFunction(()=>document.querySelector('#toast').textContent.includes('permisos'));
  assert.equal(await ga.locator('[data-work-id="'+record.id+'"]').count(),1);assert.equal(galleryState.publications,2);
  galleryState.forbidDelete=false;await ga.locator('#public-works [data-work-delete="'+record.id+'"]').click();await confirm.locator('[data-confirm]').click();
  await ga.waitForFunction(()=>document.querySelector('#toast').textContent==='Propuesta eliminada.');
  assert.equal(galleryState.works.some(work=>work.id===record.id),false);assert.equal(galleryState.publications,2);
 });
 await check('Gallery outage preserves identified demonstrations and reports the loading failure',async()=>{
  galleryState.failGallery=true;await gp.reload({waitUntil:'networkidle'});
  await gp.locator('#public-works>.notice').waitFor();assert.equal(await gp.locator('.work-demo').count(),3);
  assert.match(await gp.locator('#public-works>.notice').innerText(),/No pudimos cargar/);galleryState.failGallery=false;
 });
 await galleryVisitor.close();await gaContext.close();
 const accountsState={document:structuredClone(initial),revision:1,roles:[]};
 const accounts=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await mock(accounts,accountsState);
 const ap=await accounts.newPage();ap.on('pageerror',error=>errors.push(error.message));
 await check('Registration requests confirmation and accepts a confirmation link without granting admin access',async()=>{
  await ready(ap,'registro');const form=ap.locator('[data-account-form="register"]');
  await form.locator('[name="name"]').fill('Cuenta de prueba');await form.locator('[name="email"]').fill('audit@example.test');await form.locator('[name="password"]').fill('Local-test-only-1234');await form.locator('button').click();
  await ap.waitForFunction(()=>document.body.dataset.tab==='cuenta');assert.equal(accountsState.registrations,1);
  assert.match(await ap.locator('.account-card').innerText(),/confirmación/);
  assert.equal(await ap.evaluate(()=>window.BalconApp.service.user),null);
  await ap.goto(base+'/?token_hash=LOCAL_CONFIRMATION_ONLY&type=signup#cuenta',{waitUntil:'networkidle'});
  await ap.waitForFunction(()=>!!window.BalconApp?.service.user);assert.equal(await ap.evaluate(()=>window.BalconApp.service.isAdmin),false);
  assert.equal(new URL(ap.url()).searchParams.has('token_hash'),false);
  await ap.locator('[data-account-logout]').first().click();await ap.locator('[data-account-form="login"]').waitFor();
 });
 await check('User and administrator login keep their roles after reload and logout clears the session',async()=>{
  const login=async()=>{const form=ap.locator('[data-account-form="login"]');await form.locator('[name="email"]').fill('audit@example.test');await form.locator('[name="password"]').fill('Local-test-only-1234');await form.locator('button').click();await ap.waitForFunction(()=>!!window.BalconApp?.service.user);};
  await login();assert.equal(await ap.evaluate(()=>window.BalconApp.service.isAdmin),false);assert.equal(await ap.locator('[data-cms-publish]').count(),0);
  await ap.reload({waitUntil:'networkidle'});assert.equal(await ap.evaluate(()=>!!window.BalconApp.service.user),true);
  await ap.locator('[data-account-logout]').first().click();await ap.locator('[data-account-form="login"]').waitFor();
  accountsState.roles=[{user_id:user.id,owner:true,chef:false}];await login();await ap.waitForFunction(()=>document.body.dataset.tab==='admin');
  assert.equal(await ap.evaluate(()=>window.BalconApp.service.isAdmin),true);await ap.reload({waitUntil:'networkidle'});assert.equal(await ap.evaluate(()=>window.BalconApp.service.isOwner),true);
  await ap.locator('[data-account-logout]').first().click();await ap.waitForFunction(()=>!window.BalconApp.service.user);
  assert.equal(await ap.evaluate(()=>sessionStorage.getItem(window.BalconApp.service.storageKey)),null);
 });
 await check('Recovery keeps the app URL, validates matching passwords and explains expired links',async()=>{
  accountsState.roles=[];await ready(ap,'recuperar');const form=ap.locator('[data-account-form="recover"]');
  await form.locator('[name="email"]').fill('audit@example.test');await form.locator('button').click();
  await ap.waitForFunction(()=>document.querySelector('.account-card').textContent.includes('Solicitud enviada'));
  assert.equal(accountsState.recoveryRedirect,base+'/?auth=recovery');
  await ap.goto(base+'/?token_hash=LOCAL_RECOVERY_ONLY&type=recovery',{waitUntil:'networkidle'});const reset=ap.locator('[data-account-form="reset"]');await reset.waitFor();
  await reset.locator('[name="password"]').fill('Local-test-only-1234');await reset.locator('[name="passwordConfirm"]').fill('Local-test-only-5678');await reset.locator('button').click();
  assert.match(await reset.locator('.form-error').innerText(),/no coinciden/);assert.equal(accountsState.passwordChanges||0,0);
  await reset.locator('[name="passwordConfirm"]').fill('Local-test-only-1234');await reset.locator('button').click();await ap.waitForFunction(()=>document.body.dataset.tab==='cuenta');assert.equal(accountsState.passwordChanges,1);
  await ap.goto(base+'/?error=access_denied&error_code=otp_expired&type=recovery',{waitUntil:'networkidle'});
  await ap.locator('[data-account-form="recover"]').waitFor();assert.match(await ap.locator('.account-card').innerText(),/caduc|válido/);
  assert.equal(await ap.evaluate(()=>window.BalconApp.service.user),null);
 });
 await accounts.close();
 const bookState={document:structuredClone(initial),revision:1};
 const bookContext=await adminContext(bookState),bp=await bookContext.newPage();bp.on('pageerror',error=>errors.push(error.message));
 await check('A local PDF can be published independently, and failures retain the local copy',async()=>{
  await ready(bp,'libro');await bp.locator('#book-file').setInputFiles({name:'libro-publico.pdf',mimeType:'application/pdf',buffer:samplePDF()});
  await bp.locator('#save-book-page').waitFor();assert.equal(bookState.publications||0,0);
  await bp.evaluate(async()=>{const doc=structuredClone(window.BalconApp.site);doc.restaurantName='Nombre pendiente';await window.BZEditor.context().admin.applyDocument(doc);});
  bookState.failPublish=true;await bp.locator('#save-book-page').click();await bp.locator('#book-error:not([hidden])').waitFor();
  assert.equal(bookState.publications||0,0);assert.ok(await bp.locator('#save-book-page').isVisible());
  bookState.failPublish=false;await bp.locator('#save-book-page').click();
  await bp.waitForFunction(()=>document.querySelector('#toast').textContent.includes('PDF guardado en la página'));
  assert.equal(bookState.publications,1);assert.ok(bookState.document.bookPage.pdfURL.startsWith(config.url+'/storage/v1/object/public/'));
  assert.notEqual(bookState.document.restaurantName,'Nombre pendiente');assert.equal(await bp.evaluate(()=>window.BalconApp.site.restaurantName),'Nombre pendiente');
  const visitor=await browser.newContext();await mock(visitor,bookState);const vp=await visitor.newPage();await ready(vp,'libro');
  await vp.locator('#open-published-book').click();await vp.locator('#pdf-canvas').waitFor();assert.match(await vp.locator('.reader-privacy').innerText(),/PDF publicado/);
  assert.equal(await vp.locator('#save-book-page').count(),0);await visitor.close();
 });
 await bookContext.close();
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
