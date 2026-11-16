'use strict';
/* =========================================================
   ألبان أبو آمنة — الحركة والتفاعل
   GSAP + ScrollTrigger + SplitText + Lenis + Swiper
   ========================================================= */

/* ---------------- المنتجات ---------------- */
const PRODUCTS = [
  { name: 'روبة جاموس', unit: 'بالجدر', img: 'roba', desc: 'روبة ثخينة متخثّرة بجدر الفخار، دسمها على وجهها.' },
  { name: 'كيمر عرب', unit: 'بالكيلو', img: 'kaymak', desc: 'كيمر جاموس مطبوخ على نار هادية، يذوب بالحلك.' },
  { name: 'كاهي', unit: 'بالقطعة', img: 'kahi', desc: 'كاهي ذهبي مقرمش، ويّا الكيمر والشيرة ما ينقاوم.' },
  { name: 'لبن شنينة', unit: 'بالبطل', img: 'laban', desc: 'لبن بارد ورغوته فوك، رفيق الغدا والصيف.' },
  { name: 'حليب جاموس', unit: 'بالبطل', img: 'milk', desc: 'حليب طازج يوصل كل يوم من الفجر.' },
  { name: 'جبن عرب', unit: 'بالكيلو', img: 'cheese', desc: 'جبن أبيض طري بطعم البيت، للريوك والسندويج.' },
  { name: 'عسل طبيعي', unit: 'بالكيلو', img: 'honey', desc: 'عسل محلي صافي من المناحل.' },
  { name: 'دبس تمر', unit: 'بالبطل', img: 'dibs', desc: 'دبس عراقي ثقيل، ويّا الراشي أو الكيمر.' },
  { name: 'دهن حر', unit: 'بالكيلو', img: 'ghee', desc: 'دهن حر أصلي، ريحته تعبّي المطبخ.' },
  { name: 'بيض عرب', unit: 'بالطبقة', img: 'eggs', desc: 'بيض عرب طازج بصفار غامق.' },
];

document.getElementById('productSlides').innerHTML = PRODUCTS.map(p => `
  <article class="fl-img swiper-slide">
    <img src="assets/img/${p.img}.jpg" alt="${p.name}" loading="lazy">
    <span class="fl-unit">${p.unit}</span>
    <div class="fl-info"><h3>${p.name}</h3><p>${p.desc}</p></div>
  </article>`).join('');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- عنوان التبويب ---------------- */
const defaultTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? 'ارجعلنا.. الكيمر ينتظرك' : defaultTitle;
});

/* ---------------- السكرول الناعم ---------------- */
gsap.registerPlugin(ScrollTrigger, SplitText);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const lenis = new Lenis({ duration: 1, smoothWheel: true, touchMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
gsap.defaults({ ease: 'power3.out', duration: 0.9 });

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target === document.getElementById('top') ? 0 : target, { duration: 1.6 });
  });
});

/* ---------------- قائمة الموبايل ---------------- */
const navWrap = document.querySelector('.navmobile-wrap');
const navCard = document.querySelector('.navmobile');
const navClose = document.querySelector('.nav-close');
let menuOpen = false;

function openMenu() {
  menuOpen = true;
  gsap.set(navWrap, { display: 'block' });
  gsap.to(navClose, { opacity: 1 });
  gsap.fromTo(navCard, { rotate: 0, xPercent: -110, yPercent: -15 }, { rotate: 10, xPercent: -8, yPercent: -15, duration: 0.8 });
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  gsap.to(navClose, { opacity: 0, duration: 0.3 });
  gsap.to(navCard, { rotate: 0, xPercent: -110, yPercent: -15, duration: 0.6, ease: 'power3.in',
    onComplete: () => gsap.set(navWrap, { display: 'none' }) });
}
document.querySelectorAll('.menu-open').forEach(b => b.addEventListener('click', openMenu));
navWrap.addEventListener('click', e => { if (!e.target.closest('a')) closeMenu(); });

/* ---------------- السلايدر ---------------- */
new Swiper('.fl-slide-wrap', {
  loop: true,
  speed: 600,
  grabCursor: true,
  navigation: { nextEl: '#btnNext', prevEl: '#btnPrev' },
  breakpoints: {
    320: { slidesPerView: 1.25, spaceBetween: 14, centeredSlides: true },
    600: { slidesPerView: 2.2, spaceBetween: 16 },
    992: { slidesPerView: 3.2, spaceBetween: 22 },
    1440: { slidesPerView: 4, spaceBetween: 24 },
  },
});

/* ---------------- أدوات ---------------- */
const split = el => SplitText.create(el, { type: 'lines,words', mask: 'lines', linesClass: 'split-line', aria: 'hidden' });

function finishPreload() {
  document.querySelector('.preload').style.display = 'none';
  lenis.start();
  ScrollTrigger.refresh();
}

/* ---------------- البداية ---------------- */
if (reduceMotion) {
  document.querySelector('.preload').style.display = 'none';
  gsap.set('.anatomy', { clipPath: 'none' });
} else {
  lenis.stop();
  document.fonts.ready.then(() => requestAnimationFrame(init));
}

function init() {
  const mm = gsap.matchMedia();

  // شريط التقدم
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => gsap.set('.progress-bar', { width: `${self.progress * 100}%` }),
  });

  // القائمة الثابتة تطلع بعد الواجهة وتختفي عند التذييل
  ScrollTrigger.create({
    start: () => window.innerHeight * 0.9,
    endTrigger: '.footer', end: 'top 20%',
    toggleClass: { targets: '.fixed-menu', className: 'is-appear' },
    invalidateOnRefresh: true,
  });

  mm.add({ desktop: '(min-width: 992px)', mobile: '(max-width: 991px)' }, ctx => {
    const { desktop } = ctx.conditions;
    heroIntro(desktop);
    story(desktop);
    milestones(desktop);
    anatomy();
    fillings();
    street(desktop);
    footer();
  });
}

/* ---------------- التحميل → الواجهة ---------------- */
let introPlayed = false;
function heroIntro(desktop) {
  if (introPlayed) return; // لا نعيد التحميل عند تغيير حجم الشاشة
  introPlayed = true;

  const preH1 = split('.preload-content h1');
  const heroText = split('.hero-b2');
  const dist = desktop ? 350 : 260;
  const dur = desktop ? 1.8 : 1.2;
  const h1s = document.querySelectorAll('.hero-h1');

  gsap.set(['.hero-top', '.hero-bottom'], { opacity: 0 });
  gsap.set('.hero-img', { opacity: 0, scale: 0, rotate: 360 });

  gsap.timeline({ onComplete: finishPreload })
    .from(preH1.lines, { yPercent: 110, stagger: 0.12, delay: 0.5 })
    .to('.preload-content', { scale: 0, delay: 0.5, duration: 0.6, ease: 'power2.in' })
    .fromTo('.bg-circle',
      { clipPath: 'circle(75% at 50% 50%)' },
      { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'power3.inOut' }, '<')
    // بالعربي: الكلمة الأولى يمين فتجي من اليمين
    .fromTo(h1s[0], desktop ? { xPercent: dist } : { yPercent: -dist / 2, opacity: 0 },
      { xPercent: 0, yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, '<')
    .fromTo(h1s[1], desktop ? { xPercent: -dist } : { yPercent: dist / 2, opacity: 0 },
      { xPercent: 0, yPercent: 0, opacity: 1, duration: dur, ease: 'expo.out' }, '<')
    .to('.hero-circle', { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: 'back.out(1.4)' }, '<0.6')
    .to('.hero-sticker', { opacity: 1, scale: 1, rotate: 0, duration: 1.2, ease: 'back.out(1.6)' }, '<0.15')
    .to(['.hero-top', '.hero-bottom'], { opacity: 1, duration: 1.2 }, '-=0.4')
    .from(heroText.lines, { y: 50, stagger: 0.08 }, '<0.2');

  // تطفو الستيكر بهدوء
  gsap.to('.hero-sticker', { y: -14, duration: 1.6, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 4.5 });
}

/* ---------------- الحكاية ---------------- */
function story(desktop) {
  const h1 = split('.evo-wrap h1');
  const p = split('.evo-wrap p');
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.evolution-wrap', start: 'top 40%', toggleActions: 'play none none reverse' },
  });
  if (desktop) {
    tl.fromTo('.evo-img', { clipPath: 'inset(50% 50% 50% 50%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, stagger: 0.12, ease: 'power2.out' });
  } else {
    tl.from('.evo-img', { y: 60, opacity: 0, stagger: 0.1 });
  }
  tl.from(h1.lines, { y: 150, stagger: 0.1 }, '<0.1')
    .from(p.lines, { y: 100, stagger: 0.1 }, '<0.2');

  // اللوحة الأولى تنفتح من النص مع السكرول
  gsap.fromTo('#msTop', { clipPath: 'inset(50% 50% 50% 50%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: '.evolution-wrap', start: '15% top', end: '60% bottom', scrub: 1 },
  });

  const ms = msSplit(0);
  gsap.timeline({ scrollTrigger: { trigger: '.evolution-wrap', start: '45% top', toggleActions: 'play none none reverse' } })
    .from(ms.h.lines, { y: 150, stagger: 0.1 })
    .from(ms.p.lines, { y: 80, stagger: 0.06 }, '<0.1')
    .from('#msTop .ms-num', { opacity: 0, y: 20 }, '<');
}

function msSplit(i) {
  return {
    h: split(document.querySelectorAll('.ms-header h2')[i]),
    p: split(document.querySelectorAll('.ms-header p')[i]),
  };
}

function milestones(desktop) {
  const imgs = document.querySelectorAll('.ms-img-wrap-border');
  const m1 = msSplit(1);
  const m2 = msSplit(2);

  if (desktop) {
    gsap.timeline({ scrollTrigger: { trigger: '.milestone-sticky', start: '10% top', end: 'bottom bottom', scrub: 1 } })
      .to('#ms2', { scale: 0.82, rotate: 5, opacity: 0.5, ease: 'none' });
  }

  gsap.timeline({ scrollTrigger: { trigger: '.milestone-sticky', start: 'top 50%', toggleActions: 'play none none reverse' } })
    .from(m1.h.lines, { y: 150, stagger: 0.1 })
    .from(m1.p.lines, { y: 80, stagger: 0.06 }, '<0.1')
    .fromTo(imgs[1], { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out' }, '<0.2');

  gsap.timeline({ scrollTrigger: { trigger: '.milestone-sticky', start: desktop ? '50% 85%' : '40% 50%', toggleActions: 'play none none reverse' } })
    .from(m2.h.lines, { y: 150, stagger: 0.1 })
    .from(m2.p.lines, { y: 80, stagger: 0.06 }, '<0.1')
    .fromTo(imgs[2], { clipPath: 'inset(50% 50% 50% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out' }, '<0.1');
}

/* ---------------- لمّة الريوك ---------------- */
function anatomy() {
  const preH1 = split('.pre-anatomy h1');
  const floatPre = gsap.to('.pre-img', { y: -24, duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true });
  const floatMain = gsap.to('#anabm', { y: -18, duration: 1.2, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true });
  const spin = gsap.to('#startRed', { rotate: 360, duration: 40, ease: 'none', repeat: -1, paused: true });

  gsap.timeline({
    scrollTrigger: { trigger: '.anatomy-wrapper', start: 'top 50%', toggleActions: 'play none none reverse' },
    onComplete: () => floatPre.play(),
  })
    .from(preH1.lines, { y: 150, stagger: 0.1 })
    .from('.pre-img img', { scale: 0.5, opacity: 0, rotate: -20, duration: 1.1 }, '<0.1');

  gsap.timeline({
    scrollTrigger: {
      trigger: '.anatomy-wrapper', start: '20% top', end: '75% bottom', scrub: 1,
      onEnter: () => { floatMain.play(); spin.play(); },
    },
  })
    .to('.pre-img', { scale: 0, ease: 'none', duration: 1 })
    .fromTo('.anatomy',
      { clipPath: 'polygon(60% 0, 60% 0, 40% 100%, 40% 100%)' },
      { clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0% 100%)', ease: 'none', duration: 1 }, '<0.2')
    .from('.ana-bg span', { xPercent: i => (i % 2 ? -30 : 30), ease: 'none', duration: 1.4 }, '<')
    .from('#startRed', { scale: 0, opacity: 0, duration: 0.6 }, '<0.6')
    .from('#anabm', { scale: 0, opacity: 0, rotate: -40, duration: 0.6 }, '<0.1')
    .from('.ana-title', { yPercent: 60, opacity: 0, stagger: 0.1, duration: 0.6 }, '<');

  gsap.timeline({ scrollTrigger: { trigger: '.anatomy-wrapper', start: '50% 20%', toggleActions: 'play none none reverse' } })
    .from('#list1 p', { opacity: 0, x: -30, stagger: { each: 0.08, from: 'start' }, duration: 0.6 })
    .from('#list2 p', { opacity: 0, x: 30, stagger: { each: 0.08, from: 'end' }, duration: 0.6 }, '<');
}

/* ---------------- المنتجات ---------------- */
function fillings() {
  const rows = document.querySelectorAll('.fillings-content');
  const bgs = document.querySelectorAll('.fillings-bg');
  const words = [...rows].map(r => split(r.querySelector('h1')));
  const text = split('.fl-wrap p');

  const tl = gsap.timeline({ scrollTrigger: { trigger: '.fl-wrapper', start: 'top 60%', toggleActions: 'play none none reverse' } });
  rows.forEach((r, i) => {
    tl.fromTo(bgs[i], { clipPath: 'inset(0% 50% 0% 50% round 999px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 0.8, ease: 'power3.inOut' }, i ? '<0.15' : 0)
      .from(words[i].lines, { y: 220, duration: 0.9 }, '<0.1');
  });

  gsap.timeline({ scrollTrigger: { trigger: '.fl-wrapper', start: 'top top', end: 'bottom bottom', scrub: 1 } })
    .from('.fl-carousel', { autoAlpha: 0, duration: 0.01 })
    .to([rows[0], rows[2]], { xPercent: -300, rotate: -80, scale: 0.2, duration: 1.2, ease: 'none' }, 0)
    .to(rows[1], { xPercent: 300, rotate: 80, scale: 0.2, duration: 1.2, ease: 'none' }, 0)
    .fromTo('.fl-slide-wrap', { clipPath: 'inset(0% 50% 0% 50%)', scale: 0.2 },
      { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, ease: 'none' }, 0.3);

  gsap.timeline({ scrollTrigger: { trigger: '.fl-wrapper', start: '55% 50%', toggleActions: 'play none none reverse' } })
    .from(text.lines, { y: 50, stagger: 0.05 })
    .from('#btnNext', { xPercent: 80, rotate: -360, opacity: 0 }, '<0.1')
    .from('#btnPrev', { xPercent: -80, rotate: 360, opacity: 0 }, '<');
}

/* ---------------- بكل بيت ---------------- */
function street(desktop) {
  gsap.fromTo('#h1BigTypo', { clipPath: 'inset(0% 0% 100% 0%)' }, {
    clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
    scrollTrigger: { trigger: '.street', start: desktop ? 'top 5%' : 'top 40%', end: desktop ? '100% 90%' : '100% 80%', scrub: 1 },
  });
  document.querySelectorAll('.st-img').forEach((el, i) => {
    gsap.fromTo(el, { y: 120 + (i % 3) * 60 }, {
      y: -(80 + (i % 2) * 90), ease: 'none',
      scrollTrigger: { trigger: '.street', start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  });
  gsap.from('.st-note', {
    scale: 0, rotate: -40, ease: 'back.out(2)',
    scrollTrigger: { trigger: '.street', start: 'top 40%', toggleActions: 'play none none reverse' },
  });
}

/* ---------------- التذييل ---------------- */
function footer() {
  gsap.timeline({ scrollTrigger: { trigger: '.footer', start: 'top 30%', toggleActions: 'play none none reverse' } })
    .from('#ftPaper', { scale: 0, rotate: -20, duration: 1, ease: 'back.out(1.4)' })
    .from('.ft-bmvn img', { yPercent: 150, stagger: 0.1 }, '<0.2')
    .from('.ft-img-top', { x: 500, rotate: 90, duration: 1.2 }, '<0.1')
    .from('.ft-img-bottom', { x: -500, rotate: -90, duration: 1.2 }, '<');
}

/* بعد ما تتحمل الصور، نحدّث مواضع السكرول */
window.addEventListener('load', () => ScrollTrigger.refresh());
