/** The four research themes as tiles: two-photon (real recording), glymphatic (illustration), IHC (published data), ephys (illustrative fEPSP). */
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

// illustrative fEPSP (same shape as src/lib/fepsp.ts on the website)
const fepsp = (t: number, amp: number) => {
  let v = 0; const a = t - 2;
  if (a >= 0 && a < 0.4) v += 2.2 * Math.sin((a / 0.4) * Math.PI * 2) * Math.exp(-a * 4);
  const f = (t - 3.4) / 0.35; v += 0.22 * (0.15 * Math.exp(-((f + 1.4) ** 2)) - Math.exp(-(f ** 2)) + 0.1 * Math.exp(-((f - 1.6) ** 2)));
  const u = (t - 4.6) / 3.2; if (u > 0) v -= amp * u * Math.exp(1 - u);
  return v;
};
const trace = (amp: number, p: number) => Array.from({ length: 200 }, (_, i) => i).filter((i) => i / 199 <= p)
  .map((i) => `${i ? 'L' : 'M'}${(20 + (i / 199) * 340).toFixed(1)} ${(80 - fepsp((i / 199) * 20, amp) * 55).toFixed(1)}`).join(' ');

const Tile: React.FC<{ i: number; color: string; title: string; labels: boolean; children: React.ReactNode }> = ({ i, color, title, labels, children }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f - 6 - i * 7, fps, config: { damping: 16 } });
  return (
    <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#03080b', boxShadow: `0 0 0 1.5px ${color}66, 0 24px 60px rgba(0,0,0,.5)`, opacity: s, transform: `translateY(${(1 - s) * 40}px) scale(${0.92 + 0.08 * s})` }}>
      {children}
      {labels && <div style={{ position: 'absolute', left: 16, bottom: 14, font: '600 20px Inter, system-ui', color: '#fff', textShadow: '0 2px 10px #000', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: color }} />{title}</div>}
    </div>
  );
};

export const Methods: React.FC<{ labels: boolean }> = ({ labels }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [20, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glow = (t: number) => Math.max(0, Math.min(1, (f - 20 - t) / 50));
  return (
    <AbsoluteFill style={{ padding: labels ? '60px 80px 210px' : '60px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 22 }}>
      <Tile i={0} color="#3ddc84" title="Two-photon imaging" labels={labels}>
        <OffthreadVideo src={staticFile('media/bl6.mp4')} muted startFrom={200} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </Tile>
      <Tile i={1} color="#ff5fd2" title="Glymphatic system" labels={labels}>
        <svg viewBox="0 0 400 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="400" height="220" fill="#08070d" />
          {/* dorsal view of the brain: two hemispheres; tracer spreads along the arteries from the sides */}
          <ellipse cx="128" cy="118" rx="66" ry="88" fill="#171126" stroke="#3b2f55" />
          <ellipse cx="272" cy="118" rx="66" ry="88" fill="#171126" stroke="#3b2f55" />
          {[-1, 1].map((sx) => (
            <g key={sx}>
              <path d={`M${200 + sx * 132} 132 C${200 + sx * 110} 120 ${200 + sx * 90} 112 ${200 + sx * 70} 92 S${200 + sx * 40} 50 ${200 + sx * 20} 40`} stroke="#ff5fd2" strokeWidth="3" fill="none" strokeDasharray="220" strokeDashoffset={220 * (1 - glow(0))} />
              <path d={`M${200 + sx * 90} 112 C${200 + sx * 80} 140 ${200 + sx * 60} 165 ${200 + sx * 30} 190`} stroke="#ff5fd2" strokeWidth="2.2" fill="none" strokeDasharray="160" strokeDashoffset={160 * (1 - glow(14))} />
              <path d={`M${200 + sx * 110} 120 C${200 + sx * 108} 90 ${200 + sx * 100} 60 ${200 + sx * 84} 40`} stroke="#ff5fd2" strokeWidth="2" fill="none" strokeDasharray="120" strokeDashoffset={120 * (1 - glow(24))} />
              <ellipse cx={200 + sx * 80} cy="112" rx="58" ry="72" fill="#ff5fd2" opacity={glow(34) * 0.3} style={{ filter: 'blur(16px)' }} />
            </g>
          ))}
        </svg>
      </Tile>
      <Tile i={2} color="#4a8dff" title="Immunohistochemistry" labels={labels}>
        <Img src={staticFile('media/ihc.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + p * 0.1})` }} />
      </Tile>
      <Tile i={3} color="#ff6b5a" title="Electrophysiology" labels={labels}>
        <svg viewBox="0 0 380 160" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ background: 'radial-gradient(90% 80% at 40% 30%, #1a0f12, #07090c)' }}>
          <path d={trace(1, p)} stroke="#8b98a0" strokeWidth="2.2" fill="none" />
          <path d={trace(1.55, Math.max(0, p * 1.2 - 0.2))} stroke="#ff6b5a" strokeWidth="2.6" fill="none" />
        </svg>
      </Tile>
    </AbsoluteFill>
  );
};
