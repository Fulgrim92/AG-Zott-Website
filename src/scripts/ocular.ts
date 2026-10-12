/**
 * Eyepiece dive (see OcularDive.astro). Scroll scrubs the dive through the eyepiece; a canvas draws an
 * illustrative two-photon-like field: neuropil, dark blood-vessel shadows and pyramidal neurons whose
 * calcium signals flash (fast rise, ~0.7 s decay). Not data.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

type N = { x: number; y: number; s: number; a: number; z: number; rate: number; ca: number; burst: number };

export function initOcular(root: HTMLElement) {
  const motionOK = () => document.documentElement.dataset.motion !== 'off';
  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const pin = q('[data-oc-pin]'), cv = q<HTMLCanvasElement>('[data-oc-canvas]'), eye = q<SVGSVGElement>('[data-oc-eye]');
  const vig = q('[data-oc-vig]'), ret = q<SVGGElement>('[data-oc-ret]'), label = q('[data-oc-label]');
  const lines = [...root.querySelectorAll<HTMLElement>('[data-oc-line]')];
  const ctx = cv.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;
  let neurons: N[] = [];
  let bg: HTMLCanvasElement | null = null;
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // glow sprite for an active soma
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
  { const g = sprite.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(235,255,240,1)'); gr.addColorStop(0.25, 'rgba(77,255,154,.85)'); gr.addColorStop(1, 'rgba(77,255,154,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }

  const layout = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = pin.clientWidth; H = pin.clientHeight; cv.width = W * dpr; cv.height = H * dpr;
    seed = 11; neurons = [];
    const step = W < 700 ? 46 : 58;
    for (let y = -step; y < H + step; y += step * 0.86) for (let x = -step; x < W + step; x += step) {
      if (rnd() < 0.18) continue;
      const hyper = rnd() < 0.07;
      neurons.push({ x: x + (rnd() - 0.5) * step * 0.8, y: y + (rnd() - 0.5) * step * 0.7, s: 5 + rnd() * 4, a: (rnd() - 0.5) * 0.5, z: rnd(),
        rate: hyper ? 0.9 : 0.03 + rnd() * 0.1, ca: 0, burst: 0 });
    }
    // static background: neuropil speckle, out-of-focus somata and dark vessel shadows
    bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    const b = bg.getContext('2d')!; b.scale(dpr, dpr);
    b.fillStyle = '#041411'; b.fillRect(0, 0, W, H);
    for (let i = 0; i < (W * H) / 90; i++) { b.fillStyle = `rgba(90,200,150,${0.02 + rnd() * 0.06})`; b.fillRect(rnd() * W, rnd() * H, 1.4, 1.4); }
    b.lineCap = 'round';
    for (let v = 0; v < 4; v++) {
      let x = rnd() * W, y = -20, w = 10 + rnd() * 16;
      b.strokeStyle = 'rgba(0,6,5,.85)'; b.lineWidth = w; b.beginPath(); b.moveTo(x, y);
      let dx = (rnd() - 0.5) * 40;
      while (y < H + 20) { dx = dx * 0.6 + (rnd() - 0.5) * 50; const nx = x + dx, ny = y + 70 + rnd() * 40; b.quadraticCurveTo(x - dx * 0.4, y + (ny - y) * 0.6, nx, ny); x = nx; y = ny; }
      b.stroke();
    }
    for (const n of neurons) {
      b.save(); b.translate(n.x, n.y); b.rotate(n.a);
      const al = 0.1 + (1 - n.z) * 0.18;
      b.strokeStyle = `rgba(110,220,170,${al})`; b.lineWidth = 1;
      b.beginPath(); b.moveTo(0, -n.s); b.lineTo(0, -n.s * 4.5); b.moveTo(-n.s * 0.7, n.s * 0.6); b.lineTo(-n.s * 1.8, n.s * 2); b.moveTo(n.s * 0.7, n.s * 0.6); b.lineTo(n.s * 1.8, n.s * 2); b.stroke();
      b.fillStyle = `rgba(80,190,140,${al * 1.4})`;
      b.beginPath(); b.moveTo(0, -n.s); b.lineTo(-n.s * 0.85, n.s * 0.75); b.lineTo(n.s * 0.85, n.s * 0.75); b.closePath(); b.fill();
      b.restore();
    }
  };

  let last = performance.now(), raf = 0, visible = false;
  const draw = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (bg) ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const n of neurons) {
      if (motionOK()) {
        if (n.burst > 0) { n.burst -= dt; if (Math.random() < 9 * dt) n.ca = Math.min(1.6, n.ca + 0.55); }
        else if (Math.random() < n.rate * dt) { n.ca = Math.min(1.6, n.ca + 0.8); if (Math.random() < 0.3) n.burst = 0.3; }
        n.ca *= Math.exp(-dt / 0.7);
      }
      if (n.ca < 0.03) continue;
      const r = n.s * (3.2 + n.ca * 1.6), a = Math.min(1, n.ca) * (0.55 + (1 - n.z) * 0.45);
      ctx.globalAlpha = a;
      ctx.drawImage(sprite, n.x - r, n.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (visible && motionOK()) raf = requestAnimationFrame(draw);
  };
  const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(draw); };
  layout();
  new ResizeObserver(() => { layout(); if (!visible || !motionOK()) { for (const n of neurons.filter((_, i) => i % 7 === 0)) n.ca = 0.9; draw(performance.now()); } }).observe(pin);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else cancelAnimationFrame(raf); }).observe(pin);
  addEventListener('agz:motion', start);

  if (!motionOK()) return;

  // ---- the dive ----
  const st = { s: 1, eye: 1, fov: 0, field: 0.55, zoom: 1.7 };
  let cur = -1;
  const render = (t: number) => {
    const hole = ((eye.clientWidth || 400) * 92) / 400 * st.s; // radius of the eyepiece opening on screen
    eye.style.transform = `scale(${st.s.toFixed(3)})`;
    eye.style.opacity = String(st.eye);
    ret.style.opacity = String(Math.max(0, 1 - (st.s - 1) / 2));
    vig.style.background = st.fov >= 1 ? 'none'
      : `radial-gradient(circle at 50% 50%, transparent ${(hole - 1).toFixed(0)}px, #02080a ${(hole + 1).toFixed(0)}px)`;
    cv.style.opacity = String(st.field);
    cv.style.transform = `scale(${st.zoom.toFixed(3)})`;
    const i = t < 3 ? 0 : t < 6.5 ? 1 : 2;
    if (i !== cur) { cur = i; lines.forEach((l, k) => l.classList.toggle('is-on', k === i)); }
    label.classList.toggle('is-on', t > 3.5);
  };
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => render(tl.time()) });
  tl.to(st, { s: 16, duration: 4, ease: 'power3.in' }, 0.4)
    .to(st, { field: 1, duration: 2.5 }, 0.8)
    .to(st, { zoom: 1, duration: 4.5, ease: 'power2.out' }, 1.5)
    .to(st, { eye: 0, duration: 0.6 }, 3.6)
    .set(st, { fov: 1 }, 4.3)
    .to({}, { duration: 5.7 }, 4.3);
  render(0);
  ScrollTrigger.create({
    trigger: pin, start: 'top top', end: () => `+=${innerHeight * 2.2}`, pin: true, scrub: 0.5, anticipatePin: 1, animation: tl,
    onToggle: (self) => document.body.toggleAttribute('data-pinning', self.isActive),
  });
}
