/**
 * Three.js scene (via @remotion/three): a slab of CA1 pyramidal somata seen from above at an angle.
 * Each soma has a deterministic spike train; calcium signal = sum of exp(−t/0.7 s) kernels, so the
 * render is identical every time. Illustrative.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';

const N = 520;

const vert = `attribute float ca; attribute float size; varying float vCa;
void main(){ vCa = ca; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = size * (1.0 + ca * 1.8) * (300.0 / -mv.z); }`;
const frag = `varying float vCa;
void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d); float ring = smoothstep(0.5, 0.35, d) * smoothstep(0.2, 0.36, d);
  vec3 rest = vec3(0.22, 0.55, 0.5); vec3 lit = vec3(0.55, 1.0, 0.7);
  vec3 c = mix(rest * (0.35 + ring * 0.8), lit * (0.4 + core * 1.4), clamp(vCa, 0.0, 1.0));
  float a = mix(0.35 * (ring + core * 0.4), core, clamp(vCa, 0.0, 1.0));
  gl_FragColor = vec4(c, a); }`;

export const Neurons: React.FC<{ seed?: number }> = ({ seed = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const data = useMemo(() => {
    let s = 9 + seed * 101; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pos = new Float32Array(N * 3), size = new Float32Array(N), spikes: number[][] = [];
    for (let i = 0; i < N; i++) {
      // pyramidal layer: a thin, slightly curved sheet
      const x = (r() - 0.5) * 14, z = (r() - 0.5) * 9;
      pos[i * 3] = x; pos[i * 3 + 1] = Math.sin(x * 0.25) * 0.6 + (r() - 0.5) * 0.5; pos[i * 3 + 2] = z;
      size[i] = 0.32 + r() * 0.16;
      const hyper = r() < 0.08, rate = hyper ? 1.2 : 0.05 + r() * 0.2, train: number[] = [];
      let t = -2 * r();
      while (t < 12) { t += -Math.log(1 - r()) / rate; train.push(t); if (r() < 0.25) train.push(t + 0.12, t + 0.24); }
      spikes.push(train);
    }
    return { pos, size, spikes };
  }, [seed]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(data.size, 1));
    g.setAttribute('ca', new THREE.BufferAttribute(new Float32Array(N), 1));
    return g;
  }, [data]);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), []);
  const t = frame / fps;
  const ca = geo.getAttribute('ca') as THREE.BufferAttribute;
  for (let i = 0; i < N; i++) {
    let c = 0;
    for (const sp of data.spikes[i]) if (sp <= t && t - sp < 4) c += Math.exp(-(t - sp) / 0.7);
    (ca.array as Float32Array)[i] = Math.min(1.4, c);
  }
  ca.needsUpdate = true;
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 42, position: [0, 5.2, 8.6], rotation: [-0.54, 0, 0], near: 0.1, far: 100 }} gl={{ antialias: true, alpha: true }}>
      <group rotation={[0, t * 0.07 - 0.3, 0]} scale={1 + t * 0.015}>
        <points geometry={geo} material={mat} />
      </group>
    </ThreeCanvas>
  );
};
