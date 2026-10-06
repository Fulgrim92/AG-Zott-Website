import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const root = document.documentElement;

/* ---------- Preferences (motion / palette) ---------- */
type Prefs = { motion?: 'on' | 'off'; palette?: 'cb' | 'default' };
const read = (): Prefs => { try { return JSON.parse(localStorage.getItem('agz-prefs') || '{}'); } catch { return {}; } };
const write = (p: Prefs) => { try { localStorage.setItem('agz-prefs', JSON.stringify({ ...read(), ...p })); } catch { /* storage unavailable */ } };

export const motionAllowed = () => root.dataset.motion !== 'off';

const motionBtn = document.querySelector<HTMLButtonElement>('[data-toggle-motion]');
const paletteBtn = document.querySelector<HTMLButtonElement>('[data-toggle-palette]');
const syncToggles = () => {
  motionBtn?.setAttribute('aria-pressed', String(!motionAllowed()));
  paletteBtn?.setAttribute('aria-pressed', String(root.dataset.palette === 'cb'));
};
syncToggles();
motionBtn?.addEventListener('click', () => {
  const off = motionAllowed();
  if (off) { root.dataset.motion = 'off'; root.classList.remove('js-motion'); } else { delete root.dataset.motion; }
  write({ motion: off ? 'off' : 'on' });
  syncToggles();
  window.dispatchEvent(new CustomEvent('agz:motion', { detail: { allowed: !off } }));
  if (off) document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => gsap.set(el, { clearProps: 'all' }));
});
paletteBtn?.addEventListener('click', () => {
  const cb = root.dataset.palette !== 'cb';
  if (cb) root.dataset.palette = 'cb'; else delete root.dataset.palette;
  write({ palette: cb ? 'cb' : 'default' });
  syncToggles();
  window.dispatchEvent(new CustomEvent('agz:palette'));
});

/* ---------- Navigation: mobile drawer + tablet rail ---------- */
const sidebar = document.getElementById('sidebar')!;
const menuBtn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const scrim = document.querySelector<HTMLElement>('[data-scrim]');
const pin = document.querySelector<HTMLButtonElement>('[data-rail-pin]');

const setDrawer = (open: boolean) => {
  sidebar.classList.toggle('is-open', open);
  menuBtn?.setAttribute('aria-expanded', String(open));
  if (scrim) scrim.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) sidebar.querySelector<HTMLElement>('a')?.focus();
  else if (document.activeElement && sidebar.contains(document.activeElement)) menuBtn?.focus();
};
menuBtn?.addEventListener('click', () => setDrawer(!sidebar.classList.contains('is-open')));
scrim?.addEventListener('click', () => setDrawer(false));
pin?.addEventListener('click', () => {
  const exp = sidebar.classList.toggle('is-expanded');
  pin.setAttribute('aria-expanded', String(exp));
});
document.addEventListener('click', (e) => {
  if (sidebar.classList.contains('is-expanded') && !sidebar.contains(e.target as Node)) {
    sidebar.classList.remove('is-expanded'); pin?.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sidebar.classList.contains('is-open')) setDrawer(false);
  if (sidebar.classList.contains('is-expanded')) { sidebar.classList.remove('is-expanded'); pin?.setAttribute('aria-expanded', 'false'); }
});
// Focus trap while the mobile drawer is open
sidebar.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !sidebar.classList.contains('is-open')) return;
  const f = [...sidebar.querySelectorAll<HTMLElement>('a, button')].filter((el) => el.offsetParent !== null);
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Card spotlight (pointer-following glow) ---------- */
document.querySelectorAll<HTMLElement>('a.card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

/* ---------- Scroll reveals ---------- */
gsap.registerPlugin(ScrollTrigger);
if (motionAllowed()) {
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }),
  });
}
