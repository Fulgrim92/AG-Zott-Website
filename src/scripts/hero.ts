/**
 * Hero: scroll-driven journey from whole brain → hippocampus → CA1.
 *
 * ILLUSTRATIVE SCHEMATIC. Geometry is procedurally generated (ellipsoid hemispheres and a
 * C-shaped hippocampal curve) and is not anatomical data. Replace with an atlas mesh
 * (e.g. Allen Mouse Brain CCF, credited) by loading a GLTF in `buildBrain()`.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const hero = document.querySelector<HTMLElement>('[data-hero]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
const motionOK = () => document.documentElement.dataset.motion !== 'off';

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

// Deterministic PRNG so the schematic looks identical on every load
function rng(seed = 7) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

if (hero && canvas) {
  if (!webglAvailable() || (navigator as any).connection?.saveData) {
    hero.classList.add('no-webgl');
  } else {
    init(hero, canvas);
  }
}

function init(hero: HTMLElement, canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07090d, 0.06);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);

  const rand = rng();
  const dotTex = makeDotTexture();
  const group = new THREE.Group();
  scene.add(group);

  /* ---- Brain shell: points on two deformed hemispheres ---- */
  const brainPts: number[] = [];
  const N = innerWidth < 768 ? 7000 : 14000;
  for (let i = 0; i < N; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    let x = s * Math.cos(th), y = u, z = s * Math.sin(th);
    const fold = 1 + 0.045 * Math.sin(9 * x + 4 * y) * Math.cos(7 * z - 3 * y); // gyri-like ripple
    const side = x >= 0 ? 1 : -1;
    x = side * (0.12 + Math.abs(x) * 1.25) * fold;
    y = y * 1.0 * fold * (y < 0 ? 0.75 : 1);
    z = z * 1.7 * fold;
    brainPts.push(x, y, z);
  }
  const brain = new THREE.Points(
    geo(brainPts),
    new THREE.PointsMaterial({ size: 0.028, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: new THREE.Color(css('--blue')), opacity: 0.55 }),
  );
  group.add(brain);

  /* ---- Hippocampi: C-shaped curved tubes, one per hemisphere ---- */
  const makeCurve = (side: number) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.35, 0.15, -0.9),
    new THREE.Vector3(side * 0.62, 0.32, -0.45),
    new THREE.Vector3(side * 0.85, 0.12, 0.05),
    new THREE.Vector3(side * 0.95, -0.25, 0.35),
    new THREE.Vector3(side * 0.88, -0.55, 0.55),
  ]);
  const ca1Color = new THREE.Color(css('--green'));
  const hipColor = new THREE.Color(css('--magenta'));
  const ca1Target = new THREE.Vector3();

  for (const side of [-1, 1]) {
    const curve = makeCurve(side);
    const pos: number[] = [], col: number[] = [];
    const M = innerWidth < 768 ? 2500 : 5000;
    for (let i = 0; i < M; i++) {
      const t = rand();
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const nrm = new THREE.Vector3(0, 1, 0).cross(tan).normalize();
      const bin = tan.clone().cross(nrm).normalize();
      const a = rand() * Math.PI * 2, r = 0.11 * Math.sqrt(rand());
      p.addScaledVector(nrm, Math.cos(a) * r * 1.4).addScaledVector(bin, Math.sin(a) * r);
      pos.push(p.x, p.y, p.z);
      // CA1 segment highlighted (schematic position along the curve)
      const inCA1 = t > 0.38 && t < 0.62;
      const c = inCA1 ? ca1Color : hipColor;
      const k = inCA1 ? 1 : 0.55;
      col.push(c.r * k, c.g * k, c.b * k);
    }
    const g = geo(pos); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    group.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.026, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    if (side === 1) ca1Target.copy(curve.getPointAt(0.5));
  }

  /* ---- CA1 close-up: a band of pyramidal somata with apical dendrites ---- */
  const cell = new THREE.Group();
  const somata: number[] = [], dend: number[] = [];
  for (let i = 0; i < 420; i++) {
    const x = (rand() - 0.5) * 0.32, z = (rand() - 0.5) * 0.32, y = (rand() - 0.5) * 0.025;
    somata.push(x, y, z);
    // apical dendrite (toward s. radiatum) and a short basal one (toward s. oriens)
    dend.push(x, y, z, x + (rand() - 0.5) * 0.02, y - 0.09 - rand() * 0.05, z + (rand() - 0.5) * 0.02);
    dend.push(x, y, z, x + (rand() - 0.5) * 0.03, y + 0.03 + rand() * 0.02, z + (rand() - 0.5) * 0.03);
  }
  // Each soma "fires" now and then: a fast rise and slow decay, like a calcium transient
  const nSoma = somata.length / 3, act = new Float32Array(nSoma);
  const somaCol = new THREE.Float32BufferAttribute(new Float32Array(nSoma * 3), 3);
  const somaGeo = geo(somata); somaGeo.setAttribute('color', somaCol);
  const somaMat = new THREE.PointsMaterial({ size: 0.02, map: dotTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const fire = () => {
    for (let i = 0; i < nSoma; i++) {
      if (act[i] < 0.02 && Math.random() < 0.004) act[i] = 1;
      act[i] *= 0.94;
      const k = 0.3 + act[i] * 2.2;
      somaCol.setXYZ(i, ca1Color.r * k, ca1Color.g * k, ca1Color.b * k);
    }
    somaCol.needsUpdate = true;
  };
  fire();
  const dendMat = new THREE.LineBasicMaterial({ color: ca1Color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending });
  cell.add(new THREE.Points(somaGeo, somaMat), new THREE.LineSegments(geo(dend), dendMat));
  cell.position.copy(ca1Target);
  cell.lookAt(0, 0, 0);
  group.add(cell);

  /* ---- Camera path ---- */
  const camStart = new THREE.Vector3(0, 0.9, 6.2);
  const camMid = new THREE.Vector3(2.0, 0.6, 2.4);
  const camEnd = ca1Target.clone().add(new THREE.Vector3(0.5, 0.14, 0.5));
  const lookStart = new THREE.Vector3(0, 0, 0);
  const state = { p: 0, intro: motionOK() ? 0 : 1 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 768 ? 55 : 42;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const tmp = new THREE.Vector3(), look = new THREE.Vector3();
  const render = (time = 0) => {
    const p = state.p;
    // Two-stage Bézier-ish blend: start → mid → end
    const a = Math.min(p / 0.5, 1), b = Math.min(Math.max((p - 0.5) / 0.3, 0), 1);
    tmp.lerpVectors(camStart, camMid, ease(a)).lerp(camEnd, ease(b));
    camera.position.copy(tmp);
    camera.position.z += (1 - state.intro) * 5; camera.position.y += (1 - state.intro) * 1.2;
    look.lerpVectors(lookStart, ca1Target, ease(Math.min(p / 0.6, 1)));
    camera.lookAt(look);

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    group.rotation.y = (motionOK() ? time * 0.00004 : 0) * (1 - p) + pointer.x * 0.15 * (1 - p * 0.8);
    group.rotation.x = pointer.y * 0.08 * (1 - p * 0.8);

    (brain.material as THREE.PointsMaterial).opacity = 0.55 * (1 - ease(b) * 0.85);
    somaMat.opacity = ease(b);
    if (b > 0 && motionOK()) fire();
    cell.rotation.z = (motionOK() ? time * 0.00003 : 0) * b;
    dendMat.opacity = ease(b) * 0.35;
    renderer.render(scene, camera);
  };

  let raf = 0, visible = true;
  const loop = (t: number) => { render(t); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  // Pause rendering when the hero is off-screen. ScrollTrigger re-parents the hero into a
  // pin-spacer, which can produce a transient zero-size entry — so re-check the real rect.
  const onScreen = () => { const r = hero.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting || onScreen(); visible && motionOK() ? start() : stop(); }).observe(hero);
  addEventListener('pointermove', (e) => { pointer.tx = e.clientX / innerWidth - 0.5; pointer.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  const steps = [...hero.querySelectorAll<HTMLElement>('[data-step]')];
  const dots = [...hero.querySelectorAll<HTMLButtonElement>('[data-dot]')];
  const real = hero.querySelector<HTMLElement>('[data-hero-real]');
  const realVideo = real?.querySelector('video');
  const cue = hero.querySelector<HTMLElement>('[data-cue]');
  const STOPS = [0, 0.3, 0.62, 0.92]; // scroll progress at which each step is fully in view
  let current = -1;
  const setStep = (p: number) => {
    const idx = p < 0.2 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3;
    cue?.classList.toggle('is-hidden', p > 0.02);
    if (idx === current) return;
    current = idx;
    steps.forEach((s, i) => s.classList.toggle('is-current', i === idx));
    dots.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'step' : 'false'));
    real?.classList.toggle('is-on', idx === 3);
    canvas.classList.toggle('is-dim', idx === 3);
    if (realVideo) idx === 3 ? realVideo.play().catch(() => {}) : realVideo.pause();
  };
  dots.forEach((d, i) => d.addEventListener('click', () => {
    if (!trigger) return;
    scrollTo({ top: trigger.start + (trigger.end - trigger.start) * STOPS[i], behavior: 'smooth' });
  }));

  let trigger: ScrollTrigger | null = null;
  const enableMotion = () => {
    hero.classList.add('is-pinned');
    trigger = ScrollTrigger.create({
      trigger: hero,
      refreshPriority: 10,
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: 0.6,
      onUpdate: (self) => { state.p = self.progress; setStep(self.progress); visible = true; start(); },
    });
    start();
    setStep(0);
    // The hero is loaded lazily, after other pinned sections were measured: re-order and re-measure
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  };
  const disableMotion = () => {
    trigger?.kill(); trigger = null;
    hero.classList.remove('is-pinned');
    stop();
    state.p = 0.25; state.intro = 1; // a single, static, informative frame
    render();
  };

  // Jump links inside the hero ("Enter CA1") scroll to the end of the pinned journey
  hero.querySelector('[data-enter-ca1]')?.addEventListener('click', (e) => {
    if (!trigger) return;
    e.preventDefault();
    scrollTo({ top: trigger.end, behavior: 'smooth' });
  });

  motionOK() ? enableMotion() : disableMotion();
  if (motionOK()) {
    gsap.to(state, { intro: 1, duration: 2.6, ease: 'expo.out', delay: 0.1 });
    gsap.from(canvas, { opacity: 0, duration: 2, ease: 'power2.out' });
  }
  addEventListener('agz:motion', (e) => ((e as CustomEvent).detail.allowed ? enableMotion() : disableMotion()));
  addEventListener('agz:palette', () => location.reload());
}

function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function geo(arr: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function makeDotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
