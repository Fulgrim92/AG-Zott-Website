/**
 * Site-wide motion & micro-interactions (GSAP).
 * Everything here is progressive enhancement: without JS, or with reduced motion,
 * content is fully visible and usable.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const motionOK = () => root.dataset.motion !== 'off';
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

export function initMotion() {
  progressBar();
  if (!motionOK()) return;
  splitHeadings();
  reveals();
  wipes();
  counters();
  drawIcons();
  parallax();
  accentSections();
  if (finePointer) { spotlight(); magnetic(); }
}

/* Scroll progress bar — informative, so it runs regardless of motion preference */
function progressBar() {
  const bar = document.querySelector<HTMLElement>('[data-progress]');
  if (!bar) return;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
  });
}

/* Headings: line-by-line masked reveal. Large headings with data-reveal are upgraded automatically. */
function splitHeadings() {
  const els = new Set<HTMLElement>(document.querySelectorAll<HTMLElement>('[data-split]'));
  document.querySelectorAll<HTMLElement>('main h1[data-reveal], main h2[data-reveal]').forEach((el) => {
    el.removeAttribute('data-reveal'); el.setAttribute('data-split', ''); els.add(el);
  });
  const run = () => els.forEach((el) => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'auto',
      onSplit(self) {
        gsap.set(el, { visibility: 'visible' });
        return gsap.from(self.lines, {
          yPercent: 115, rotate: 2, duration: 1.15, ease: 'expo.out', stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      },
    });
  });
  // Wait for webfonts so line breaks are measured correctly (with a safety timeout)
  Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(run);
}

/* Generic fade-up reveals, batched for natural staggering */
function reveals() {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }),
  });
}

/* Media wipes: figures are revealed with a clip-path that opens upward, plus a gentle zoom-out */
function wipes() {
  document.querySelectorAll<HTMLElement>('[data-wipe]').forEach((el) => {
    const media = el.querySelector('video, img, canvas, svg');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.to(el, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.inOut' });
    if (media) tl.from(media, { scale: 1.15, duration: 1.6, ease: 'expo.out' }, 0);
  });
}

/* Animated counters: <span data-count="237" data-decimals="0">237</span> */
function counters() {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count!), dec = +(el.dataset.decimals ?? 0), obj = { v: 0 };
    el.textContent = (0).toFixed(dec);
    gsap.to(obj, {
      v: end, duration: 2, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => (el.textContent = obj.v.toFixed(dec)),
    });
  });
}

/* Parallax: data-parallax="0.15" moves an element against the scroll */
function parallax() {
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const k = parseFloat(el.dataset.parallax!) || 0.15;
    gsap.fromTo(el, { yPercent: -k * 100 }, { yPercent: k * 100, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* Sections with data-accent retint the whole page as they scroll into view */
function accentSections() {
  const body = document.body, base = body.style.getPropertyValue('--accent'), active: HTMLElement[] = [];
  const apply = () => {
    const last = active[active.length - 1];
    if (last) body.style.setProperty('--accent', last.dataset.accent!);
    else if (base) body.style.setProperty('--accent', base);
    else body.style.removeProperty('--accent');
  };
  document.querySelectorAll<HTMLElement>('[data-accent]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 45%',
      onToggle: (self) => {
        const i = active.indexOf(sec);
        if (self.isActive && i < 0) active.push(sec); else if (!self.isActive && i >= 0) active.splice(i, 1);
        apply();
      },
    });
  });
}

/* Cards: a soft highlight follows the pointer */
function spotlight() {
  document.querySelectorAll<HTMLElement>('a.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`); card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}

/* Primary buttons lean gently towards the pointer */
function magnetic() {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.22); yTo((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* Line icons draw themselves when they scroll into view */
function drawIcons() {
  document.querySelectorAll<SVGElement>('[data-draw]').forEach((svg) => {
    gsap.to(svg.querySelectorAll('path'), {
      strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.12,
      scrollTrigger: { trigger: svg, start: 'top 88%', once: true },
    });
  });
}
