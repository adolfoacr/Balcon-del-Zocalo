// Read-only inspection of the public carousel configuration used by the site.
const fs=require('node:fs');
(async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const config=JSON.parse(html.match(/<script[^>]*id="service-config"[^>]*>(.*?)<\/script>/s)[1]);
 const response=await fetch(config.url+'/rest/v1/cms_site?id=eq.1&select=document',{headers:{apikey:config.publishableKey},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Public configuration read returned '+response.status);
 const rows=await response.json(),site=rows[0]?.document;if(!site)throw new Error('No published document');
 const fold=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
 const result=[];
 for(const page of site.pages||[])for(const block of page.blocks||[]){
  const overrides=Object.entries(site.elementOverrides||{}).filter(([key])=>key.includes('block-'+block.id));
  const identity=fold([block.title,...(block.slides||[]).map(slide=>slide.title),...overrides.map(([,entry])=>entry?.text)].join(' '));
  if(!identity.includes('salon central')&&!identity.includes('taco tasting room'))continue;
  result.push({page:page.id,id:block.id,type:block.type,title:block.title,textMode:block.textMode,presentation:block.presentation,moduleWidth:block.moduleWidth,moduleHeight:block.moduleHeight,buttonLabel:block.buttonLabel,hasLink:!!(block.link||block.buttonLink),slides:(block.slides||[]).map(slide=>({title:slide.title,buttonLabel:slide.buttonLabel,hasLink:!!slide.buttonLink,imageFit:slide.imageFit,imageWidth:slide.imageWidth,imageHeight:slide.imageHeight})),overrides:overrides.map(([key,entry])=>({key,value:Object.fromEntries(Object.entries(entry||{}).filter(([key])=>!['image','alt','link','snapshot'].includes(key)))}))});
 }
 fs.writeFileSync('editor-live-summary.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 if(!result.length)throw new Error('No published Salon Central or Taco Tasting Room found');
 if(fs.existsSync('assets/bz-editor.js')){
  const vm=require('node:vm'),assert=require('node:assert/strict');
  const sandbox={window:{},document:{addEventListener(){}},addEventListener(){},structuredClone,innerWidth:1440};vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('assets/bz-editor.js','utf8'),sandbox);
  vm.runInContext(fs.readFileSync('assets/bz-ui.js','utf8'),sandbox);
  const fixed=sandbox.window.BZEditor.prepareSite(structuredClone(site));
  for(const record of result){
   const block=fixed.pages.find(page=>page.id===record.page).blocks.find(block=>block.id===record.id);
   assert.equal(block.textMode,'shared');assert.equal(block.carouselDesign,'immersive');assert.equal(block.buttonStyle,'solid');assert.ok(block.buttonLabel);assert.ok(block.link);
   assert.equal(block.slides.length,record.slides.length);assert.ok(block.slides.every(slide=>slide.imageFit==='cover'));
   const html=sandbox.window.BZUI.renderBlocks([block],{}, {escape:String,image:String,icon:()=>'',link:url=>'href="'+url+'"',safeLink:value=>value,text:String,snapshot:()=>'',edit:()=>'',caption:(_,block)=>({title:block.title,text:block.text,eyebrow:block.eyebrow,buttonLabel:block.buttonLabel,buttonLink:block.link})});
   assert.equal((html.match(/class="carousel-copy"/g)||[]).length,1);
   assert.equal((html.match(/data-button-owner=/g)||[]).length,1);
   for(const [key,value] of Object.entries(fixed.elementOverrides||{}))if(key.includes('block-'+block.id)&&/\.a-0$/.test(key)){assert.notEqual(value.removed,true);assert.equal(value.moduleWidth,undefined);assert.equal(value.backgroundMode,undefined);}
   console.log('MODEL-CHECK-PASS: '+block.title+'; una reserva fija, diseño reutilizable y sin ajustes antiguos que oculten el botón.');
  }
  const before=JSON.stringify(fixed);sandbox.window.BZEditor.prepareSite(fixed);
  assert.equal(JSON.stringify(fixed),before,'Normalizar de nuevo conserva las ediciones posteriores');
 }
})().catch(error=>{console.error(error.message);process.exitCode=1});
