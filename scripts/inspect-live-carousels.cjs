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
})().catch(error=>{console.error(error.message);process.exitCode=1});
