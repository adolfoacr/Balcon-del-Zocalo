export function applyImageSizing(image,options={}){
 if(!image)return;
 const frame=image.parentElement?.matches('.lab-pathway-media,.news-image,.dish-art')?image.parentElement:null;
 if(options.imageWidth){if(frame){frame.style.width=`${options.imageWidth}%`;image.style.width='100%';}else image.style.width=`${options.imageWidth}%`;image.style.maxWidth='100%';}
 if(options.imageHeight){const track=image.closest('.block-carousel-track');if(track&&!image.parentElement.hidden)track.style.height=`${options.imageHeight}px`;image.style.height=`${options.imageHeight}px`;image.style.maxHeight='none';if(frame)frame.style.height=`${options.imageHeight}px`;}
 if(options.imageFit)image.style.objectFit=options.imageFit;
 if(options.imageFocusX!==null&&options.imageFocusX!==undefined||options.imageFocusY!==null&&options.imageFocusY!==undefined)image.style.objectPosition=`${options.imageFocusX??50}% ${options.imageFocusY??50}%`;
}
