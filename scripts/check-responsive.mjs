import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const html = await readFile(new URL('../index.html', import.meta.url));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
const screens = [[320,568],[390,844],[844,390],[768,1024],[820,1180],[1024,768],[1366,960]];
try {
  for (const [width,height] of screens) {
    const page = await browser.newPage({ viewport:{width,height}, isMobile:width < 1100, hasTouch:width < 1100 });
    const errors = [], extraResources = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      if(route.request().url().includes('.supabase.co/rest/v1/rpc/public_works'))return route.fulfill({json:[]});
      if(route.request().url().includes('.supabase.co/rest/v1/cms_site?'))return route.fulfill({json:[{document:null,revision:0}]});
      if (route.request().isNavigationRequest() && route.request().url().split('#')[0] === 'http://127.0.0.1:4173/')
        await route.fulfill({ contentType:'text/html; charset=utf-8', body:html });
      else { extraResources.push(route.request().url()); await route.abort(); }
    });
    await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle'});
    for (const [label,hash] of [['Noticias','noticias'],['Recetario','recetario'],['Nuestro libro','libro'],['Comparte tu trabajo','comparte']]) {
      await page.getByRole('link', {name:label,exact:true}).click();
      await page.waitForFunction(hash=>document.querySelector(`[data-nav="${hash}"]`)?.getAttribute('aria-current')==='page',hash);
      const layout = await page.evaluate(() => ({
        overflow:document.documentElement.scrollWidth > innerWidth,
        heroOverlap:(() => {const a=document.querySelector('.hero-copy .button'),b=document.querySelector('.hero .carousel-controls');return a && b && !b.hidden ? a.getBoundingClientRect().bottom + 8 > b.getBoundingClientRect().top : false;})(),
        nav:[...document.querySelectorAll('[data-nav]')].map(el => {const r=el.getBoundingClientRect();return {width:r.width,height:r.height};}),
        cards:[...document.querySelectorAll('.dish-card')].map(el => el.getBoundingClientRect().height),
        cover:(() => {const el=document.querySelector('.book-cover');if(!el)return null;const r=el.getBoundingClientRect();return r.width/r.height;})()
      }));
      if (layout.overflow || layout.heroOverlap || layout.nav.some(x=>x.width < 44 || x.height < 44)) throw new Error(`Diseño incorrecto: ${width}×${height}, ${label}`);
      if (width <= 700 && layout.cards.some(x=>x > 280)) throw new Error(`Tarjeta demasiado alta: ${width}`);
      if (layout.cover && Math.abs(layout.cover - .75) > .01) throw new Error(`Portada deformada: ${width}`);
      if ([390,820,1366].includes(width)) await page.screenshot({path:`docs/screenshots/referencia-${hash}-${width}.png`,fullPage:true});
    }
    if (errors.length || extraResources.length) throw new Error(JSON.stringify({errors,extraResources}));
    console.log(`Correcto: ${width}×${height}, 4 secciones, sin desbordamientos ni archivos auxiliares.`);
    await page.close();
  }
} finally { await browser.close(); }
