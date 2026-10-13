import {safeHref} from './site-model.js';
export function mountCarousels(root,{activeSlides=new Map()}={}) {
  const destroy = [...root.querySelectorAll('[data-carousel]')].map(carousel => {
    const slides = [...carousel.querySelectorAll('[data-carousel-slide]')];
    if (slides.length < 2) return () => {};
    const controls = carousel.querySelector('[data-carousel-controls]');
    const counter = controls.querySelector('[data-carousel-counter]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const events = new AbortController();
    let current = 0, paused = motion.matches || carousel.dataset.autoplay === 'false', hovered = false, focused = false, timer;
    const stop = () => { clearInterval(timer); timer = undefined; };
    function schedule() {
      stop();
      if (paused || hovered || focused || document.hidden) return;
      timer = setInterval(() => {
        if (!document.querySelector('dialog[open]')) show(current + 1);
      }, Math.max(2000, Math.min(20000, Number(carousel.dataset.interval) || 3000))); 
    }
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; });
      const track=carousel.querySelector('.block-carousel-track');if(track)track.style.height='';
      if(carousel.classList.contains('hero')){carousel.classList.remove('image-left','image-center','image-right');carousel.classList.add('image-'+(slides[current].dataset.imageAlign||'center'));if(carousel.dataset.copyMode==='individual'){const copy=JSON.parse(slides[current].dataset.slideCaption||'{}');for(const field of ['eyebrow','title','text','buttonLabel']){const node=carousel.querySelector('[data-caption-field="'+field+'"]');if(!node)continue;node.hidden=!copy[field];if(field==='buttonLabel'){const text=node.querySelector('[data-caption-button-text]');if(text)text.textContent=copy[field]||'';node.href=safeHref(copy.buttonLink);}else node.textContent=copy[field]||'';}}}
      counter.textContent = `${current + 1} / ${slides.length}`;
      carousel.dataset.activeSlide = String(current);
    }
    controls.hidden = false;
    show(Math.min(slides.length-1,activeSlides.get(carousel.dataset.carousel)||0)); schedule();
    const listen = (target, type, handler) => target.addEventListener(type, handler, {signal:events.signal});
    listen(controls, 'click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-carousel-prev')) show(current - 1);
      else if (button.hasAttribute('data-carousel-next')) show(current + 1);
      schedule();
    });
    listen(carousel, 'pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
    listen(carousel, 'pointerleave', () => { hovered = false; schedule(); });
    listen(carousel, 'focusin', () => { focused = true; schedule(); });
    listen(carousel, 'focusout', event => { if (!carousel.contains(event.relatedTarget)) { focused = false; schedule(); } });
    listen(document, 'visibilitychange', schedule);
    listen(motion, 'change', event => { if (event.matches) { paused = true; schedule(); } });
    return () => { stop(); events.abort(); };
  });
  return () => destroy.forEach(dispose => dispose());
}
