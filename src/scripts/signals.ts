/**
 * ILLUSTRATIVE electrophysiology signals (EEG, LTP, LFP) generated from simple models.
 * They mimic the appearance of the lab's experimental paradigms for teaching purposes and
 * are NOT recorded data. Seeded random numbers keep every visit identical.
 */

export type Series = {
  id: string; label: string; color: string; t0: number; dt: number; y: Float32Array | number[];
  axis?: 'left' | 'right'; style?: 'line' | 'points'; offset?: number; width?: number; glow?: boolean; hidden?: boolean; fixed?: boolean;
};
export type Annotation = { t: number; window: number; label: string; plain: string; expert: string };
export type Dataset = {
  tMin: number; tMax: number; minSpan: number; view?: [number, number];
  yLabel: string; yUnit: string; yRightLabel?: string; yFixed?: [number, number];
  series: Series[]; annotations: Annotation[];
  regions?: { t0: number; t1: number; label?: string; color?: string }[];
  markers?: { t: number; label: string }[];
  inset?: { title: string; note: string; traces: { y: number[]; color: string; series?: string }[] };
};

function rng(seed: number) {
  let s = seed;
  const u = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  return { u, g };
}
const H = 3600;

/* ------------------------------------------------------------------ EEG */
function eeg(): Dataset {
  const fs = 100, tMin = -1 * H, tMax = 5 * H, n = (tMax - tMin) * fs;
  const y = new Float32Array(n);
  const { u, g } = rng(42);
  const seizures: [number, number][] = [[0.78, 0.9], [1.08, 1.22], [1.42, 1.6], [1.86, 2.04], [2.45, 3.35]].map(([a, b]) => [a * H, b * H]);
  const inSeizure = (t: number) => seizures.find(([a, b]) => t >= a && t < b);

  // background: AR(1) noise + slow drift (µV)
  let x = 0, drift = 0;
  for (let i = 0; i < n; i++) {
    x = 0.95 * x + g() * 2.4; drift = 0.9995 * drift + g() * 0.12;
    y[i] = x + drift;
  }
  // interictal epileptic spikes: rate rises after the KA injections
  const rate = (t: number) => (t < 0.35 * H ? 0 : 0.75 / (1 + Math.exp(-(t / H - 1.3) / 0.3)));
  const spikeTimes: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = tMin + i / fs;
    if (inSeizure(t) || u() > rate(t) / fs) continue;
    spikeTimes.push(t);
    const A = 70 + u() * 110;
    const shape = [-0.25, -1, -0.55, 0.05, 0.18, 0.26, 0.3, 0.28, 0.22, 0.15, 0.1, 0.05];
    shape.forEach((k, j) => { if (i + j < n) y[i + j] += A * k; });
  }
  // seizures: evolving rhythmic spike-wave discharges with fast activity
  for (const [a, b] of seizures) {
    const i0 = Math.floor((a - tMin) * fs), i1 = Math.floor((b - tMin) * fs), len = i1 - i0;
    const sustained = b - a > 0.5 * H; // late, prolonged seizure activity
    let ph = 0;
    for (let i = i0; i < i1; i++) {
      const p = (i - i0) / len;
      const env = sustained ? 0.55 + 0.25 * Math.sin(p * 31) * Math.sin(p * 7) : Math.sin(Math.PI * Math.min(1, p * 1.15));
      const f = 5 - 2.5 * p;
      ph += (2 * Math.PI * f) / fs;
      const sw = -Math.pow(Math.max(0, Math.cos(ph)), 8) * 1.6 + 0.35 * Math.sin(ph - 1);
      y[i] += env * (110 * sw + 14 * Math.sin((2 * Math.PI * 28 * i) / fs) * (0.5 + u())) + g() * 6 * env;
    }
  }
  // cumulative detected spikes (per minute)
  const cum: number[] = [];
  let k = 0;
  for (let t = tMin; t <= tMax; t += 60) { while (k < spikeTimes.length && spikeTimes[k] < t) k++; cum.push(k); }
  const firstSpike = spikeTimes.find((t) => t > 0.5 * H) ?? 0.6 * H;

  return {
    tMin, tMax, minSpan: 1, yLabel: 'EEG (µV)', yUnit: 'µV', yRightLabel: 'cumulative spikes',
    series: [
      { id: 'eeg', label: 'EEG', color: '--red', t0: tMin, dt: 1 / fs, y, width: 1 },
      { id: 'cum', label: 'Cumulative spikes', color: '--amber', t0: tMin, dt: 60, y: cum, axis: 'right', width: 2 },
    ],
    regions: seizures.map(([a, b]) => ({ t0: a, t1: b, label: 'Seizure' })),
    markers: [{ t: 0, label: 'KA' }, { t: 0.5 * H, label: 'KA' }],
    annotations: [
      { t: -0.5 * H, window: 20, label: 'Baseline EEG', plain: 'Before any treatment: the normal background activity of the brain — small, irregular fluctuations.', expert: 'Low-amplitude, mixed-frequency background. Simultaneous EMG and video identify sleep/wake and movement artefacts.' },
      { t: 0.25 * H, window: 1.5 * H, label: 'Kainate injections', plain: 'A substance that over-activates glutamate receptors (kainate) is injected twice, half an hour apart, to make the brain network over-excitable.', expert: 'Two systemic kainic-acid (KA) doses, 30 min apart — an acute seizure model probing network excitability.' },
      { t: firstSpike, window: 4, label: 'Epileptic spike', plain: 'A sharp, large deflection lasting a fraction of a second: many neurons fire in synchrony.', expert: 'Interictal epileptiform discharge (<200 ms). Detected automatically, e.g. by thresholding the z-scored Teager–Kaiser energy.' },
      { t: 0.78 * H + 120, window: 40, label: 'Seizure', plain: 'A seizure: rhythmic, high-amplitude discharges that last from tens of seconds to minutes.', expert: 'Ictal activity with evolving rhythmic spike-wave discharges and increased 20–60 Hz power; detected from spectral power.' },
      { t: 4 * H, window: 6 * H, label: 'Counting spikes', plain: 'The yellow line counts spikes over time — an easy way to compare how excitable different brains are.', expert: 'Cumulative spike counts per animal allow group comparisons (e.g. genotypes or treatments) over the post-injection period.' },
    ],
  };
}

/* ------------------------------------------------------------------ LTP */
function ltp(): Dataset {
  const dt = 30, tMin = -20 * 60, tMax = 60 * 60;
  const { g } = rng(7);
  const ctrl: number[] = [], imp: number[] = [];
  for (let t = tMin; t <= tMax; t += dt) {
    const m = t / 60;
    const c = t < 0 ? 100 : 152 + 75 * Math.exp(-m / 3) + 8 * Math.exp(-m / 25);
    const i = t < 0 ? 100 : 104 + 80 * Math.exp(-m / 3.5) + 30 * Math.exp(-m / 15);
    ctrl.push(c + g() * 5); imp.push(i + g() * 5);
  }
  const fepsp = (gain: number) => Array.from({ length: 220 }, (_, i) => {
    const t = i * 0.1; // ms
    const art = t > 1 && t < 1.6 ? 2.2 * Math.sin(((t - 1) / 0.6) * Math.PI * 2) : 0;
    const fv = -0.25 * Math.exp(-(((t - 2.6) / 0.35) ** 2));
    const ep = t > 3 ? -gain * ((t - 3) / 2.5) * Math.exp(1 - (t - 3) / 2.5) : 0;
    return art + fv + ep;
  });
  return {
    tMin, tMax, minSpan: 300, yLabel: 'fEPSP slope (% of baseline)', yUnit: '%', yFixed: [50, 260],
    series: [
      { id: 'ctrl', label: 'Control', color: '--green', t0: tMin, dt, y: ctrl, style: 'points' },
      { id: 'imp', label: 'Impaired LTP', color: '--magenta', t0: tMin, dt, y: imp, style: 'points' },
      { id: 'base', label: 'Baseline', color: '--text-3', t0: tMin, dt: tMax - tMin, y: [100, 100], fixed: true, width: 1 },
    ],
    markers: [{ t: 0, label: 'TBS' }],
    regions: [{ t0: tMin, t1: 0, label: 'Baseline' }],
    inset: {
      title: 'Example fEPSPs', note: 'grey: before · colour: 50 min after',
      traces: [{ y: fepsp(1), color: '--text-3' }, { y: fepsp(1.55), color: '--green', series: 'ctrl' }, { y: fepsp(1.05), color: '--magenta', series: 'imp' }],
    },
    annotations: [
      { t: -10 * 60, window: 30 * 60, label: 'Stable baseline', plain: 'A weak test pulse every 30 s gives a steady response — this is our 100 % reference.', expert: 'Schaffer-collateral stimulation, fEPSP slope recorded in CA1 stratum radiatum; ≥ 20 min stable baseline required.' },
      { t: 0, window: 20 * 60, label: 'Theta-burst stimulation', plain: 'A short, strong burst of pulses mimics the brain’s natural rhythm during learning.', expert: 'Theta-burst stimulation (bursts of 4 pulses at 100 Hz, repeated at 5 Hz) induces NMDA-receptor-dependent LTP.' },
      { t: 3 * 60, window: 20 * 60, label: 'Post-tetanic potentiation', plain: 'Right after the burst, responses jump up — but part of this boost fades within minutes.', expert: 'Short-term (post-tetanic) potentiation, largely presynaptic, decays within ~10 min.' },
      { t: 45 * 60, window: 35 * 60, label: 'Long-term potentiation', plain: 'The lasting increase is LTP: the synapses have become stronger — a cellular model of memory. Under disease-like conditions it can fail (pink).', expert: 'Sustained potentiation (≈ 150 % at 60 min). Soluble Aβ oligomers are known to impair hippocampal LTP (Walsh et al., 2002, Nature).' },
    ],
  };
}

/* ------------------------------------------------------------------ LFP */
function lfp(): Dataset {
  const fs = 2000, T = 10, n = T * fs;
  const { g } = rng(11);
  const raw = new Float32Array(n), theta = new Float32Array(n), ripple = new Float32Array(n);
  const swr = [6.75, 7.85, 8.55, 9.4];
  let pink = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    const run = t < 5.6 ? 1 : t < 6.2 ? 1 - (t - 5.6) / 0.6 : 0;
    ph += (2 * Math.PI * (7.8 + 0.4 * Math.sin(t * 0.9))) / fs;
    const th = (0.32 * run + 0.04) * Math.sin(ph);
    const gam = run * 0.07 * ((1 + Math.cos(ph - 0.6)) / 2) * Math.sin((2 * Math.PI * 62 * i) / fs);
    pink = 0.985 * pink + g() * 0.012;
    let sw = 0, rp = 0;
    for (const c of swr) {
      const d = t - c;
      if (Math.abs(d) < 0.2) { sw += -0.55 * Math.exp(-((d / 0.03) ** 2)); rp += 0.13 * Math.exp(-((d / 0.018) ** 2)) * Math.sin(2 * Math.PI * 195 * d); }
    }
    theta[i] = th; ripple[i] = rp + g() * 0.006;
    raw[i] = th + gam + pink + sw + rp + g() * 0.01;
  }
  return {
    tMin: 0, tMax: T, minSpan: 0.05, yLabel: 'LFP (mV, traces offset)', yUnit: 'mV',
    series: [
      { id: 'raw', label: 'Raw LFP', color: '--blue', t0: 0, dt: 1 / fs, y: raw, glow: true },
      { id: 'theta', label: 'Theta band (6–10 Hz)', color: '--green', t0: 0, dt: 1 / fs, y: theta, offset: -1.3 },
      { id: 'ripple', label: 'Ripple band (150–250 Hz)', color: '--magenta', t0: 0, dt: 1 / fs, y: ripple, offset: -2 },
    ],
    regions: [{ t0: 0, t1: 6, label: 'Exploration — theta state', color: '--green' }, { t0: 6, t1: 10, label: 'Rest — sharp-wave ripples', color: '--magenta' }],
    markers: swr.map((t) => ({ t, label: 'SWR' })),
    annotations: [
      { t: 2, window: 1.2, label: 'Theta rhythm', plain: 'While the animal explores, the field potential swings rhythmically about eight times per second.', expert: 'Theta oscillation (6–10 Hz), paced by medial septum and entorhinal inputs; organises CA1 spike timing (phase precession).' },
      { t: 3.1, window: 0.3, label: 'Theta–gamma coupling', plain: 'Faster ripples of activity ride on each theta wave, strongest at a particular phase.', expert: 'Gamma (30–100 Hz) amplitude is modulated by theta phase — phase–amplitude coupling linked to memory encoding.' },
      { t: 7.85, window: 0.35, label: 'Sharp-wave ripple', plain: 'At rest, short bursts appear: a large dip with a very fast oscillation on top. The brain is thought to replay recent experiences here.', expert: 'Sharp wave (CA3-driven depolarisation of CA1 dendrites) with a 150–250 Hz ripple in stratum pyramidale; supports memory consolidation.' },
      { t: 7.85, window: 0.1, label: 'Ripple close-up', plain: 'Zoomed in, the ripple is about 200 cycles per second — one of the fastest rhythms in the brain.', expert: '~195 Hz ripple, ~50–100 ms duration, generated by perisomatic interneuron-pyramidal cell interactions.' },
    ],
  };
}

export const datasets: Record<string, () => Dataset> = { eeg, ltp, lfp };
