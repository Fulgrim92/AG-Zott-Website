/**
 * Homepage hero: the Allen Mouse Brain Atlas (CCFv3) rendered as a cloud of light.
 * The brain surface is sampled into glowing points, the hippocampal formation is highlighted,
 * and dorsal CA1 shows illustrative flashes (calcium transients) — anatomy is real, flashes are not data.
 * Slowly turns, leans towards the pointer and recedes as the visitor scrolls on.
 *
 * Anatomy: Allen Mouse Brain Common Coordinate Framework v3 (2017) structure meshes,
 * © Allen Institute for Brain Science (Wang et al., 2020, Cell). Built by scripts/build-atlas.py.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

type Manifest = {
  binary?: string; origin: number[]; scale: number;
  structures: { id: number; name: string; color: string; positions: [number, number]; indices: [number, number] }[];
};

const motionOK = () => document.documentElement.dataset.motion !== 'off';
const HIPPO = [382, 423, 463, 632, 10703, 10704];
// Additive light that leaves the canvas alpha untouched, so glow adds onto the page instead of darkening it
const additive = {
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
} as const;

export async function initHeroBrain(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  try { const c = document.createElement('canvas'); if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw 0; }
  catch { host.classList.add('no-webgl'); return; }
  if ((navigator as any).connection?.saveData) { host.classList.add('no-webgl'); return; }

  const base = host.dataset.atlas!;
  const manifest: Manifest = await fetch(`${base}ccf.json`).then((r) => r.json());
  const buf = await fetch(`${base}${manifest.binary ?? 'ccf.bin'}`).then((r) => r.arrayBuffer());

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  const pivot = new THREE.Group();
  const group = new THREE.Group();
  pivot.add(group); scene.add(pivot);

  const dot = makeDotTexture();
  const S = 0.01;
  const geos = new Map<number, THREE.BufferGeometry>();
  for (const st of manifest.structures) {
    const q = new Uint16Array(buf, st.positions[0], st.positions[1] * 3);
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 3) {
      const x = q[i] * manifest.scale + manifest.origin[0];
      const y = q[i + 1] * manifest.scale + manifest.origin[1];
      const z = q[i + 2] * manifest.scale + manifest.origin[2];
      pos[i] = x * S; pos[i + 1] = -z * S; pos[i + 2] = y * S;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, st.indices[0], st.indices[1]), 1));
    g.computeVertexNormals();
    geos.set(st.id, g);
  }
  const brain = geos.get(997)!;
  brain.computeBoundingBox();
  const center = brain.boundingBox!.getCenter(new THREE.Vector3());
  group.position.copy(center).multiplyScalar(-1);

  // Translucent shell for depth (fresnel rim)
  const shellMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#4f9fd6') }, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0); gl_FragColor = vec4(uColor * (0.3 + f), (f * f * 0.22) * uOpacity); }`,
    transparent: true, depthWrite: false, ...additive, side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(brain, shellMat));

  // Surface sampled into points; twinkle in the shader
  const pointsMat = (size: number, opacity: number) => new THREE.ShaderMaterial({
    uniforms: { uTex: { value: dot }, uTime: { value: 0 }, uSize: { value: size * renderer.getPixelRatio() }, uOpacity: { value: opacity }, uReveal: { value: 0 } },
    vertexShader: `attribute vec3 color; attribute float seed; uniform float uTime; uniform float uSize; uniform float uReveal; varying vec3 vC; varying float vA;
      void main(){
        // intro: points fly in from a scattered cloud and settle onto the atlas surface
        float asm = smoothstep(seed * 0.7, seed * 0.7 + 0.35, uReveal);
        vec3 dir = normalize(vec3(sin(seed * 91.7), cos(seed * 53.1), sin(seed * 17.3 + 1.0)) + 1e-4);
        float k = (1.0 - asm) * (1.0 - asm);
        vec3 p = position + dir * (1.2 + seed * 2.8) * k + vec3(0.0, 0.0, -k * 1.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        float tw = 0.65 + 0.35 * sin(uTime * (0.6 + seed * 1.7) + seed * 40.0);
        vC = color; vA = tw * smoothstep(0.0, 0.12, uReveal) * (0.35 + 0.65 * asm); gl_PointSize = uSize * (0.6 + seed * 0.8 + k * 1.2) / -mv.z; }`,
    fragmentShader: `uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC; varying float vA;
      void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, t.a * vA * uOpacity); }`,
    transparent: true, depthWrite: false, ...additive,
  });
  const brainPts = samplePoints(brain, 26000, [new THREE.Color('#3d8fe0'), new THREE.Color('#8fd0ff'), new THREE.Color('#5fd3c6')]);
  const brainMat = pointsMat(12, 0.85);
  group.add(new THREE.Points(brainPts, brainMat));

  const hipColors = [new THREE.Color('#5fd3c6'), new THREE.Color('#8ff0c8'), new THREE.Color('#b9f7ff')];
  const hipMats: THREE.ShaderMaterial[] = [];
  HIPPO.forEach((id) => {
    const g = geos.get(id); if (!g) return;
    const m = pointsMat(id === 382 ? 11 : 9, id === 382 ? 1 : 0.8);
    hipMats.push(m);
    group.add(new THREE.Points(samplePoints(g, id === 382 ? 9000 : 3000, hipColors), m));
  });

  // Illustrative activity: flashes on dorsal CA1
  const ca1 = geos.get(382)!.getAttribute('position') as THREE.BufferAttribute;
  const cand: THREE.Vector3[] = [];
  for (let i = 0; i < ca1.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ca1, i); cand.push(v); }
  cand.sort((a, b) => b.y - a.y);
  const dorsal = cand.slice(0, Math.floor(cand.length * 0.35));
  const nCells = 420;
  const cellPos = new Float32Array(nCells * 3);
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < nCells; i++) { const v = dorsal[Math.floor(rnd() * dorsal.length)]; cellPos.set([v.x, v.y, v.z], i * 3); }
  const cellGeo = new THREE.BufferGeometry();
  cellGeo.setAttribute('position', new THREE.BufferAttribute(cellPos, 3));
  const cellCol = new THREE.BufferAttribute(new Float32Array(nCells * 3), 3);
  cellGeo.setAttribute('color', cellCol);
  const cellMat = new THREE.PointsMaterial({ size: 0.075, map: dot, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, ...additive });
  group.add(new THREE.Points(cellGeo, cellMat));
  const act = new Float32Array(nCells), flash = new THREE.Color('#d8fff0');
  const fire = (dt: number) => {
    const decay = Math.pow(0.9, dt * 60);
    for (let i = 0; i < nCells; i++) {
      if (act[i] < 0.03 && Math.random() < 0.004 * dt * 60) act[i] = 1;
      act[i] *= decay;
      const k = act[i] * 2.2;
      cellCol.setXYZ(i, flash.r * k, flash.g * k, flash.b * k);
    }
    cellCol.needsUpdate = true;
  };

  /* ---- View ---- */
  const state = { intro: motionOK() ? 0 : 1, scroll: 0, yaw: -2.3, px: 0, py: 0 };
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  let last = performance.now(), t = 0;
  const render = () => {
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (motionOK()) { t += dt; state.yaw += dt * 0.06; fire(dt); }
    const e = state.intro;
    [brainMat, ...hipMats].forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uReveal.value = e * 1.25; });
    shellMat.uniforms.uOpacity.value = e;
    pivot.rotation.set(0.42 + state.py * 0.12 + state.scroll * 0.35, state.yaw + state.px * 0.25, 0);
    const dist = 14 - 1.5 * e + state.scroll * 3;
    camera.position.set(0, 1.5 + state.scroll * 0.8, -dist);
    camera.lookAt(0, -0.1, 0);
    renderer.render(scene, camera);
  };

  let raf = 0, visible = true;
  const loop = () => { render(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && motionOK()) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); }).observe(host);

  const pxTo = gsap.quickTo(state, 'px', { duration: 1.4, ease: 'power3.out' });
  const pyTo = gsap.quickTo(state, 'py', { duration: 1.4, ease: 'power3.out' });
  host.closest('section')?.addEventListener('pointermove', (ev) => {
    pxTo((ev.clientX / innerWidth - 0.5) * 2); pyTo((ev.clientY / innerHeight - 0.5) * 2);
  });

  host.classList.add('is-ready');
  if (motionOK()) {
    gsap.to(state, { intro: 1, duration: 3.6, ease: 'power3.out', delay: 0.15 });
    ScrollTrigger.create({ trigger: host.closest('section')!, start: 'top top', end: 'bottom top', scrub: true, onUpdate: (self) => (state.scroll = self.progress) });
    start();
  } else render();
  addEventListener('agz:motion', (ev) => { if ((ev as CustomEvent).detail.allowed) start(); else { stop(); state.intro = 1; render(); } });
}

/** Area-weighted random points on a mesh surface, with per-point colour and seed. */
function samplePoints(g: THREE.BufferGeometry, n: number, palette: THREE.Color[]) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute, idx = g.getIndex()!;
  const tri = idx.count / 3, areas = new Float32Array(tri);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let total = 0;
  for (let i = 0; i < tri; i++) {
    a.fromBufferAttribute(pos, idx.getX(i * 3)); b.fromBufferAttribute(pos, idx.getX(i * 3 + 1)); c.fromBufferAttribute(pos, idx.getX(i * 3 + 2));
    total += new THREE.Triangle(a, b, c).getArea(); areas[i] = total;
  }
  const out = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n);
  let s = 3; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const r = rnd() * total;
    let lo = 0, hi = tri - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (areas[m] < r) lo = m + 1; else hi = m; }
    a.fromBufferAttribute(pos, idx.getX(lo * 3)); b.fromBufferAttribute(pos, idx.getX(lo * 3 + 1)); c.fromBufferAttribute(pos, idx.getX(lo * 3 + 2));
    let u = rnd(), v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = a.clone().add(b.clone().sub(a).multiplyScalar(u)).add(c.clone().sub(a).multiplyScalar(v));
    out.set([p.x, p.y, p.z], k * 3);
    const cc = palette[Math.floor(rnd() * palette.length)];
    col.set([cc.r, cc.g, cc.b], k * 3);
    seed[k] = rnd();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(out, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  pg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  return pg;
}

function makeDotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
