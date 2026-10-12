/**
 * Scrollytelling over the lab's analysis pipeline, on a real recording (src/data/pipeline.json).
 * Each text step activates a state of the stage: raw movie → the lab's five ROIs →
 * F, F₀ and ΔF/F → event detection → synchronised playback of movie and traces.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

type Roi = {
  id: string; cx: number; cy: number; rx: number; ry: number;
  lab: { t: number[]; dff: number[] };
  computed: { fraw: number[]; fsmooth: number[]; f0: number[]; dff: number[]; events: number[]; sigma: number; threshold: number; ratePerMin: number; rLab: number };
};
type Data = { fps: number; frames: number; durationS: number; rois: Roi[] };

const NS = 'http://www.w3.org/2000/svg';
const mk = (tag: string, a: Record<string, string | number> = {}, p?: Element) => {
  const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, String(a[k])); p?.appendChild(e); return e as SVGElement;
};
// Lab figure colours, lightened for the dark stage
export const ROI_COLORS: Record<string, string> = { green: '#86d77f', lavender: '#c3aef0', orange: '#ffb672', blue: '#6f9be8', magenta: '#ff4d9e' };
const PLAYBACK = 4; // the clip plays at 4× real time

export async function initPipeline(root: HTMLElement) {
  const data: Data = (await import('../data/pipeline.json')).default as any;
  const motionOK = () => document.documentElement.dataset.motion !== 'off';
  const $ = <T extends Element>(s: string) => root.querySelector<T>(s)!;
  const stage = $<HTMLElement>('[data-dp-stage]');
  const video = $<HTMLVideoElement>('[data-dp-video]');
  const roisG = $<SVGGElement>('[data-dp-rois]');
  const plot = $<SVGSVGElement>('[data-dp-plot]');
  const legend = $<HTMLElement>('[data-dp-legend]');
  const timeEl = $<HTMLElement>('[data-dp-time]');
  const stat = $<HTMLElement>('[data-dp-stat]');
  const playBtn = $<HTMLButtonElement>('[data-dp-play]');
  const steps = [...root.querySelectorAll<HTMLElement>('[data-dp-step]')];
  const dots = [...root.querySelectorAll<HTMLElement>('[data-dp-dot]')];
  const chips = root.querySelector<HTMLElement>('[data-dp-chips]');
  const focusRoi = data.rois.find((r) => r.id === 'orange') ?? data.rois[0];

  /* ---------- image overlay: the lab's five ROIs (closed outlines, as in the lab figure) ---------- */
  const roiEls = data.rois.map((r, i) => {
    const g = mk('g', { 'data-roi': r.id, class: 'roi-g', opacity: 0 }, roisG);
    const fill = mk('ellipse', { cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry, fill: ROI_COLORS[r.id], opacity: 0, class: 'roi-fill' }, g);
    const ring = mk('ellipse', { cx: r.cx, cy: r.cy, rx: r.rx, ry: r.ry, stroke: ROI_COLORS[r.id], class: 'roi' }, g);
    const tag = mk('text', { x: r.cx + r.rx + 5, y: r.cy - r.ry + 4, fill: ROI_COLORS[r.id], class: 'roi-tag' }, g);
    tag.textContent = String(i + 1);
    return { r, g, fill, ring };
  });
  if (chips) data.rois.forEach((r, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--c', ROI_COLORS[r.id]);
    li.innerHTML = `<i></i>Cell ${i + 1}`;
    li.addEventListener('pointerenter', () => highlight(r.id));
    li.addEventListener('pointerleave', () => highlight(null));
    chips.appendChild(li);
  });

  /* ---------- plotting helpers ---------- */
  const W = 560, H = 460, L = 46, R = 18;
  const xOf = (t: number) => L + (t / data.durationS) * (W - L - R);
  const path = (ys: number[], y0: number, h: number, lo: number, hi: number, dtS = 1 / data.fps, ts?: number[]) => {
    let d = '';
    const step = Math.max(1, Math.floor(ys.length / 500));
    for (let i = 0; i < ys.length; i += step) {
      const t = ts ? ts[i] : i * dtS;
      const y = y0 + h - ((ys[i] - lo) / (hi - lo)) * h;
      d += `${i ? 'L' : 'M'}${xOf(t).toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };
  const range = (a: number[]) => { let lo = Infinity, hi = -Infinity; for (const v of a) { if (v < lo) lo = v; if (v > hi) hi = v; } return [lo, hi]; };
  const axisX = (y: number) => {
    const g = mk('g', {}, plot);
    mk('line', { x1: L, x2: W - R, y1: y, y2: y, stroke: '#1d3a47' }, g);
    [0, 10, 20, 30, 40, 50, 60].forEach((t) => { mk('line', { x1: xOf(t), x2: xOf(t), y1: y, y2: y + 4, stroke: '#2a4b59' }, g); const tx = mk('text', { x: xOf(t), y: y + 17, 'text-anchor': 'middle' }, g); tx.textContent = String(t); });
    const lbl = mk('text', { x: W - R, y: y + 32, 'text-anchor': 'end' }, g); lbl.textContent = 'time (s)';
  };
  const draw = (d: string, attrs: Record<string, string | number>, delay = 0, dur = 1.4) => {
    const p = mk('path', { d, fill: 'none', 'stroke-linejoin': 'round', ...attrs }, plot) as SVGPathElement;
    if (motionOK()) { const len = p.getTotalLength(); gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: dur, delay, ease: 'power2.inOut', onComplete: () => p.removeAttribute('stroke-dasharray') }); }
    return p;
  };
  const text = (x: number, y: number, s: string, cls = '', anchor = 'start') => { const t = mk('text', { x, y, class: cls, 'text-anchor': anchor }, plot); t.textContent = s; return t; };
  const clearPlot = () => { gsap.killTweensOf(plot.querySelectorAll('*')); plot.innerHTML = ''; legend.innerHTML = ''; };

  /* ---------- step renderers for the trace panel ---------- */
  const c = focusRoi.computed;
  const plotF = () => {
    clearPlot();
    const [lo, hi] = range(c.fsmooth.concat(c.f0));
    const pad = (hi - lo) * 0.12;
    text(L, 26, 'F — mean brightness in the outline (a.u.)', 'ttl');
    draw(path(c.fraw, 40, 150, lo - pad, hi + pad), { stroke: '#3b5a66', 'stroke-width': 1 }, 0, 1);
    draw(path(c.fsmooth, 40, 150, lo - pad, hi + pad), { stroke: ROI_COLORS[focusRoi.id], 'stroke-width': 1.8 }, 0.2);
    draw(path(c.f0, 40, 150, lo - pad, hi + pad), { stroke: '#5fd3c6', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, 0.8, 1);
    text(W - R, 58, 'F₀ = rolling 20th percentile', '', 'end').setAttribute('fill', '#5fd3c6');
    const eq = text(W / 2 + 10, 236, 'ΔF/F = (F − F₀) / F₀', 'eq', 'middle');
    gsap.from(eq, { opacity: 0, y: 8, duration: 0.8, delay: 1.1 });
    const [dl, dh] = range(c.dff);
    text(L, 272, 'ΔF/F', 'ttl');
    draw(path(c.dff, 282, 120, dl - 0.05, dh + 0.1), { stroke: ROI_COLORS[focusRoi.id], 'stroke-width': 1.8 }, 1.4);
    mk('line', { x1: L, x2: W - R, y1: 282 + 120 - ((0 - (dl - 0.05)) / (dh + 0.1 - dl + 0.05)) * 120, y2: 282 + 120 - ((0 - (dl - 0.05)) / (dh + 0.1 - dl + 0.05)) * 120, stroke: '#2a4b59', 'stroke-dasharray': '2 4' }, plot);
    axisX(412);
  };
  const plotEvents = () => {
    clearPlot();
    const [dl, dh] = range(c.dff);
    const lo = dl - 0.05, hi = dh + 0.15, y0 = 50, h = 330;
    const Y = (v: number) => y0 + h - ((v - lo) / (hi - lo)) * h;
    text(L, 26, 'ΔF/F with noise level and detection threshold', 'ttl');
    // ±σ band around baseline, threshold line
    mk('rect', { x: L, width: W - L - R, y: Y(c.sigma), height: Y(-c.sigma) - Y(c.sigma), fill: '#5fd3c6', opacity: 0.12 }, plot);
    const th = mk('line', { x1: L, x2: W - R, y1: Y(c.threshold), y2: Y(c.threshold), stroke: '#ffd166', 'stroke-dasharray': '6 4', 'stroke-width': 1.4 }, plot);
    text(W - R, Y(c.threshold) - 6, `threshold ${c.threshold.toFixed(2)} (max of 0.05 and 3σ)`, '', 'end').setAttribute('fill', '#ffd166');
    text(L + 4, Y(-c.sigma) + 14, `σ = ${c.sigma.toFixed(3)}`, '').setAttribute('fill', '#5fd3c6');
    draw(path(c.dff, y0, h, lo, hi), { stroke: ROI_COLORS[focusRoi.id], 'stroke-width': 1.8 }, 0, 1.2);
    if (motionOK()) gsap.from(th, { opacity: 0, duration: 0.6, delay: 0.6 });
    c.events.forEach((f, i) => {
      const x = xOf(f / data.fps), y = Y(c.dff[f]);
      const g = mk('g', {}, plot);
      mk('line', { x1: x, x2: x, y1: y - 8, y2: y0 - 6, stroke: '#ffd166', opacity: 0.5 }, g);
      mk('circle', { cx: x, cy: y, r: 5, fill: '#ffd166' }, g);
      if (motionOK()) gsap.from(g, { opacity: 0, scale: 0, transformOrigin: `${x}px ${y}px`, duration: 0.5, delay: 1.2 + i * 0.25, ease: 'back.out(2)' });
    });
    axisX(392);
    const n = c.events.length;
    stat.textContent = `${n} transient${n === 1 ? '' : 's'} in 60 s · ${c.ratePerMin.toFixed(1)} per minute`;
  };
  // Step 6: all five cells, lab trace (grey) under the recomputed one, with a playhead
  let playhead: SVGLineElement | null = null;
  const traceRows: { r: Roi; y0: number; h: number; lo: number; hi: number; g: SVGElement }[] = [];
  const plotAll = () => {
    clearPlot(); traceRows.length = 0;
    text(L, 24, 'ΔF/F of five neurons', 'ttl');
    const rows = [...data.rois].reverse(), top = 36, rowH = 72;
    rows.forEach((r, i) => {
      const y0 = top + i * rowH, h = rowH - 8;
      const [lo, hi] = range(r.computed.dff.concat(r.lab.dff));
      const g = mk('g', { class: 'tr', 'data-roi': r.id }, plot);
      const lab = mk('path', { d: path(r.lab.dff, y0, h, lo - 0.05, hi + 0.05, 0, r.lab.t), fill: 'none', stroke: '#5a6f78', 'stroke-width': 3, opacity: 0.55 }, g);
      const comp = mk('path', { d: path(r.computed.dff, y0, h, lo - 0.05, hi + 0.05), fill: 'none', stroke: ROI_COLORS[r.id], 'stroke-width': 1.6 }, g);
      mk('rect', { x: L, y: y0, width: W - L - R, height: h, fill: 'transparent' }, g);
      if (motionOK()) gsap.from([lab, comp], { opacity: 0, x: -12, duration: 0.6, delay: i * 0.08 });
      traceRows.push({ r, y0, h, lo, hi, g });
      g.addEventListener('pointerenter', () => highlight(r.id));
      g.addEventListener('pointerleave', () => highlight(null));
    });
    mk('line', { x1: L - 10, x2: L - 10, y1: top + rowH - 8 - 0.5 * ((rowH - 8) / 1.2), y2: top + rowH - 8, stroke: '#a9bcc3', 'stroke-width': 2 }, plot);
    text(L - 14, top + rowH - 18, '50%', '', 'end');
    playhead = mk('line', { x1: L, x2: L, y1: top - 4, y2: top + rows.length * rowH - 4, stroke: '#e9f1f3', 'stroke-width': 1, opacity: 0.7 }, plot) as SVGLineElement;
    axisX(top + rows.length * rowH + 4);
    const r = data.rois.map((x) => x.computed.rLab);
    legend.innerHTML = `<span><i style="background:#5a6f78;height:3px"></i>lab analysis</span><span><i style="background:${ROI_COLORS.orange}"></i>recomputed here</span><span>agreement r = ${Math.min(...r).toFixed(2)}–${Math.max(...r).toFixed(2)}</span>`;
  };
  let hoverId: string | null = null;
  const highlight = (id: string | null) => {
    hoverId = id;
    roiEls.forEach((e) => { e.g.classList.toggle('is-dim', !!id && e.r.id !== id); e.fill.setAttribute('opacity', id === e.r.id ? '0.25' : '0'); });
    chips?.querySelectorAll('li').forEach((li, k) => li.classList.toggle('is-hot', data.rois[k].id === id));
    traceRows.forEach((t) => t.g.setAttribute('opacity', !id || t.r.id === id ? '1' : '0.3'));
  };

  /* ---------- playback sync (step 6) ---------- */
  let syncing = false;
  const syncTick = () => {
    const t = (video.currentTime * PLAYBACK) % data.durationS;
    timeEl.textContent = `t = ${t.toFixed(1)} s`;
    if (!syncing) return;
    if (playhead) { const x = xOf(t); playhead.setAttribute('x1', String(x)); playhead.setAttribute('x2', String(x)); }
    const f = Math.min(data.frames - 1, Math.round(t * data.fps));
    roiEls.forEach((e) => {
      const v = e.r.computed.dff[f], hot = v > e.r.computed.threshold;
      e.ring.classList.toggle('is-hot', hot);
      e.fill.setAttribute('opacity', hot ? String(Math.min(0.45, v * 0.4)) : hoverId === e.r.id ? '0.25' : '0');
    });
  };
  gsap.ticker.add(syncTick);

  /* ---------- step state machine ---------- */
  let step = -1;
  const showRois = (on: boolean, dim = false) => roiEls.forEach((e, i) => {
    const m = motionOK();
    gsap.killTweensOf(e.g);
    if (on && +(e.g.getAttribute('opacity') ?? 0) < 0.5 && m) {
      // pop in one after another, with a brief flash of the fill
      gsap.fromTo(e.g, { opacity: 0, scale: 1.6, svgOrigin: `${e.r.cx} ${e.r.cy}` }, { opacity: 1, scale: 1, svgOrigin: `${e.r.cx} ${e.r.cy}`, duration: 0.6, delay: 0.15 + i * 0.16, ease: 'back.out(1.7)' });
      gsap.fromTo(e.fill, { opacity: 0.55 }, { opacity: 0, duration: 0.9, delay: 0.35 + i * 0.16 });
    } else gsap.set(e.g, { opacity: on ? 1 : 0, scale: 1, svgOrigin: `${e.r.cx} ${e.r.cy}` });
    e.g.classList.toggle('is-dim', dim && e.r.id !== focusRoi.id);
    if (!(on && m)) e.fill.setAttribute('opacity', dim && e.r.id === focusRoi.id ? '0.25' : '0');
    else if (dim) e.fill.setAttribute('opacity', e.r.id === focusRoi.id ? '0.25' : '0');
  });
  const playVideo = (on: boolean) => { if (on && motionOK() && playBtn.getAttribute('aria-pressed') === 'true') video.play().catch(() => {}); else video.pause(); };

  const last = steps.length - 1;
  const setStep = (i: number) => {
    if (i === step) return;
    step = i;
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    dots.forEach((d, k) => { d.classList.toggle('is-on', k === i); d.classList.toggle('is-done', k < i); });
    stage.dataset.step = String(i);
    syncing = i === last;
    stage.classList.toggle('is-split', i >= 2);
    roiEls.forEach((e) => e.ring.classList.remove('is-hot'));
    if (i === 0) { playVideo(true); showRois(false); }
    if (i === 1) { playVideo(true); showRois(true); }
    if (i === 2) { playVideo(true); showRois(true, true); plotF(); }
    if (i === 3) { playVideo(true); showRois(true, true); plotEvents(); }
    if (i === last) { showRois(true, false); highlight(null); plotAll(); video.currentTime = 0; playVideo(true); }
  };
  playBtn.addEventListener('click', () => {
    const on = playBtn.getAttribute('aria-pressed') !== 'true';
    playBtn.setAttribute('aria-pressed', String(on)); playBtn.textContent = on ? 'Pause' : 'Play';
    if (on) video.play().catch(() => {}); else video.pause();
  });

  steps.forEach((s, i) => ScrollTrigger.create({
    trigger: s, start: 'top 62%', end: 'bottom 62%',
    onToggle: (self) => { if (self.isActive) setStep(i); },
  }));
  new IntersectionObserver(([e]) => { if (!e.isIntersecting) video.pause(); else if (step >= 0) playVideo(true); }).observe(stage);
  setStep(0);
  ScrollTrigger.refresh();
}
