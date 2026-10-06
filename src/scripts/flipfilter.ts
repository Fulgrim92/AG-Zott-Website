import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
gsap.registerPlugin(Flip);

/** Apply a show/hide change to `items`, animating layout with Flip when motion is allowed. */
export function flipFilter(items: HTMLElement[], change: () => void) {
  if (document.documentElement.dataset.motion === 'off') return change();
  // Once the visitor filters, every item counts as revealed (no pending scroll-reveal at opacity 0)
  items.forEach((el) => { if (el.hasAttribute('data-reveal')) { el.removeAttribute('data-reveal'); gsap.set(el, { opacity: 1, y: 0 }); } });
  const state = Flip.getState(items);
  change();
  Flip.from(state, {
    duration: 0.55, ease: 'power3.inOut', absolute: true, nested: true, prune: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out' }),
    onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }),
  });
}
