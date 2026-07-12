/**
 * Motor de animaciones — Lenis (scroll suave) + GSAP/ScrollTrigger.
 *
 * Principios de rendimiento:
 *  - Respeta `prefers-reduced-motion`: si está activo, NO se anima nada.
 *  - En móvil se reduce/omite el parallax pesado (coste de repintado alto).
 *  - Todo es "progressive enhancement": si el JS falla, el contenido se ve igual.
 *  - Las animaciones se registran solo si su elemento existe en la página.
 */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;

let lenis: Lenis | null = null;

/** Scroll suave con inercia. En táctil dejamos el scroll nativo (mejor rendimiento). */
function initLenis() {
  if (prefersReducedMotion()) return;

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // En dispositivos táctiles NO forzamos smooth: el scroll nativo va mejor.
    syncTouch: false,
    touchMultiplier: 1.5,
    wheelMultiplier: 1,
  });

  // Sincroniza Lenis con el reloj de GSAP (una sola fuente de rAF).
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Enlaces internos con scroll suave hasta el ancla.
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis?.scrollTo(target as HTMLElement, { offset: -80 });
    });
  });
}

/** Revelado genérico de todos los elementos [data-reveal] con stagger por grupos. */
function initReveals() {
  const els = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (!els.length) return;

  if (prefersReducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0 });
    return;
  }

  els.forEach((el) => {
    const delay = parseFloat(el.dataset.revealDelay ?? '0');
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      delay,
      ease: 'expo.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  });
}

/** HERO — parallax del fondo + entrada escalonada del texto. */
function initHero() {
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (!hero) return;

  // Entrada del texto al cargar (siempre suave, no depende del scroll).
  if (!prefersReducedMotion()) {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('[data-hero-line]', { yPercent: 120, opacity: 0, duration: 1.1, stagger: 0.12 })
      .from('[data-hero-sub]', { y: 24, opacity: 0, duration: 0.9 }, '-=0.6')
      .from('[data-hero-cta]', { y: 20, opacity: 0, duration: 0.7, stagger: 0.1 }, '-=0.55')
      .from('[data-hero-stat]', { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.5');
  }

  // Parallax del media del hero (desactivado en móvil por coste de repintado).
  const media = hero.querySelector<HTMLElement>('[data-hero-media]');
  if (media && !prefersReducedMotion() && !isMobile()) {
    gsap.to(media, {
      yPercent: 18,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }

  // Oscurecer/desvanecer el contenido del hero al salir (efecto cine).
  const content = hero.querySelector<HTMLElement>('[data-hero-content]');
  if (content && !prefersReducedMotion()) {
    gsap.to(content, {
      opacity: 0,
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'center center',
        end: 'bottom top',
        scrub: true,
      },
    });
  }
}

/** FLOTA — revelado escalonado de las tarjetas + medidor de "thrill". */
function initFleet() {
  const grid = document.querySelector<HTMLElement>('[data-fleet-grid]');
  if (!grid || prefersReducedMotion()) return;

  const cards = gsap.utils.toArray<HTMLElement>('[data-fleet-card]', grid);
  ScrollTrigger.batch(cards, {
    start: 'top 88%',
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'expo.out',
        stagger: 0.12,
        overwrite: true,
      }),
  });
  gsap.set(cards, { opacity: 0, y: 40 });

  // Rellenar las barras de "thrill" al entrar en viewport.
  gsap.utils.toArray<HTMLElement>('[data-thrill-fill]').forEach((bar) => {
    const pct = bar.dataset.thrillFill ?? '0';
    gsap.fromTo(
      bar,
      { scaleX: 0 },
      {
        scaleX: parseFloat(pct) / 100,
        duration: 1.1,
        ease: 'expo.out',
        transformOrigin: 'left center',
        scrollTrigger: { trigger: bar, start: 'top 92%' },
      }
    );
  });
}

/**
 * MOTO 360° — secuencia de imágenes dibujada en <canvas> controlada por scroll.
 * Solo se activa si existe el canvas Y hay frames configurados. Carga diferida.
 */
function initSpin360() {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-spin360]');
  if (!canvas || prefersReducedMotion()) return;

  const frameCount = parseInt(canvas.dataset.frames ?? '0', 10);
  const pathTemplate = canvas.dataset.framePath; // p.ej. "/images/spin/jet_{i}.webp"
  if (!frameCount || !pathTemplate) return; // aún no hay material → no hacemos nada

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const images: HTMLImageElement[] = [];
  const state = { frame: 0 };
  let loaded = 0;

  const urlFor = (i: number) =>
    pathTemplate.replace('{i}', String(i + 1).padStart(3, '0'));

  const render = () => {
    const img = images[state.frame];
    if (!img || !img.complete) return;
    const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  };

  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = urlFor(i);
    img.onload = () => {
      loaded++;
      if (loaded === 1) render();
    };
    images.push(img);
  }

  gsap.to(state, {
    frame: frameCount - 1,
    snap: 'frame',
    ease: 'none',
    scrollTrigger: {
      trigger: canvas.closest('[data-spin360-section]') ?? canvas,
      start: 'top top',
      end: '+=1200',
      scrub: 0.5,
      pin: true,
    },
    onUpdate: render,
  });
}

/** CÓMO FUNCIONA — línea de progreso que se "dibuja" al hacer scroll. */
function initHowto() {
  const line = document.querySelector<SVGPathElement>('[data-howto-line]');
  const section = document.querySelector<HTMLElement>('[data-howto]');
  if (!line || !section || prefersReducedMotion()) return;

  const length = line.getTotalLength();
  gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
  gsap.to(line, {
    strokeDashoffset: 0,
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top 60%',
      end: 'bottom 75%',
      scrub: true,
    },
  });

  gsap.utils.toArray<HTMLElement>('[data-howto-step]').forEach((step) => {
    gsap.from(step, {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: 'expo.out',
      scrollTrigger: { trigger: step, start: 'top 82%' },
    });
  });
}

/** RUTAS — pines del mapa que aparecen secuencialmente. */
function initRoutesMap() {
  const map = document.querySelector<HTMLElement>('[data-routes-map]');
  if (!map || prefersReducedMotion()) return;

  const pins = gsap.utils.toArray<HTMLElement>('[data-map-pin]', map);
  gsap.from(pins, {
    opacity: 0,
    scale: 0,
    transformOrigin: 'center center',
    duration: 0.5,
    ease: 'back.out(2)',
    stagger: 0.18,
    scrollTrigger: { trigger: map, start: 'top 70%' },
  });

  const path = map.querySelector<SVGPathElement>('[data-route-path]');
  if (path) {
    const len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.6,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: map, start: 'top 70%' },
    });
  }
}

/**
 * SHOWCASE 3D — sección fijada donde las 4 motos se "fusionan" una en otra
 * al hacer scroll: la actual gira y se desvanece mientras la siguiente entra
 * con perspectiva 3D. El texto (nombre, CV, precio) se sincroniza, y unas
 * barras de progreso marcan en qué modelo estás.
 * Usa position:sticky (CSS) + una timeline con scrub; sin JS se ve el 1er modelo.
 */
function initShowcase() {
  const track = document.querySelector<HTMLElement>('[data-showcase-track]');
  if (!track || prefersReducedMotion()) return;

  const imgs = gsap.utils.toArray<HTMLElement>('[data-show-img]', track);
  const texts = gsap.utils.toArray<HTMLElement>('[data-show-text]', track);
  const bars = gsap.utils.toArray<HTMLElement>('[data-show-bar]', track);
  const n = imgs.length;
  if (n < 2) return;

  // La altura del track define cuánto scroll dura la secuencia.
  // Más corto en móvil para no alargar en exceso la página.
  const perModel = isMobile() ? 55 : 90;
  track.style.height = `${n * perModel + 80}vh`;

  gsap.set(imgs, { transformPerspective: 1200 });
  imgs.forEach((img, i) => i > 0 && gsap.set(img, { opacity: 0, rotationY: 32, scale: 0.88 }));
  texts.forEach((txt, i) => i > 0 && gsap.set(txt, { opacity: 0, y: 28 }));

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
    },
  });

  // Transiciones: modelo i se funde en el i+1
  for (let i = 0; i < n - 1; i++) {
    const at = i + 1;
    tl.to(imgs[i], { opacity: 0, rotationY: -24, scale: 1.05, duration: 0.45, ease: 'power2.in' }, at)
      .to(texts[i], { opacity: 0, y: -22, duration: 0.4, ease: 'power2.in' }, at)
      .to(imgs[i + 1], { opacity: 1, rotationY: 0, scale: 1, duration: 0.5, ease: 'power2.out' }, at + 0.35)
      .to(texts[i + 1], { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at + 0.4);
  }
  // Tramo final de "reposo" con el último modelo visible
  tl.to({}, { duration: 0.9 });

  // Barras de progreso: cada una se rellena durante su segmento
  bars.forEach((bar, i) => {
    tl.fromTo(
      bar,
      { scaleX: 0 },
      { scaleX: 1, duration: 1, ease: 'none', transformOrigin: 'left center' },
      i
    );
  });
}

/** Cabecera que cambia de estilo al hacer scroll. */
function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  ScrollTrigger.create({
    start: 'top -60',
    end: 99999,
    onUpdate: (self) => {
      header.classList.toggle('is-scrolled', self.scroll() > 60);
    },
    onToggle: (self) => header.classList.toggle('is-scrolled', self.isActive),
  });
  // estado inicial
  header.classList.toggle('is-scrolled', window.scrollY > 60);
}

function boot() {
  document.documentElement.classList.add('gsap-ready');
  initLenis();
  initHeader();
  initHero();
  initReveals();
  initShowcase();
  initFleet();
  initSpin360();
  initHowto();
  initRoutesMap();

  // Recalcular tras cargar fuentes/imágenes (evita desajustes de posición).
  ScrollTrigger.refresh();
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
