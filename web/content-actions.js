import {getContentField,setContentField} from './content-binding.js';

export function removeSection(site,id){
 const exists=site.navigation.some(item=>item.id===id)||site.pages.some(item=>item.id===id);
 if(!exists)throw new Error('La sección ya no existe.');
 site.navigation=site.navigation.filter(item=>item.id!==id);
 site.pages=site.pages.filter(item=>item.id!==id);
 delete site.sectionBlocks?.[id];
 site.deletedSections=[...new Set([...(site.deletedSections||[]),id])];
 site.shortcuts=site.shortcuts.filter(item=>item.link!=='#'+id);
 for(const key of Object.keys(site.elementOverrides||{}))if(key.startsWith(`page-${id}:`)||key===`page-${id}`)delete site.elementOverrides[key];
}

export function removeContentItem(site,type,id){
 if(type==='navigation'||type==='pages'){removeSection(site,id);return;}
 let items;
 if(type==='slides')items=site.home.slides;
 else if(type==='blocks')items=[...Object.values(site.sectionBlocks||{}),...site.pages.map(page=>page.blocks)].find(list=>list.some(item=>item.id===id));
 else if(['news','recipes','recipeMenus','shortcuts'].includes(type))items=site[type];
 const index=items?.findIndex(item=>item.id===id);if(index===undefined||index<0)throw new Error('El elemento ya no existe.');
 items.splice(index,1);
 if(type==='recipeMenus')for(const recipe of site.recipes)recipe.menuIds=(recipe.menuIds||[]).filter(menu=>menu!==id);
 const prefix={blocks:'block-',news:'news-',recipes:'recipe-'}[type];
 if(prefix)for(const key of Object.keys(site.elementOverrides||{}))if(key.includes(prefix+id))delete site.elementOverrides[key];
}

export function removeVisualContent(site,action){
 if(action.type){removeContentItem(site,action.type,action.id);return;}
 if(action.slidePath){const slides=getContentField(site,action.slidePath);if(!Array.isArray(slides)||!slides[action.index])throw new Error('La imagen ya no existe.');slides.splice(action.index,1);return;}
 if(action.addedImageParent){const value=site.elementOverrides?.[action.addedImageParent];if(value){delete value.image;delete value.alt;}return;}
 if(action.imagePath)setContentField(site,action.imagePath,'');
 if(action.key==='page-noticias:section-home-hero'){site.home.slides=[];delete site.home.image;}
 site.elementOverrides||={};site.elementOverrides[action.key]={...(site.elementOverrides[action.key]||{}),removed:true,...(action.imagePath?{removedImagePath:action.imagePath}:{})};
 delete site.elementOverrides[action.key].positions;delete site.elementOverrides[action.key].placement;
}

export function restoreReplacedImages(site,previous){
 for(const [key,value]of Object.entries(site.elementOverrides||{}))if(value.removedImagePath){const path=value.removedImagePath;if(getContentField(site,path)&&getContentField(site,path)!==getContentField(previous,path)){delete value.removed;delete value.removedImagePath;}}
}
