export function applyImageSizing(image,options={}){
 if(!image)return;
 const frame=image.parentElement?.matches('.lab-pathway-media,.news-image,.dish-art')?image.parentElement:null;
 // Cards keep one fixed frame so every dish or story has the same measures; only fit and focus change.
 if(!frame){
  if(options.imageWidth){image.style.width=`${options.imageWidth}%`;image.style.maxWidth='100%';if(!options.imageHeight)image.style.height='auto';}
  if(options.imageHeight){const track=image.closest('.block-carousel-track');if(track)track.style.height='';image.style.height=`${options.imageHeight}px`;image.style.maxHeight='none';}
 }
 if(options.imageFit)image.style.objectFit=options.imageFit;
 if(options.imageFocusX!==null&&options.imageFocusX!==undefined||options.imageFocusY!==null&&options.imageFocusY!==undefined)image.style.objectPosition=`${options.imageFocusX??50}% ${options.imageFocusY??50}%`;
}
