/**
 * Graphical abstract engine. A scroll-scrubbed GSAP timeline moves a small set of state values
 * (β-amyloid present, reuptake block, activity, zoom, plaque, imaging…); a ticker turns that state
 * into continuous micro-motion (glutamate release and clearance, flashing neurons, a scanning laser).
 * Everything here is an illustrative schematic grounded in the references listed in home.json.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, attrs: Record<string, string | number>, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e as SVGElement;
};
let seed = 21;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function initAbstract(root: HTMLElement) {
  const motionOK = () => document.documentElement.dataset.motion !== 'off';
  const svg = root.querySelector<SVGSVGElement>('[data-ga-svg]')!;
  const q = <T extends Element = SVGElement>(s: string) => root.querySelector<T>(s)!;
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-ga-ch]')];
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-ga-tab]')];
  const num = q<HTMLElement>('[data-ga-num]');
  const bar = q<HTMLElement>('[data-ga-bar]');
  const handoff = q<HTMLElement>('[data-ga-handoff]');
  const real = q<HTMLElement>('[data-ga-real]');
  const video = real.querySelector('video')!;

  // Scene state, tweened by the timeline
  const st = { syn: 0, ab: 0, block: 0, activity: 0, cycle: 0, zoom: 0, pop: 0, plaque: 0, img: 0, scan: 0, fov: 0, real: 0 };

  /* ------------------------------------------------------------------ synapse */
  const vesG = q('[data-ga-vesicles]');
  const vesicles = [[600, 292], [540, 250], [660, 250], [600, 210], [495, 190], [705, 190], [560, 150], [645, 140]].map(([x, y], i) => {
    const g = el('g', { transform: `translate(${x} ${y})` }, vesG);
    el('circle', { r: 24, fill: '#0a2430', stroke: '#5fd3c6', 'stroke-opacity': 0.6, 'stroke-width': 2 }, g);
    for (let k = 0; k < 6; k++) el('circle', { cx: (rnd() - 0.5) * 24, cy: (rnd() - 0.5) * 24, r: 3.2, fill: '#ffd166', opacity: 0.85 }, g);
    return { g, x, y, docked: i === 0 };
  });

  type Glu = { e: SVGElement; x: number; y: number; vx: number; vy: number; on: boolean; cap: number; tx: number; ty: number };
  const gluG = q('[data-ga-glu]');
  const glu: Glu[] = Array.from({ length: 70 }, () => ({ e: el('circle', { r: 4, fill: '#ffd166', opacity: 0 }, gluG), x: 0, y: 0, vx: 0, vy: 0, on: false, cap: 0, tx: 0, ty: 0 }));
  const transporters = [[296, 340], [302, 386], [276, 420], [904, 340], [898, 386], [924, 420]];
  const tpEls = [...root.querySelectorAll<SVGElement>('[data-ga-transporters] > g')];
  const receptorsX = [480, 525, 570, 630, 675, 720];
  const recEls = [...root.querySelectorAll<SVGElement>('[data-ga-receptors] rect')];

  // β-amyloid dimers: two linked hexagons each
  const abG = q('[data-ga-abeta]');
  const hex = (r: number) => Array.from({ length: 6 }, (_, k) => `${(r * Math.cos((k * Math.PI) / 3)).toFixed(1)},${(r * Math.sin((k * Math.PI) / 3)).toFixed(1)}`).join(' ');
  const abeta = Array.from({ length: 14 }, (_, i) => {
    const g = el('g', { opacity: 0 }, abG);
    el('polygon', { points: hex(8), fill: '#ff7a59', 'fill-opacity': 0.85 }, g);
    el('polygon', { points: hex(8), fill: '#ff9a76', 'fill-opacity': 0.85, transform: 'translate(14 4)' }, g);
    const side = i % 2 ? 1 : -1;
    const bound = i < 6;
    const t = transporters[i % 6];
    return {
      g, bound,
      sx: side > 0 ? 1260 : -60, sy: 260 + rnd() * 260,
      tx: bound ? t[0] + (t[0] < 600 ? 34 : -46) : 380 + rnd() * 440, ty: bound ? t[1] + (rnd() - 0.5) * 30 : 340 + rnd() * 40,
      ph: rnd() * 6.28, delay: rnd() * 0.4,
    };
  });

  const caEl = q('[data-ga-ca]');
  let caLevel = 0, releaseTimer = 0.4;
  const meter = q<SVGPolylineElement>('[data-ga-trace]');
  const meterBuf = new Float32Array(120);

  const release = () => {
    const n = 12;
    let k = 0;
    for (const p of glu) {
      if (p.on || k >= n) continue;
      p.on = true; p.cap = 0; p.x = 600 + (rnd() - 0.5) * 30; p.y = 320; p.vx = (rnd() - 0.5) * 160; p.vy = 40 + rnd() * 120;
      k++;
    }
    gsap.fromTo(vesicles[0].g, { scale: 1 }, { scale: 0.75, duration: 0.15, yoyo: true, repeat: 1, transformOrigin: '50% 50%', svgOrigin: '600 292' });
  };

  const tickSynapse = (dt: number) => {
    const visible = st.syn > 0.02 && st.zoom < 0.98;
    // vesicle release cadence follows activity
    releaseTimer -= dt;
    if (visible && releaseTimer <= 0) { release(); releaseTimer = 2.1 / (1 + 2.8 * st.activity) * (0.8 + rnd() * 0.4); }
    const clearRate = 3.2 * (1 - 0.88 * st.block);  // per second
    const spill = st.block * 130;
    let bound = 0;
    for (const p of glu) {
      if (!p.on) { p.e.setAttribute('opacity', '0'); continue; }
      if (p.cap > 0) { // being taken up by a transporter
        p.cap += dt * 3;
        p.x += (p.tx - p.x) * Math.min(1, dt * 8); p.y += (p.ty - p.y) * Math.min(1, dt * 8);
        if (p.cap > 1) p.on = false;
      } else {
        p.vx += (rnd() - 0.5) * 900 * dt; p.vy += (rnd() - 0.5) * 900 * dt;
        p.vx *= 0.92; p.vy *= 0.92;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const x0 = 330 - spill, x1 = 870 + spill, y0 = 326, y1 = 392 + spill * 0.25;
        if (p.x < x0) { p.x = x0; p.vx = Math.abs(p.vx); } if (p.x > x1) { p.x = x1; p.vx = -Math.abs(p.vx); }
        if (p.y < y0) { p.y = y0; p.vy = Math.abs(p.vy); } if (p.y > y1) { p.y = y1; p.vy = -Math.abs(p.vy); }
        if (rnd() < clearRate * dt) {
          let best = transporters[0], bd = 1e9;
          for (const t of transporters) { const d = (t[0] - p.x) ** 2 + (t[1] - p.y) ** 2; if (d < bd) { bd = d; best = t; } }
          p.cap = 0.001; p.tx = best[0]; p.ty = best[1];
        }
        if (p.y > 378 && p.x > 465 && p.x < 735) bound++;
      }
      p.e.setAttribute('cx', p.x.toFixed(1)); p.e.setAttribute('cy', p.y.toFixed(1));
      p.e.setAttribute('opacity', String(p.cap > 0 ? 1 - p.cap : 0.95));
    }
    // receptor activation → spine calcium
    const target = clamp(bound / 7) * (0.55 + 0.6 * st.activity);
    caLevel += (target - caLevel) * Math.min(1, dt * (target > caLevel ? 9 : 1.6));
    caEl.setAttribute('opacity', (caLevel * 0.95).toFixed(3));
    recEls.forEach((r, i) => r.setAttribute('opacity', String(0.6 + 0.4 * clamp(caLevel * 1.4 + Math.sin(i + performance.now() / 300) * 0.1))));
    meterBuf.copyWithin(0, 1); meterBuf[meterBuf.length - 1] = caLevel;
    meter.setAttribute('points', Array.from(meterBuf, (v, i) => `${(10 + i * 2).toFixed(0)},${(66 - v * 38).toFixed(1)}`).join(' '));
    // transporters dim when blocked
    tpEls.forEach((t) => {
      (t.querySelector('.tp') as SVGElement).style.fill = st.block > 0.5 ? '#5d5675' : '#b9a8ff';
      (t.querySelector('.tp-x') as SVGElement).style.opacity = String(clamp((st.block - 0.3) * 1.6));
    });
    // β-amyloid drifts in and docks
    const time = performance.now() / 1000;
    abeta.forEach((a) => {
      const k = clamp((st.ab - a.delay) / 0.6);
      const e = 1 - Math.pow(1 - k, 3);
      const wob = a.bound ? 6 : 14;
      const x = a.sx + (a.tx - a.sx) * e + Math.sin(time * 0.9 + a.ph) * wob;
      const y = a.sy + (a.ty - a.sy) * e + Math.cos(time * 0.7 + a.ph) * wob;
      a.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((time * 20 + a.ph * 50) % 360).toFixed(0)})`);
      a.g.setAttribute('opacity', String(k));
    });
  };

  /* ------------------------------------------------------------------ population */
  const neuG = q('[data-ga-neurons]');
  const fib = q('[data-ga-fibrils]');
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + rnd() * 0.2, r0 = 18 + rnd() * 6, r1 = 48 + rnd() * 34;
    el('path', { d: `M${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} Q${(Math.cos(a + 0.3) * (r1 * 0.6)).toFixed(1)} ${(Math.sin(a + 0.3) * (r1 * 0.6)).toFixed(1)} ${(Math.cos(a) * r1).toFixed(1)} ${(Math.sin(a) * r1).toFixed(1)}` }, fib);
  }
  const plaqueXY = [870, 585];
  type Neuron = { g: SVGElement; soma: SVGElement; glow: SVGElement; x: number; y: number; act: number; early: number; late: number; dist: number };
  const neurons: Neuron[] = [];
  // CA1 pyramidal cells as seen through a window from above: basal dendrites up into stratum oriens,
  // the apical dendrite down through stratum radiatum (Schaffer-collateral synapses sit on it).
  for (let i = 0; i < 64; i++) {
    const x = 240 + (i / 63) * 900 + (rnd() - 0.5) * 18, y = 440 + (rnd() - 0.5) * 60, s = 11 + rnd() * 6;
    const g = el('g', {}, neuG);
    const bx = x + (rnd() - 0.5) * 40, bot = 790 + rnd() * 30;
    const den = el('g', { fill: 'none', stroke: '#2a5563', 'stroke-linecap': 'round', opacity: i % 2 ? 0.45 : 0.85 }, g);
    // apical trunk: thick near the soma, tapering; oblique branches
    el('path', { d: `M${x} ${y + s * 0.6} C${x} ${y + 90} ${bx} ${y + 170} ${bx} ${bot}`, 'stroke-width': 2.2 }, den);
    for (let k = 0; k < 3; k++) {
      const yy = y + 70 + k * 70 + rnd() * 20, dir = rnd() < 0.5 ? -1 : 1, xx = x + (bx - x) * ((yy - y) / (bot - y));
      el('path', { d: `M${xx.toFixed(1)} ${yy.toFixed(1)} q${dir * 14} ${10} ${dir * (20 + rnd() * 16)} ${30 + rnd() * 16}`, 'stroke-width': 1.1 }, den);
    }
    // basal dendrites into stratum oriens
    for (let k = 0; k < 3; k++) {
      const ang = -Math.PI / 2 + (k - 1) * 0.75 + (rnd() - 0.5) * 0.3, len = 70 + rnd() * 80;
      const ex = x + Math.cos(ang) * len * 0.6, ey = y - s * 0.6 + Math.sin(ang) * len;
      el('path', { d: `M${x} ${y - s * 0.5} Q${(x + ex) / 2 + (rnd() - 0.5) * 16} ${(y + ey) / 2} ${ex.toFixed(1)} ${ey.toFixed(1)}`, 'stroke-width': 1.2 }, den);
    }
    const glow = el('circle', { cx: x, cy: y, r: s * 2.2, fill: 'url(#ga-glow)', opacity: 0 }, g);
    // pyramid-shaped soma, apex pointing towards the apical dendrite
    const soma = el('path', { d: `M${x} ${y + s} L${x - s * 0.8} ${y - s * 0.65} Q${x} ${y - s * 0.95} ${x + s * 0.8} ${y - s * 0.65} Z`, fill: '#1d4a55', stroke: '#5fd3c6', 'stroke-opacity': 0.35, 'stroke-width': 1.2 }, g);
    const dist = Math.hypot(x - plaqueXY[0], y - plaqueXY[1]);
    neurons.push({ g, soma, glow, x, y, act: 0, early: rnd(), late: rnd(), dist });
  }
  const phaseEl = q('[data-ga-phase]');
  // Rates in events/s. Before plaques: scattered hyperactive cells (Busche 2012). With plaques:
  // hyperactive cells cluster near plaques; silent cells are scattered (Busche 2008).
  const kind = (n: Neuron) => {
    if (st.plaque < 0.5) return n.early < 0.22 ? 'hyper' : 'normal';
    if (n.late < 0.28) return 'silent';
    if (n.dist < 190) return 'hyper';
    return n.late > 0.92 ? 'hyper' : 'normal';
  };
  let lastPhase = '';
  const tickPop = (dt: number) => {
    if (st.pop < 0.02) return;
    const ph = st.plaque < 0.5 ? 'before plaques' : 'with plaques';
    if (ph !== lastPhase) { phaseEl.textContent = ph; lastPhase = ph; }
    const decay = Math.pow(0.04, dt);
    const fx = focus.x, fy = focus.y;
    for (const n of neurons) {
      const k = kind(n);
      const rate = k === 'hyper' ? 1.4 : k === 'normal' ? 0.18 : 0;
      if (rnd() < rate * dt) n.act = 1;
      n.act *= decay;
      // under the scanning laser, fluorescence is read out (brighter)
      const lit = st.img > 0.3 ? clamp(1 - Math.hypot(n.x - fx, n.y - fy) / 90) : 0;
      const a = n.act * (0.7 + lit * 0.6);
      n.glow.setAttribute('opacity', a.toFixed(3));
      n.soma.setAttribute('fill', k === 'silent' ? '#0f2229' : a > 0.25 ? '#4dff9a' : '#1d4a55');
      n.soma.setAttribute('stroke-dasharray', k === 'silent' ? '3 3' : '0');
    }
  };

  /* ------------------------------------------------------------------ imaging */
  const beam = q('[data-ga-beam]');
  const focusEl = q('[data-ga-focus]');
  const fov = { x: 330, y: 330, w: 400, h: 260 };
  const focus = { x: 600, y: 470 };
  const gcGlow = q('[data-ga-gcglow]');
  const ions = [...root.querySelectorAll<SVGElement>('[data-ga-ions] circle')];
  const ionHome = [[-80, -60], [70, -70], [-90, 40], [80, 60]];
  const ionBind = [[-30, -18], [24, -20], [-26, 16], [30, 14]];
  let scanT = 0;
  const tickImg = (dt: number) => {
    if (st.img < 0.02) return;
    scanT += dt;
    const lines = 9, period = 4.5;
    const u = (scanT % period) / period, line = Math.floor(u * lines), along = (u * lines) % 1;
    focus.x = fov.x + 20 + (line % 2 ? 1 - along : along) * (fov.w - 40);
    focus.y = fov.y + 20 + (line / (lines - 1)) * (fov.h - 40);
    beam.setAttribute('d', `M540 30 L660 30 L${focus.x.toFixed(1)} ${focus.y.toFixed(1)} Z`);
    focusEl.setAttribute('cx', focus.x.toFixed(1)); focusEl.setAttribute('cy', focus.y.toFixed(1));
    // GCaMP inset cycles: Ca²⁺ binds → fluoresces → unbinds
    const c = (scanT % 3) / 3, bind = c < 0.45 ? c / 0.45 : c < 0.75 ? 1 : 1 - (c - 0.75) / 0.25;
    const e = bind * bind * (3 - 2 * bind);
    ions.forEach((ion, i) => {
      ion.setAttribute('cx', (ionHome[i][0] + (ionBind[i][0] - ionHome[i][0]) * e).toFixed(1));
      ion.setAttribute('cy', (ionHome[i][1] + (ionBind[i][1] - ionHome[i][1]) * e).toFixed(1));
    });
    gcGlow.setAttribute('opacity', (e * 0.95).toFixed(3));
  };

  /* ------------------------------------------------------------------ loop */
  let running = false;
  const tick = (_t: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    tickSynapse(dt); tickPop(dt); tickImg(dt);
  };
  const start = () => { if (!running && motionOK()) { gsap.ticker.add(tick); running = true; } };
  const stop = () => { if (running) { gsap.ticker.remove(tick); running = false; } };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '100px' }).observe(root);
  addEventListener('agz:motion', (e) => ((e as CustomEvent).detail.allowed ? start() : stop()));

  /* ------------------------------------------------------------------ timeline */
  const syn = q('[data-ga-syn]'), cycle = q('[data-ga-cycle]'), ring = q('[data-ga-ring]'), pop = q('[data-ga-pop]'), img = q('[data-ga-img]');
  const plaque = q('[data-ga-plaque]'), fovRect = q('[data-ga-fov]'), fovLbl = q('[data-ga-fovlbl]'), gcamp = q('[data-ga-gcamp]'), meterG = q('[data-ga-meter]');
  const lbl0 = q('[data-ga-lbl="0"]'), lbl1 = q('[data-ga-lbl="1"]');
  const zoomOrigin = '330 640'; // the synapse shrinks into an apical dendrite in stratum radiatum

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.addLabel('c0', 0)
    .fromTo(st, { syn: 0 }, { syn: 1, duration: 0.3 }, 0)
    .fromTo(syn, { opacity: 0, scale: 1.08, svgOrigin: '600 400' }, { opacity: 1, scale: 1, svgOrigin: '600 400', duration: 0.4, ease: 'power2.out' }, 0)
    .addLabel('c1', 1)
    .to(st, { ab: 1, duration: 0.6 }, 1)
    .to(st, { block: 1, duration: 0.5 }, 1.3)
    .to(lbl0, { opacity: 0.35, duration: 0.3 }, 1.1)
    .to(lbl1, { opacity: 1, duration: 0.3 }, 1.3)
    .addLabel('c2', 2)
    .to(st, { activity: 1, duration: 0.6 }, 2)
    .to(cycle, { opacity: 1, duration: 0.25 }, 2.1)
    .fromTo(ring, { strokeDashoffset: 1, strokeDasharray: '1 1' }, { strokeDashoffset: 0, duration: 0.6 }, 2.1)
    .fromTo(cycle.querySelectorAll('.pill'), { opacity: 0 }, { opacity: 1, stagger: 0.1, duration: 0.2 }, 2.3)
    .addLabel('c3', 3)
    .to(cycle, { opacity: 0, duration: 0.2 }, 3)
    .to(lbl1, { opacity: 0, duration: 0.15 }, 3)
    .to(syn, { scale: 0.05, opacity: 0, svgOrigin: zoomOrigin, duration: 0.45, ease: 'power2.in' }, 3.05)
    .to(meterG, { opacity: 0, duration: 0.2 }, 3.05)
    .to(st, { zoom: 1, duration: 0.45 }, 3.05)
    .fromTo(pop, { opacity: 0, scale: 3.2, svgOrigin: zoomOrigin }, { opacity: 1, scale: 1, svgOrigin: zoomOrigin, duration: 0.5, ease: 'power2.out' }, 3.25)
    .to(st, { pop: 1, duration: 0.2 }, 3.25)
    .to(st, { plaque: 1, duration: 0.3 }, 3.6)
    .fromTo(plaque, { opacity: 0, scale: 0.4, svgOrigin: '870 585' }, { opacity: 1, scale: 1, svgOrigin: '870 585', duration: 0.3, ease: 'back.out(1.6)' }, 3.6)
    .addLabel('c4', 4)
    .to(img, { opacity: 1, duration: 0.25 }, 4)
    .to(st, { img: 1, duration: 0.25 }, 4)
    .from(gcamp, { opacity: 0, scale: 0.6, svgOrigin: '1010 160', duration: 0.3, ease: 'back.out(1.4)' }, 4.15)
    .addLabel('c5', 5)
    .to(st, { fov: 1, duration: 0.6 }, 5)
    .to([fovLbl, gcamp], { opacity: 0, duration: 0.15 }, 5)
    .to(real, { opacity: 1, duration: 0.1 }, 5)
    .fromTo(real, { clipPath: 'inset(41.25% 39.17% 26.25% 27.5% round 6px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.55, ease: 'power2.inOut' }, 5.05)
    .to(fovRect, { attr: { x: 0, y: 0, width: 1200, height: 800 }, opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 5.05)
    .to(q('[data-ga-label]'), { opacity: 0, duration: 0.15 }, 5.1)
    .to(handoff, { opacity: 1, duration: 0.2 }, 5.4)
    .to({}, { duration: 0.4 }, 5.6);

  const chapterAt = (t: number) => Math.min(chapters.length - 1, Math.floor(t));
  let current = -1;
  const setChapter = (i: number) => {
    if (i === current) return;
    current = i;
    chapters.forEach((c, k) => c.classList.toggle('is-on', k === i));
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    num.textContent = String(i + 1).padStart(2, '0');
  };
  const sync = () => {
    const t = tl.time();
    setChapter(chapterAt(t));
    bar.style.transform = `scaleX(${clamp(t / tl.duration())})`;
    if (st.real > 0.5 || t > 5.05) { if (video.paused && motionOK()) video.play().catch(() => {}); } else if (!video.paused) video.pause();
  };
  tl.eventCallback('onUpdate', sync);

  if (motionOK()) {
    const pin = q<HTMLElement>('[data-ga-pin]');
    const trig = ScrollTrigger.create({
      trigger: pin, start: 'top top', end: () => `+=${innerHeight * 3.6}`, pin: true, scrub: 0.6, anticipatePin: 1,
      animation: tl,
      onToggle: (self) => document.body.toggleAttribute('data-pinning', self.isActive),
    });
    tabs.forEach((b, i) => b.addEventListener('click', () => {
      const y = trig.start + (trig.end - trig.start) * ((i + 0.5) / tl.duration());
      scrollTo({ top: y, behavior: 'smooth' });
    }));
  } else {
    // Reduced motion: no pinning; tabs jump between still frames of the story
    tl.progress(0);
    const show = (i: number) => { tl.seek(i + 0.95); setChapter(i); tickSynapse(0.016); tickPop(0.016); tickImg(0.016); };
    tabs.forEach((b, i) => b.addEventListener('click', () => show(i)));
    show(0);
    handoff.style.opacity = '1';
  }
  sync();
}
