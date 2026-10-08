import { gsap } from 'gsap';
import { initMotion } from './motion';

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

/* ---------- Header: dropdowns, mobile drawer, scroll state ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const nav = document.getElementById('main-nav');
const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
const scrim = document.querySelector<HTMLElement>('[data-scrim]');
const menuBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-menu-btn]')];
const desktop = matchMedia('(min-width: 1024px)');

const closeMenus = (except?: HTMLButtonElement) => menuBtns.forEach((b) => {
  if (b === except) return;
  b.setAttribute('aria-expanded', 'false');
  document.getElementById(b.getAttribute('aria-controls')!)?.classList.remove('is-open');
});
const openMenu = (b: HTMLButtonElement, open: boolean) => {
  b.setAttribute('aria-expanded', String(open));
  document.getElementById(b.getAttribute('aria-controls')!)?.classList.toggle('is-open', open);
};
menuBtns.forEach((b) => {
  const li = b.parentElement!;
  let t = 0;
  b.addEventListener('click', () => { const open = b.getAttribute('aria-expanded') !== 'true'; closeMenus(b); openMenu(b, open); });
  li.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && desktop.matches) { clearTimeout(t); closeMenus(b); openMenu(b, true); } });
  li.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && desktop.matches) t = window.setTimeout(() => openMenu(b, false), 160); });
  li.addEventListener('focusout', (e) => { if (desktop.matches && !li.contains(e.relatedTarget as Node)) openMenu(b, false); });
});

const setDrawer = (open: boolean) => {
  nav?.classList.toggle('is-open', open);
  burger?.setAttribute('aria-expanded', String(open));
  if (scrim) scrim.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) nav?.querySelector<HTMLElement>('a, button')?.focus();
};
burger?.addEventListener('click', () => setDrawer(!nav?.classList.contains('is-open')));
scrim?.addEventListener('click', () => setDrawer(false));
nav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { setDrawer(false); closeMenus(); }));
desktop.addEventListener('change', () => { setDrawer(false); closeMenus(); });
document.addEventListener('click', (e) => { if (desktop.matches && !(e.target as Element).closest?.('.has-menu')) closeMenus(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const open = menuBtns.find((b) => b.getAttribute('aria-expanded') === 'true');
  closeMenus(); open?.focus();
  if (nav?.classList.contains('is-open')) { setDrawer(false); burger?.focus(); }
});
// Focus trap inside the open drawer
nav?.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab' || !nav.classList.contains('is-open')) return;
  const f = [...nav.querySelectorAll<HTMLElement>('a, button'), burger!].filter((el) => el && el.offsetParent !== null);
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// Header: hairline once scrolled; slides away while reading downwards, returns on scroll up
let lastY = scrollY;
const onScroll = () => {
  const y = scrollY;
  header?.classList.toggle('is-scrolled', y > 8);
  const menuOpen = nav?.classList.contains('is-open') || menuBtns.some((b) => b.getAttribute('aria-expanded') === 'true');
  if (!menuOpen && !document.body.hasAttribute('data-pinning')) header?.classList.toggle('is-hidden', y > 480 && y > lastY + 2);
  if (y < lastY - 2) header?.classList.remove('is-hidden');
  lastY = y;
};
addEventListener('scroll', onScroll, { passive: true });
onScroll();
header?.addEventListener('focusin', () => header.classList.remove('is-hidden'));

/* ---------- Motion & micro-interactions ---------- */
initMotion();
