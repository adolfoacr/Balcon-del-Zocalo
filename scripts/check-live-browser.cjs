// Read-only smoke test of the public deployment. Never signs in or sends emails.
const {chromium}=require('playwright-core');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const siteURL='https://adolfoacr.github.io/Balcon-del-Zocalo/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BZ_CHROMIUM||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[],checks=[];page.on('pageerror',error=>errors.push(error.message));
 try {
  await page.goto(siteURL+'?v=availability-check#comparte',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.BalconApp?.site&&document.body.dataset.tab==='comparte');
  await page.locator('#public-works .lab-work-card').first().waitFor();
  const photos=page.locator('.work-demo .lab-card-media>img');
  for(const photo of await photos.all()){await photo.scrollIntoViewIfNeeded();await photo.evaluate(img=>img.decode());assert.ok(await photo.evaluate(img=>img.naturalWidth>=1000));}
  checks.push('Galería pública e imágenes disponibles');
  await page.locator('.lab-gallery').screenshot({path:'live-gallery.png'});
  for(const route of ['cuenta','registro','recuperar']){
   await page.evaluate(route=>location.hash=route,route);
   await page.waitForFunction(route=>document.body.dataset.tab===route,route);
   await page.locator('[data-account-form]').waitFor();
   assert.equal(await page.locator('[data-account-form] button:disabled').count(),0);
   checks.push('Pantalla pública disponible: '+route);
  }
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);checks.push('Sin errores de JavaScript ni desbordamiento móvil');
  fs.writeFileSync('live-browser-status.json',JSON.stringify({ok:true,checkedAt:new Date().toISOString(),checks,scope:'public read only; no login or emails'},null,2));
  console.log(checks.join('\n'));
 } finally {await browser.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
