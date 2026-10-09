/**
 * Anatomy intro engine (see AnatomyIntro.astro). A scroll-scrubbed GSAP timeline moves a few state
 * values; render() turns them into the drawing. Coronal sections are real Allen CCFv3 template images
 * with the atlas annotation; the hippocampal fields are coloured like the atlas explorer on the site.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

type Region = { acronym: string; structure: string; division: string; name: string; color: string } | null;
type Slice = { file: number; ap_voxel: number; bregma_mm_approx: number; palette: Region[] };
type Meta = { width: number; height: number; slices: Slice[] };

const HIP = new Set(['CA1', 'CA2', 'CA3', 'DG']);
const HIP_COLORS: Record<string, string> = {
  CA1so: '#5aa9ff', CA1sp: '#4dff9a', CA1sr: '#ff6b4a', CA1slm: '#ff4fd8', CA2: '#ffc857', CA3: '#b48cff', DG: '#7fe7ff',
};
const hipColor = (r: NonNullable<Region>) => HIP_COLORS[r.acronym] ?? HIP_COLORS[r.structure] ?? '#4dff9a';
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function initAnatomy(root: HTMLElement) {
  const motionOK = () => document.documentElement.dataset.motion !== 'off';
  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const base = root.dataset.base!;
  const target = +(root.dataset.target ?? 16);
  const steps = [...root.querySelectorAll<HTMLElement>('[data-anat-step]')];
  const num = q('[data-anat-num]'), bar = q('[data-anat-bar]'), readout = q('[data-anat-readout]');
  const outline = q<SVGPathElement>('[data-anat-outline]'), fill = q<SVGElement>('[data-anat-fill]'), dots = q<SVGElement>('[data-anat-dots]');
  const hip = q<SVGGElement>('[data-anat-hip]'), hipTag = q<SVGElement>('[data-anat-hiptag]'), tags = q<SVGGElement>('[data-anat-tags]');
  const plane = q<SVGGElement>('[data-anat-plane]'), sagW = q('[data-anat-sag]'), cor = q('[data-anat-cor]');
  const canvas = q<HTMLCanvasElement>('[data-anat-canvas]'), win = q('[data-anat-win]');
  const ctx = canvas.getContext('2d')!;

  const st = { draw: 0, fill: 0, hip: 0, plane: 0, cut: 0, open: 0, k: 0, zoom: 0, win: 0 };
  let meta: Meta | null = null;
  const frames = new Map<number, HTMLCanvasElement>();
  let ca1: { x: number; y: number } | null = null; // dorsal CA1 pyramidal layer on the target section (atlas pixels)

  /* ---------------- sections ---------------- */
  const img = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const compose = async (k: number) => {
    const s = meta!.slices[k], W = meta!.width, H = meta!.height, f = String(s.file).padStart(3, '0');
    const [tmpl, lab] = await Promise.all([img(`${base}s${f}.jpg`), img(`${base}l${f}.png`)]);
    const work = document.createElement('canvas'); work.width = W; work.height = H;
    const w = work.getContext('2d', { willReadFrequently: true })!;
    w.drawImage(lab, 0, 0);
    const d = w.getImageData(0, 0, W, H).data, labels = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) labels[i] = d[i * 4];
    const ov = w.createImageData(W, H), o = ov.data, pal = s.palette, rgb = pal.map((r) => (r ? hex(hipColor(r)) : [0, 0, 0]));
    let best = { y: H, xs: [] as number[] };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = labels[i], r = pal[l];
      if (!r) continue;
      const edge = (x < W - 1 && labels[i + 1] !== l) || (y < H - 1 && labels[i + W] !== l);
      const inHip = HIP.has(r.structure) && r.division === 'HPF';
      const a = inHip ? (edge ? 235 : 105) : edge ? 34 : 0;
      if (!a) continue;
      const c = inHip ? rgb[l] : [200, 235, 240];
      o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; o[i * 4 + 3] = a;
      if (k === target && r.acronym === 'CA1sp' && x > W / 2) { if (y < best.y) best = { y, xs: [x] }; else if (y === best.y) best.xs.push(x); }
    }
    if (k === target && best.xs.length) ca1 = { x: best.xs.reduce((a, b) => a + b) / best.xs.length, y: best.y + 3 };
    const ovc = document.createElement('canvas'); ovc.width = W; ovc.height = H; ovc.getContext('2d')!.putImageData(ov, 0, 0);
    const out = document.createElement('canvas'); out.width = W * 2; out.height = H * 2;
    const oc = out.getContext('2d')!;
    // template: brightness becomes opacity, so the section floats on the dark stage without a black frame
    w.clearRect(0, 0, W, H); w.drawImage(tmpl, 0, 0);
    const td = w.getImageData(0, 0, W, H), tp = td.data;
    for (let i = 0; i < tp.length; i += 4) { const l = tp[i]; tp[i + 3] = Math.min(255, l * 2.4); tp[i] = tp[i + 1] = tp[i + 2] = Math.min(255, 40 + l * 0.9); }
    w.putImageData(td, 0, 0);
    oc.imageSmoothingEnabled = true; oc.drawImage(work, 0, 0, W * 2, H * 2);
    oc.imageSmoothingEnabled = false; oc.drawImage(ovc, 0, 0, W * 2, H * 2);
    frames.set(k, out);
    return out;
  };
  let loading: Promise<void> | null = null;
  const loadAll = () => (loading ??= (async () => {
    try { meta = await (await fetch(`${base}sections.json`)).json(); } catch { return; }
    // target first (for the zoom), then the sweep in order
    await compose(target).catch(() => {});
    for (let k = 0; k <= target; k++) if (!frames.has(k)) await compose(k).catch(() => {});
    render();
  })());

  /* ---------------- render ---------------- */
  let shownK = -1;
  // after the sequence, a slider lets visitors move through the sections themselves
  let manual: number | null = null;
  const man = { zoom: 1, win: 1 };
  const ctrl = q('[data-anat-ctrl]'), slider = q<HTMLInputElement>('[data-anat-slider]');
  const loadRest = async () => { await loadAll(); if (!meta) return; for (let k = 0; k < meta.slices.length; k++) if (!frames.has(k)) await compose(k).catch(() => {}); };
  slider.addEventListener('input', () => {
    if (manual === null) { man.zoom = st.zoom; man.win = st.win; gsap.to(man, { zoom: 0, win: 0, duration: 0.6, ease: 'power2.out', onUpdate: () => render() }); loadRest().then(() => render()); }
    manual = +slider.value; shownK = -1; render();
  });
  const render = () => {
    outline.style.strokeDashoffset = String(1 - st.draw);
    fill.style.opacity = String(st.fill); dots.style.opacity = String(st.fill * 0.9);
    tags.setAttribute('opacity', String(clamp(st.fill * 1.4 - 0.2) * (1 - st.open)));
    hip.setAttribute('opacity', String(st.hip));
    hipTag.setAttribute('opacity', String(st.hip * (1 - st.open)));

    // cutting plane: slides from in front of the hippocampus to the section being shown
    const secs = meta?.slices;
    const K = manual ?? st.k, Z = manual !== null ? man.zoom : st.zoom, WIN = manual !== null ? man.win : st.win;
    const k = Math.round(K);
    const ap0 = secs ? secs[0].ap_voxel : 243;
    let apK = ap0;
    if (secs) { const i0 = Math.floor(K), i1 = Math.min(secs.length - 1, i0 + 1); apK = lerp(secs[i0].ap_voxel, secs[i1].ap_voxel, K - i0); }
    const x = lerp(ap0 - 90, ap0, st.cut) + (apK - ap0);
    plane.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    plane.setAttribute('opacity', String(st.plane));

    // lateral view shrinks into a corner map while the section opens
    const e = st.open;
    sagW.style.transform = `translate(${(-1 * e).toFixed(2)}%, ${(-3 * e).toFixed(2)}%) scale(${lerp(1, 0.26, e).toFixed(3)})`;
    sagW.style.opacity = String(lerp(1, 0.9, e) * (1 - Z * 0.85));
    cor.style.opacity = String(clamp(e * 1.6));
    cor.style.clipPath = `inset(0 ${(50 * (1 - e)).toFixed(1)}% 0 ${(50 * (1 - e)).toFixed(1)}%)`;

    // section image
    if (meta && frames.size) {
      const f = frames.get(k) ?? frames.get(target) ?? [...frames.values()][0];
      const cw = canvas.clientWidth, ch = canvas.clientHeight, dpr = Math.min(devicePixelRatio, 2);
      if (canvas.width !== Math.round(cw * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); shownK = -1; }
      if (shownK !== k && f) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(f, 0, 0, canvas.width, canvas.height); shownK = frames.has(k) ? k : -1; }
      readout.textContent = e > 0.5 ? `≈ ${meta.slices[k].bregma_mm_approx.toFixed(1).replace('-', '−')} mm from bregma` : '';
    }

    // zoom into dorsal CA1 and frame the imaging field
    const W = meta?.width ?? 456, H = meta?.height ?? 320;
    const pt = ca1 ?? { x: W * 0.62, y: H * 0.3 };
    const ox = canvas.offsetLeft + (pt.x / W) * canvas.clientWidth, oy = canvas.offsetTop + (pt.y / H) * canvas.clientHeight;
    const z = 1 + Z * 1.8;
    cor.style.transformOrigin = `${ox}px ${oy}px`;
    cor.style.transform = `rotateY(${((1 - e) * 60).toFixed(1)}deg) scale(${z.toFixed(3)})`;
    const fw = (20 / W) * canvas.clientWidth, fh = (11 / H) * canvas.clientHeight; // ≈ 0.5 × 0.28 mm
    win.style.left = `${ox - fw / 2}px`; win.style.top = `${oy - fh / 2}px`;
    win.style.width = `${fw}px`; win.style.height = `${fh}px`;
    win.style.opacity = String(WIN);
    win.style.borderWidth = `${(1.5 / z).toFixed(2)}px`; win.style.setProperty('--z', z.toFixed(3));
  };

  /* ---------------- timeline ---------------- */
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: () => { render(); sync(); } });
  tl.to(st, { draw: 1, duration: 1.8, ease: 'power1.inOut' }, 0)
    .to(st, { fill: 1, duration: 1 }, 0.8)
    .to(st, { hip: 1, duration: 0.9, ease: 'power2.out' }, 1.9)
    .to(st, { plane: 1, duration: 0.3 }, 3.2)
    .to(st, { cut: 1, duration: 1, ease: 'power1.inOut' }, 3.2)
    .to(st, { open: 1, duration: 1, ease: 'power2.inOut' }, 4.2)
    .to(st, { k: target, duration: 2.8 }, 5.2)
    .to(st, { zoom: 1, duration: 1.2, ease: 'power2.inOut' }, 8.0)
    .to(st, { win: 1, duration: 0.5 }, 8.8)
    .to({}, { duration: 0.7 }, 9.3);
  const bounds = [0, 1.9, 3.2, 8.0];
  let cur = -1;
  const sync = () => {
    const t = tl.time();
    const i = bounds.reduce((a, b, k) => (t >= b ? k : a), 0);
    bar.style.transform = `scaleX(${clamp(t / tl.duration())})`;
    const done = t >= tl.duration() - 0.35;
    ctrl.classList.toggle('is-on', done || !motionOK());
    if (!done && manual !== null && motionOK()) { manual = null; slider.value = String(target); shownK = -1; }
    if (i === cur) return;
    cur = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    num.textContent = String(i + 1).padStart(2, '0');
  };

  new IntersectionObserver(([en]) => { if (en.isIntersecting) loadAll().then(() => { if (meta) { slider.max = String(meta.slices.length - 1); slider.value = String(target); } }); }, { rootMargin: '150% 0px' }).observe(root);
  new ResizeObserver(() => { shownK = -1; render(); }).observe(canvas);

  if (motionOK()) {
    ScrollTrigger.create({
      trigger: q('[data-anat-pin]'), start: 'top top', end: () => `+=${innerHeight * 3}`, pin: true, scrub: 0.5, anticipatePin: 1,
      animation: tl,
      onToggle: (self) => document.body.toggleAttribute('data-pinning', self.isActive),
    });
  } else {
    // Reduced motion: a still of the coronal section beside the lateral view
    gsap.set(st, { draw: 1, fill: 1, hip: 1, plane: 1, cut: 1, open: 1, k: target, zoom: 0, win: 1 });
    loadAll().then(render);
  }
  render(); sync();
}
