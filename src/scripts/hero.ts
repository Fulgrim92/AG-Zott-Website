/**
 * Homepage figure: the Allen Mouse Brain Atlas (CCFv3) in 3D — whole brain → hippocampal
 * formation → CA1 → a real two-photon recording, stepped with tabs. Drag to rotate.
 *
 * Anatomy: Allen Mouse Brain Common Coordinate Framework v3 (2017) structure meshes,
 * © Allen Institute for Brain Science (Wang et al., 2020, Cell). Built by scripts/build-atlas.py.
 * The flashing "neurons" on CA1 are an illustrative overlay, not data.
 */
import * as THREE from 'three';
import { gsap } from 'gsap';

type Manifest = {
  binary?: string; encoding?: 'base64'; origin: number[]; scale: number;
  structures: { id: number; name: string; color: string; positions: [number, number]; indices: [number, number] }[];
};

const hero = document.querySelector<HTMLElement>('[data-hero]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-hero-canvas]');
const motionOK = () => document.documentElement.dataset.motion !== 'off';

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

if (hero && canvas) {
  if (!webglAvailable() || (navigator as any).connection?.saveData) hero.classList.add('no-webgl');
  else init(hero, canvas).catch((err) => { console.warn('Atlas failed to load', err); hero.classList.add('no-webgl'); });
}

/* ---------- Shaders ---------- */
// Translucent shell: bright at grazing angles (fresnel), so the outline reads without hiding the inside
const shellMaterial = (color: string) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
    void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6); gl_FragColor = vec4(uColor * (0.25 + f), (0.03 + f * 0.55) * uOpacity); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
// Solid structures: soft key light + rim glow
const solidMaterial = (color: string) => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 }, uGlow: { value: 0 } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uGlow; varying vec3 vN; varying vec3 vV;
    void main(){ vec3 n = normalize(vN); float d = max(dot(n, normalize(vec3(0.4,0.8,0.6))), 0.0); float rim = pow(1.0 - abs(dot(n, normalize(vV))), 2.0);
      vec3 c = uColor * (0.1 + 0.55 * d) + uColor * rim * (0.45 + uGlow); gl_FragColor = vec4(c, uOpacity); }`,
  transparent: true,
});

async function init(hero: HTMLElement, canvas: HTMLCanvasElement) {
  const base = hero.dataset.atlas!;
  const manifest: Manifest = await fetch(`${base}ccf.json`).then((r) => r.json());
  const res = await fetch(`${base}${manifest.binary ?? 'ccf.bin'}`);
  // Hosts that only serve text can ship the same bytes base64-encoded (manifest.encoding = "base64")
  const buf = manifest.encoding === 'base64'
    ? Uint8Array.from(atob((await res.text()).trim()), (c) => c.charCodeAt(0)).buffer
    : await res.arrayBuffer();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
  const group = new THREE.Group();
  scene.add(group);

  /* ---- Geometry from CCFv3 voxels (25 µm) to scene units (1 unit = 2.5 mm), dorsal up, anterior forward ---- */
  const S = 0.01;
  const meshes = new Map<number, { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; geo: THREE.BufferGeometry }>();
  let center = new THREE.Vector3();
  for (const st of manifest.structures) {
    const q = new Uint16Array(buf, st.positions[0], st.positions[1] * 3);
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 3) {
      const x = q[i] * manifest.scale + manifest.origin[0];      // medio-lateral
      const y = q[i + 1] * manifest.scale + manifest.origin[1];  // antero-posterior (increases posteriorly)
      const z = q[i + 2] * manifest.scale + manifest.origin[2];  // dorso-ventral (increases ventrally)
      pos[i] = x * S; pos[i + 1] = -z * S; pos[i + 2] = y * S;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, st.indices[0], st.indices[1]), 1));
    g.computeVertexNormals();
    if (st.id === 997) { g.computeBoundingBox(); center = g.boundingBox!.getCenter(new THREE.Vector3()); }
    const mat = st.id === 997 ? shellMaterial(st.color) : solidMaterial(st.color);
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = st.id === 997 ? 2 : 1;
    meshes.set(st.id, { mesh, mat, geo: g });
    group.add(mesh);
  }
  group.children.forEach((m) => m.position.sub(center));
  const hippo = [382, 423, 463, 632, 10703, 10704].filter((id) => meshes.has(id));

  /* ---- Key points: the hippocampal formation and dorsal CA1 of one hemisphere ---- */
  const hipBox = new THREE.Box3();
  hippo.forEach((id) => { const b = new THREE.Box3().setFromObject(meshes.get(id)!.mesh); hipBox.union(b); });
  const hipCenter = hipBox.getCenter(new THREE.Vector3());
  const ca1 = meshes.get(382)!;
  const ca1Pos = ca1.geo.getAttribute('position') as THREE.BufferAttribute;
  const offset = ca1.mesh.position;
  // dorsal CA1, right hemisphere: highest vertices with x beyond the midline
  const cands: THREE.Vector3[] = [];
  for (let i = 0; i < ca1Pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(ca1Pos, i).add(offset);
    if (v.x > 0.4) cands.push(v);
  }
  cands.sort((a, b) => b.y - a.y);
  const dorsal = cands.slice(0, Math.max(50, Math.floor(cands.length * 0.25)));
  const ca1Target = dorsal.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(dorsal.length);

  /* ---- Illustrative activity: flashes on the dorsal CA1 surface ---- */
  const dotTex = makeDotTexture();
  const nCells = Math.min(700, dorsal.length);
  const cellPos = new Float32Array(nCells * 3);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < nCells; i++) {
    const v = dorsal[Math.floor(rnd() * dorsal.length)];
    cellPos.set([v.x + (rnd() - 0.5) * 0.02, v.y + (rnd() - 0.5) * 0.02, v.z + (rnd() - 0.5) * 0.02], i * 3);
  }
  const cellGeo = new THREE.BufferGeometry();
  cellGeo.setAttribute('position', new THREE.BufferAttribute(cellPos, 3));
  const cellCol = new THREE.BufferAttribute(new Float32Array(nCells * 3), 3);
  cellGeo.setAttribute('color', cellCol);
  const cellMat = new THREE.PointsMaterial({ size: 0.05, map: dotTex, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const cells = new THREE.Points(cellGeo, cellMat);
  cells.renderOrder = 3;
  scene.add(cells);
  const act = new Float32Array(nCells), green = new THREE.Color('#c8ffe0');
  const fire = () => {
    for (let i = 0; i < nCells; i++) {
      if (act[i] < 0.02 && Math.random() < 0.006) act[i] = 1;
      act[i] *= 0.93;
      const k = 0.15 + act[i] * 2.4;
      cellCol.setXYZ(i, green.r * k, green.g * k, green.b * k);
    }
    cellCol.needsUpdate = true;
  };

  /* ---- Camera keyframes per step (position relative to target) ---- */
  const brainTarget = new THREE.Vector3(0, 0, 0);
  const keys = [
    { target: brainTarget, pos: new THREE.Vector3(-4.1, 3.2, -5.7) },                                  // whole brain, from front-left above
    { target: hipCenter, pos: hipCenter.clone().add(new THREE.Vector3(-2.5, 2.3, -2.9)) },               // hippocampal formation
    { target: ca1Target, pos: ca1Target.clone().add(new THREE.Vector3(1.1, 2.1, -1.7)) },                // dorsal CA1
    { target: ca1Target, pos: ca1Target.clone().add(new THREE.Vector3(0.1, 0.2, -0.16)) },             // dive into CA1 → recording
  ];
  const state = { p: 0, intro: motionOK() ? 0 : 1, yaw: 0 };
  const drag = { on: false, x: 0, yaw: 0, vel: 0 };

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = innerWidth < 768 ? 44 : 36; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), rel = new THREE.Vector3();
  const render = (time = 0) => {
    const p = Math.min(state.p, keys.length - 1), i = Math.min(Math.floor(p), keys.length - 2), f = smooth(p - i);
    tmpT.lerpVectors(keys[i].target, keys[i + 1].target, f);
    tmpP.lerpVectors(keys[i].pos, keys[i + 1].pos, f);
    // orbit around the current target by the user's drag (and a slow idle drift on the overview)
    const yaw = state.yaw + (motionOK() ? Math.sin(time * 0.00012) * 0.18 * Math.max(0, 1 - p) : 0);
    rel.subVectors(tmpP, tmpT).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    rel.multiplyScalar(1 + (1 - state.intro) * 0.9);
    camera.position.copy(tmpT).add(rel);
    camera.lookAt(tmpT);

    // visibility per step
    const shell = meshes.get(997)!.mat;
    shell.uniforms.uOpacity.value = 1 - 0.6 * Math.min(p, 1) - 0.25 * Math.max(0, Math.min(p - 1, 1));
    const ca1Focus = Math.max(0, Math.min(p - 1, 1));
    hippo.forEach((id) => {
      const m = meshes.get(id)!.mat;
      m.uniforms.uOpacity.value = id === 382 ? 1 : 1 - 0.75 * ca1Focus;
      m.uniforms.uGlow.value = id === 382 ? 0.6 * ca1Focus : 0;
    });
    cellMat.opacity = ca1Focus;
    if (ca1Focus > 0 && motionOK()) fire();
    renderer.render(scene, camera);
    reveal(p);
  };

  /* ---- Dive into CA1: an imaging field of view opens on the tissue and becomes the recording ---- */
  const real = hero.querySelector<HTMLElement>('[data-hero-real]');
  const fov = hero.querySelector<HTMLElement>('[data-hero-fov]');
  const realVideo = real?.querySelector('video');
  const proj = new THREE.Vector3();
  let videoBox = { l: 0.06, t: 0, w: 0.88, h: 1 };
  const measure = () => {
    if (!real || !realVideo) return;
    const a = real.getBoundingClientRect(), b = realVideo.getBoundingClientRect();
    if (a.width && b.width) videoBox = { l: (b.left - a.left) / a.width, t: (b.top - a.top) / a.height, w: b.width / a.width, h: b.height / a.height };
  };
  new ResizeObserver(measure).observe(hero);
  realVideo?.addEventListener('loadedmetadata', measure);
  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  function reveal(p: number) {
    if (!real) return;
    const r = Math.max(0, Math.min(1, (p - 2.55) / 0.45)), e = smooth(r);
    real.classList.toggle('is-on', r > 0.5);
    real.style.pointerEvents = r > 0.95 ? 'auto' : 'none';
    canvas.style.filter = r > 0 ? `brightness(${(1 - 0.8 * e).toFixed(3)}) blur(${(4 * e).toFixed(2)}px)` : '';
    if (r <= 0) { real.style.opacity = '0'; if (fov) fov.style.opacity = '0'; return; }
    // where dorsal CA1 sits on screen, in the reveal container's coordinates (container = stage inset 6%)
    proj.copy(ca1Target).project(camera);
    const cx = ((proj.x + 1) / 2 - 0.06) / 0.88, cy = ((1 - proj.y) / 2 - 0.06) / 0.88;
    const hs = 0.035, box = {
      l: cx - hs + (videoBox.l - (cx - hs)) * e, t: cy - hs + (videoBox.t - (cy - hs)) * e,
      w: 2 * hs + (videoBox.w - 2 * hs) * e, h: 2 * hs + (videoBox.h - 2 * hs) * e,
    };
    real.style.opacity = String(Math.min(1, r * 6));
    real.style.clipPath = `inset(${pct(box.t)} ${pct(1 - box.l - box.w)} ${pct(1 - box.t - box.h)} ${pct(box.l)} round ${(10 * e).toFixed(1)}px)`;
    if (fov) {
      const st = (v: number) => pct(0.06 + 0.88 * v); // reveal-container → stage coordinates
      Object.assign(fov.style, { left: st(box.l), top: st(box.t), width: pct(0.88 * box.w), height: pct(0.88 * box.h), opacity: String(Math.min(1, r * 8) * (1 - e * e)) });
    }
  }

  let raf = 0, visible = true;
  const loop = (t: number) => { render(t); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && motionOK()) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && motionOK()) { start(); maybeTour(); } else { stop(); render(); } }).observe(hero);

  // Drag to rotate (pointer or touch); keyboard users get the step tabs
  canvas.addEventListener('pointerdown', (e) => { drag.on = true; drag.x = e.clientX; drag.yaw = state.yaw; canvas.setPointerCapture(e.pointerId); touched = true; clearTimeout(tourTimer); });
  canvas.addEventListener('pointermove', (e) => { if (!drag.on) return; state.yaw = drag.yaw + (e.clientX - drag.x) * 0.008; if (!raf) render(); });
  canvas.addEventListener('pointerup', () => (drag.on = false));
  canvas.style.cursor = 'grab';

  /* ---- Steps ---- */
  const tabs = [...hero.querySelectorAll<HTMLButtonElement>('[data-viz-step]')];
  const captions = [...hero.querySelectorAll<HTMLElement>('[data-viz-caption]')];
  let tourTimer = 0, toured = false, touched = false;

  const go = (i: number) => {
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    captions.forEach((c, k) => (c.hidden = k !== i));
    const showReal = i === 3;
    if (realVideo) showReal && motionOK() ? realVideo.play().catch(() => {}) : realVideo.pause();
    gsap.killTweensOf(state, 'p');
    // the dive into the recording is slower and eases in, like focusing down through tissue
    if (motionOK()) {
      start();
      if (showReal && state.p < 2.55) {
        // two phases: descend into dorsal CA1, then the imaging field opens into the recording
        gsap.timeline()
          .to(state, { p: 2.55, duration: state.p < 2 ? 2.6 : 1.5, ease: 'power2.inOut' })
          .to(state, { p: 3, duration: 1.7, ease: 'power2.inOut' });
      } else gsap.to(state, { p: i, duration: 2.4, ease: 'power2.inOut' });
    }
    else { state.p = i; render(); }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { touched = true; clearTimeout(tourTimer); go(i); });
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); touched = true; clearTimeout(tourTimer);
      const n = (i + d + tabs.length) % tabs.length; tabs[n].focus(); go(n);
    });
  });
  function maybeTour() {
    if (toured || touched || !motionOK()) return;
    toured = true;
    const next = (i: number) => { if (touched || i > 2) return; go(i); tourTimer = window.setTimeout(() => next(i + 1), 4200); };
    tourTimer = window.setTimeout(() => next(1), 3000);
  }

  hero.classList.add('is-ready');
  go(0);
  if (motionOK()) {
    gsap.to(state, { intro: 1, duration: 2.6, ease: 'expo.out', delay: 0.1 });
    gsap.from(canvas, { opacity: 0, duration: 1.6, ease: 'power2.out' });
  } else { state.intro = 1; render(); }
  addEventListener('agz:motion', (e) => { if ((e as CustomEvent).detail.allowed) start(); else { stop(); state.intro = 1; render(); } });
  addEventListener('agz:palette', () => location.reload());
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
