// Bind visual edits to the same fields used by the administration panels.
export function elementBindings(el){
 const group=el.closest('[data-layout-key]'),id=group?.dataset.layoutKey;
 const field=(path,property='text')=>({[property]:path});
 if(el.matches('.footer>span')){const index=[...el.parentElement.children].indexOf(el);return field(['restaurantName','brand.footer','brand.subtitle'][index]);}
 const nav=el.closest('[data-nav]');if(nav){if(el.tagName==='IMG')return field(`navigation.${nav.dataset.nav}.image`,'image');return field(`navigation.${nav.dataset.nav}.label`);}
 if(el.matches('.brand img'))return field('brand.logo','image');
 if(el.matches('.location-label>span'))return field('brand.subtitle');
 if(el.matches('.location-label'))return field('brand.location');
 if(el.matches('.pilot-label'))return field('brand.badge');
 if(id==='home-hero'){
  if(el.tagName==='H1')return field('home.title');
  if(el.matches('.hero-copy>p'))return field('home.description');
  if(el.matches('.hero-copy>.eyebrow'))return field('home.eyebrow');
  if(el.matches('.hero-copy>a'))return {text:'home.buttonLabel',link:'home.buttonLink',icon:'home.buttonIcon'};
  if(el.matches('.hero-copy>.intro-photo'))return field('home.image','image');
  const slide=el.closest('[data-carousel-slide]');if(el.tagName==='IMG'&&slide){const index=[...group.querySelectorAll('.hero-slide')].indexOf(slide);return {image:`home.slides.${index}.image`,alt:`home.slides.${index}.alt`};}
 }
 if(id==='home-news'){if(el.tagName==='H2')return field('home.newsTitle');if(el.matches('.eyebrow'))return field('home.newsEyebrow');if(el.matches('.section-heading>.subtle'))return field('home.newsSubtitle');}
 const shortcut=el.closest('[data-shortcut]');if(shortcut){const prefix='shortcuts.'+shortcut.dataset.shortcut;if(el.tagName==='IMG')return field(prefix+'.image','image');if(el.tagName==='A')return {text:prefix+'.label',link:prefix+'.link',icon:prefix+'.icon'};if(el.matches('.shortcut-card>span'))return field(prefix+'.label');}
 if(id==='book-heading'){if(el.tagName==='H1')return field('bookPage.title');if(el.tagName==='P')return field('bookPage.description');if(el.matches('.eyebrow'))return field('book.title');}
 if(id==='book-space'){if(el.matches('.book-copy>h2'))return field('bookPage.heading');if(el.matches('.book-copy>p:not(.helper)'))return field('bookPage.body');if(el.matches('.book-cover h2'))return field('book.title');if(el.matches('.book-cover-image'))return field('bookPage.cover','image');if(el.matches('#import-book'))return field('bookPage.buttonLabel');}
 if(id==='restaurant-map'){if(el.tagName==='H2')return field('location.title');if(el.tagName==='P')return field('location.address');if(el.tagName==='A')return field('location.buttonLabel');if(el.tagName==='IMG')return field('location.image','image');}
 if(id==='home-welcome'){
  if(el.matches('.lab-home-top p'))return field('home.welcomeText');
  if(el.matches('.lab-home-top .eyebrow'))return field('home.welcomeTitle');
  const card=el.closest('.lab-pathway');if(card){const which=[...group.querySelectorAll('.lab-pathway')].indexOf(card)===0?'lab':'chef';
   if(el.tagName==='H2')return field(`home.${which}Title`);
   if(el.matches('.lab-pathway-copy p'))return field(`home.${which}Description`);
   if(el.tagName==='IMG')return field(`home.${which}Image`,'image');
   if(el.tagName==='A')return {text:`home.${which}ButtonLabel`,link:`home.${which}ButtonLink`};
   if(el.matches('.eyebrow'))return field(`home.${which}Eyebrow`);
  }
  const method=el.closest('.lab-method article');if(method){const number=['One','Two','Three'][[...group.querySelectorAll('.lab-method article')].indexOf(method)];if(el.tagName==='H3')return field(`home.method${number}Title`);if(el.tagName==='P')return field(`home.method${number}Text`);}
 }
 for(const [key,path]of [['recipe-heading','recipePage'],['work-heading','workPage']])if(id===key){if(el.tagName==='H1')return field(path+'.title');if(el.tagName==='P')return field(path+'.description');if(el.tagName==='IMG')return field(path+'.image','image');if(el.matches('.eyebrow'))return field(path+'.eyebrow');}
 if(id==='work-gallery'){if(el.matches('.lab-heading h2'))return field('workPage.galleryTitle');if(el.matches('.lab-heading p'))return field('workPage.galleryDescription');if(el.matches('.lab-banner-image'))return field('workPage.galleryImage','image');}
 if(id?.startsWith('recipe-')&&!['recipe-heading','recipe-tools','recipe-menus','recipe-dishes'].includes(id)){const prefix='recipes.'+id.slice(7);if(el.tagName==='H3')return field(prefix+'.name');if(el.matches('.dish-content>p'))return field(prefix+'.description');if(el.matches('.recipe-photo'))return field(prefix+'.image','image');if(el.matches('[data-recipe]'))return field(prefix+'.buttonLabel');}
 if(id?.startsWith('news-')){const prefix='news.'+id.slice(5);if(el.tagName==='H3')return field(prefix+'.title');if(el.matches('.news-content>p'))return field(prefix+'.excerpt');if(el.tagName==='IMG')return field(prefix+'.image','image');if(el.matches('.text-link'))return field(prefix+'.buttonLabel');}
 if(id?.startsWith('block-')){const prefix='blocks.'+id.slice(6);if(el.tagName==='H2')return field(prefix+'.title');if(el.matches('.block-copy>p'))return field(prefix+'.text');if(el.matches('.block-image'))return field(prefix+'.image','image');if(el.tagName==='A')return {text:prefix+'.buttonLabel',link:prefix+'.link'};}
 return {};
}
export function getContentField(site,path){
 let current=site,parts=path.split('.');if(parts[0]==='blocks'){current=[...Object.values(site.sectionBlocks||{}).flat(),...site.pages.flatMap(page=>page.blocks)];parts.shift();}
 for(const part of parts)current=Array.isArray(current)?/^\d+$/.test(part)?current[Number(part)]:current.find(item=>item.id===part):current?.[part];
 return current;
}
export function setContentField(site,path,value){
 const parts=path.split('.');if(parts.some(part=>!/^[-a-zA-Z0-9]+$/.test(part)||['__proto__','constructor','prototype'].includes(part)))throw new Error('El campo no es válido.');
 let current=site;
 if(parts[0]==='blocks'){current=[...Object.values(site.sectionBlocks||{}).flat(),...site.pages.flatMap(page=>page.blocks)];parts.shift();}
 for(const part of parts.slice(0,-1)){current=Array.isArray(current)?/^\d+$/.test(part)?current[Number(part)]:current.find(item=>item.id===part):current?.[part];if(!current)throw new Error('No se encontró el contenido del elemento.');}
 current[parts.at(-1)]=value;
}
