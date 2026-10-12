/**
 * Illustrative field EPSP waveform (CA3→CA1 Schaffer collateral, recorded in CA1 stratum radiatum).
 * Times in ms, voltage in mV (negative = downward). Shape follows textbook recordings:
 * a brief biphasic stimulus artefact, a small presynaptic fibre volley, then the negative-going fEPSP.
 * Not lab data.
 */
export const STIM_MS = 2;          // stimulus delivered here
export const VOLLEY_MS = 3.4;      // fibre volley (action potentials in the axons)
export const ONSET_MS = 4.6;       // fEPSP onset (synaptic delay after the volley)
export const TAU_MS = 3.2;         // time to fEPSP peak after onset

/** Voltage at time t (ms) for a response of amplitude `amp` (mV, positive number). */
export function fepspAt(t: number, amp: number, volley = 0.22) {
  let v = 0;
  // artefact: short positive then negative spike, ~0.4 ms
  const a = t - STIM_MS;
  if (a >= 0 && a < 0.4) v += 2.2 * Math.sin((a / 0.4) * Math.PI * 2) * Math.exp(-a * 4);
  // fibre volley: small triphasic, mostly negative, ~1 ms
  const f = (t - VOLLEY_MS) / 0.35;
  v += volley * (0.15 * Math.exp(-((f + 1.4) ** 2)) - Math.exp(-(f ** 2)) + 0.1 * Math.exp(-((f - 1.6) ** 2)));
  // fEPSP: alpha function, negative-going
  const u = (t - ONSET_MS) / TAU_MS;
  if (u > 0) v -= amp * u * Math.exp(1 - u);
  return v;
}

/** SVG path for 0–tMax ms mapped into a box. */
export function fepspPath(amp: number, box: { x: number; y: number; w: number; mvPerPx: number; tMax?: number }, n = 240) {
  const tMax = box.tMax ?? 20;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * tMax;
    const x = box.x + (t / tMax) * box.w, y = box.y - fepspAt(t, amp) / box.mvPerPx;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}
