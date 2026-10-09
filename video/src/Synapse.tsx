/**
 * Illustrative glutamatergic synapse (after Zott et al., Science 2019): in the first half, released glutamate
 * is taken up by astrocytic transporters; then soluble β-amyloid appears, uptake is blocked, glutamate
 * lingers and the postsynaptic spine lights up more and more.
 */
import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

const hex = (r: number) => Array.from({ length: 6 }, (_, k) => `${(r * Math.cos((k * Math.PI) / 3)).toFixed(1)},${(r * Math.sin((k * Math.PI) / 3)).toFixed(1)}`).join(' ');

export const Synapse: React.FC = () => {
  const f = useCurrentFrame();
  const { durationInFrames: D } = useVideoConfig();
  const dur = Math.min(D, 190);
  const ab = interpolate(f, [dur * 0.4, dur * 0.55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const zoom = interpolate(f, [0, dur], [1, 1.08]);
  // glutamate particles: released every 36 frames; lifetime short when cleared, long when blocked
  const parts = useMemo(() => {
    let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 160 }, (_, i) => ({ t0: Math.floor(i / 16) * 20, dx: (r() - 0.5) * 2, dy: r(), side: r() < 0.5 ? -1 : 1, sp: 0.7 + r() * 0.6 }));
  }, []);
  const spine = Math.min(1, 0.15 + ab * 0.85 * (0.6 + 0.4 * Math.sin(f / 5)));
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <svg viewBox="0 0 1280 720" width="1280" height="720">
        <defs>
          <radialGradient id="sy-pre" cx="50%" cy="20%" r="80%"><stop offset="0" stopColor="#1a5466" /><stop offset="1" stopColor="#0c2a36" /></radialGradient>
          <radialGradient id="sy-post" cx="50%" cy="80%" r="80%"><stop offset="0" stopColor="#17504f" /><stop offset="1" stopColor="#0b2328" /></radialGradient>
          <radialGradient id="sy-ca" cx="50%" cy="40%" r="60%"><stop offset="0" stopColor="#4dff9a" stopOpacity=".9" /><stop offset="1" stopColor="#4dff9a" stopOpacity="0" /></radialGradient>
        </defs>
        {/* astrocyte processes */}
        <path d="M0 230 C160 240 300 290 352 350 C380 390 360 440 300 460 C200 490 80 470 0 480 Z" fill="#2c2560" stroke="#9b8cff" strokeOpacity=".6" strokeWidth="2" />
        <path d="M1280 230 C1120 240 980 290 928 350 C900 390 920 440 980 460 C1080 490 1200 470 1280 480 Z" fill="#2c2560" stroke="#9b8cff" strokeOpacity=".6" strokeWidth="2" />
        {[[352, 360], [356, 410], [928, 360], [924, 410]].map(([x, y], i) => (
          <rect key={i} x={x - 9} y={y - 15} width="18" height="30" rx="9" fill={ab > 0.5 ? '#ff7a59' : '#b9a8ff'} opacity={0.9} />
        ))}
        {/* presynaptic bouton with vesicles */}
        <path d="M420 0 C420 200 500 312 640 312 C780 312 860 200 860 0 Z" fill="url(#sy-pre)" stroke="#5fd3c6" strokeWidth="2.5" />
        {[[640, 270], [580, 230], [700, 230], [640, 190], [540, 170], [740, 170], [600, 130], [690, 120]].map(([x, y], i) => {
          const pulse = i === 0 ? interpolate(f % 20, [0, 4, 10], [1, 0.82, 1], { extrapolateRight: 'clamp' }) : 1;
          return <g key={i} transform={`translate(${x} ${y}) scale(${pulse})`}><circle r="26" fill="#0a2430" stroke="#5fd3c6" strokeOpacity=".6" strokeWidth="2" />
            {[[-8, -6], [7, -3], [-2, 9], [10, 8], [-10, 6]].map(([a, b], k) => <circle key={k} cx={a} cy={b} r="3.5" fill="#ffd166" />)}</g>;
        })}
        {/* postsynaptic spine */}
        <path d="M430 720 C470 560 560 520 560 440 C560 400 600 380 640 380 C680 380 720 400 720 440 C720 520 810 560 850 720 Z" fill="url(#sy-post)" stroke="#8ff0c8" strokeWidth="2.5" />
        <ellipse cx="640" cy="470" rx="90" ry="60" fill="url(#sy-ca)" opacity={spine} />
        {[560, 600, 640, 680, 720].map((x) => <rect key={x} x={x - 9} y="372" width="18" height="22" rx="5" fill="#5fd3c6" opacity={0.6 + spine * 0.4} />)}
        {/* glutamate */}
        {parts.map((p, i) => {
          const age = f - p.t0;
          if (age < 0) return null;
          const life = interpolate(ab, [0, 1], [26, 120]);
          if (age > life) return null;
          const k = age / life;
          const x = 640 + p.dx * 70 * Math.min(1, age / 10) + (ab < 0.5 ? p.side * Math.max(0, age - 10) * 9 * p.sp : p.dx * age * 1.2);
          const y = 330 + p.dy * 40 * Math.min(1, age / 8) + (ab < 0.5 ? 0 : Math.sin(age / 6 + i) * 8);
          return <circle key={i} cx={x} cy={y} r="5" fill="#ffd166" opacity={1 - k * 0.6} />;
        })}
        {/* soluble β-amyloid near the transporters */}
        {[[300, 300], [330, 500], [980, 300], [950, 505], [260, 410], [1010, 410]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x + Math.sin(f / 20 + i) * 8} ${y + Math.cos(f / 25 + i) * 6}) rotate(${f + i * 40})`} opacity={ab}>
            <polygon points={hex(13)} fill="#ff7a59" /><polygon points={hex(13)} fill="#ff9a76" transform="translate(22 6)" />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
