(() => {
  function initCarousel(root){
    const slides = Array.from(root.querySelectorAll(".slide"));
    const dots = Array.from(root.querySelectorAll(".dot"));
    if(slides.length === 0) return;

    let idx = 0;
    let timer = null;
    const interval = Number(root.dataset.interval || 6000);

    function show(i){
      idx = (i + slides.length) % slides.length;
      slides.forEach((s, k)=> s.setAttribute("aria-hidden", k === idx ? "false" : "true"));
      dots.forEach((d, k)=> d.setAttribute("aria-selected", k === idx ? "true" : "false"));
    }

    function start(){
      stop();
      timer = setInterval(()=> show(idx + 1), interval);
    }
    function stop(){
      if(timer) clearInterval(timer);
      timer = null;
    }

    dots.forEach((d, i)=> d.addEventListener("click", ()=> { show(i); start(); }));
    // prev / next buttons
const prevBtn = root.querySelector('[data-carousel-prev], .carousel-btn.prev, .carousel-btn--prev');
const nextBtn = root.querySelector('[data-carousel-next], .carousel-btn.next, .carousel-btn--next');

if (prevBtn) {
  prevBtn.addEventListener('click', (e) => {
    e.preventDefault();
    show(idx - 1);
    start();
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    show(idx + 1);
    start();
  });
}
    // touch swipe
    let x0 = null;
    root.addEventListener("touchstart", (e)=> { x0 = e.touches[0].clientX; }, {passive:true});
    root.addEventListener("touchend", (e)=> {
      if(x0 == null) return;
      const x1 = e.changedTouches[0].clientX;
      const dx = x1 - x0;
      x0 = null;
      if(Math.abs(dx) < 40) return;
      show(idx + (dx < 0 ? 1 : -1));
      start();
    }, {passive:true});

    // pause on hover (desktop)
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);

    // keyboard
    root.addEventListener("keydown", (e)=>{
      if(e.key === "ArrowLeft"){ show(idx - 1); start(); }
      if(e.key === "ArrowRight"){ show(idx + 1); start(); }
    });

    show(0);
    start();
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    document.querySelectorAll("[data-carousel]").forEach(initCarousel);
  });
})();