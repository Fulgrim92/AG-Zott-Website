/**
 * Motion-graphics summary of the website. Scenes: title → Allen atlas brain (Blender Cycles plate) →
 * CA1 neurons firing (Three.js, illustrative) → real two-photon recording (lab data) → synapse mechanism
 * (illustrative, Zott et al. 2019) → the four methods → funders. `captions: false` gives a text-free loop
 * for the homepage background.
 */
import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { Neurons } from './Neurons';
import { Synapse } from './Synapse';
import { Methods } from './Methods';

export const SUMMARY_FRAMES = 900;
const FADE = 18;
const C = { bg: '#02080a', glow: '#5fd3c6', green: '#4dff9a', text: '#e8f4f2', dim: '#8fb3bb' };
const serif = '"Fraunces", Georgia, serif';
const mono = '"JetBrains Mono", ui-monospace, monospace';
const sans = '"Inter", system-ui, sans-serif';

type Scene = { id: string; from: number; dur: number; el: React.ReactNode; kicker?: string; text?: string; tag?: string };

const Fade: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, FADE, dur - FADE, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Caption: React.FC<{ kicker: string; text: string; tag?: string; dur: number }> = ({ kicker, text, tag, dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f - 8, fps, config: { damping: 200 } });
  const out = interpolate(f, [dur - FADE - 6, dur - 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 72, bottom: 64, maxWidth: 760, opacity: s * out, transform: `translateY(${(1 - s) * 24}px)` }}>
      <div style={{ font: `600 18px ${sans}`, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.glow, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 36, height: 2, background: C.glow, display: 'inline-block' }} />{kicker}
      </div>
      <div style={{ font: `400 46px/1.15 ${serif}`, color: C.text, textShadow: '0 2px 24px rgba(0,0,0,.8)' }}>{text}</div>
      {tag && <div style={{ marginTop: 16, font: `500 14px ${mono}`, letterSpacing: '0.08em', color: C.dim, textTransform: 'uppercase' }}>{tag}</div>}
    </div>
  );
};

const Dust: React.FC = () => {
  const f = useCurrentFrame();
  const pts = React.useMemo(() => {
    let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 70 }, () => ({ x: r() * 1280, y: r() * 720, v: 0.1 + r() * 0.3, a: 0.08 + r() * 0.2, z: 1 + r() * 2 }));
  }, []);
  return (
    <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
      {pts.map((p, i) => <circle key={i} cx={(p.x + f * p.v) % 1280} cy={p.y - Math.sin(f / 60 + i) * 6} r={p.z} fill={C.glow} opacity={p.a} />)}
    </svg>
  );
};

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 18, mass: 0.8 } });
  const flash = interpolate(f % 60, [0, 4, 24], [0.3, 1, 0.3], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 22 }}>
      <svg viewBox="0 0 40 40" width={120} height={120} style={{ transform: `scale(${0.6 + 0.4 * s})`, opacity: s, overflow: 'visible' }}>
        <path d="M33.6 9.2 A18 18 0 1 1 25.4 2.8" stroke={C.glow} strokeWidth="1.2" fill="none" opacity=".6" strokeDasharray="120" strokeDashoffset={120 * (1 - s)} />
        <g stroke={C.glow} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M20 24.8 V11.5 M20 15 L14.6 9.4 M20 12.6 L25.2 7 M14.6 9.4 L12.4 6 M25.2 7 L27.8 4.8 M20 19 L25.4 16.2 M16.2 29.6 L12.2 33.4 M23.8 29.6 L27.8 33.4" />
        </g>
        <path d="M20 23.6 L15.4 30 Q20 31.6 24.6 30 Z" fill={C.glow} />
        <circle cx="20" cy="27.6" r="6" fill={C.green} opacity={flash * 0.7} style={{ filter: 'blur(2px)' }} />
      </svg>
      <div style={{ font: `400 84px ${serif}`, color: C.text, opacity: s, letterSpacing: '-0.01em' }}>AG Zott</div>
      <div style={{ font: `400 26px ${sans}`, color: C.dim, opacity: interpolate(f, [20, 40], [0, 1], { extrapolateRight: 'clamp' }) }}>
        How Alzheimer’s disease begins in hippocampal circuits
      </div>
    </AbsoluteFill>
  );
};

const Brain: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const i = Math.min(150, Math.max(1, Math.round(1 + (f / dur) * 149)));
  const z = interpolate(f, [0, dur], [1.04, 1.14], { easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ transform: `scale(${z})` }}>
      <Img src={staticFile(`plates/brain/f${String(i).padStart(4, '0')}.png`)} style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 18px rgba(77,255,154,.25))' }} />
    </AbsoluteFill>
  );
};

const Recording: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], [1.0, 1.12]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 760, height: 693, transform: `scale(${z})`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(95,211,198,.25)' }}>
        <OffthreadVideo src={staticFile('media/bl6.mp4')} muted startFrom={60} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.15) brightness(1.1)' }} />
      </div>
    </AbsoluteFill>
  );
};

const Funding: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [6, 26], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 34 }}>
      <div style={{ font: `600 18px ${sans}`, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.glow, opacity: o }}>Funded by</div>
      <div style={{ display: 'flex', gap: 34, alignItems: 'center', opacity: o, transform: `translateY(${(1 - o) * 20}px)` }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '18px 26px' }}><Img src={staticFile('media/erc.png')} style={{ height: 150 }} /></div>
        <div style={{ background: '#fff', borderRadius: 18, padding: '34px 30px' }}><Img src={staticFile('media/dfg.png')} style={{ height: 70 }} /></div>
      </div>
    </AbsoluteFill>
  );
};

export const Summary: React.FC<{ captions: boolean }> = ({ captions }) => {
  const scenes: Scene[] = captions
    ? [
        { id: 'title', from: 0, dur: 100, el: <Title /> },
        { id: 'brain', from: 85, dur: 165, el: <Brain dur={165} />, kicker: 'Where we look', text: 'The hippocampus, deep inside the mouse brain', tag: 'Allen Mouse Brain Atlas · CCFv3' },
        { id: 'neurons', from: 235, dur: 160, el: <Neurons />, kicker: 'What we measure', text: 'Hundreds of CA1 neurons, each flashing when it fires', tag: 'Illustration' },
        { id: 'rec', from: 380, dur: 140, el: <Recording dur={140} />, kicker: 'Real data', text: 'A two-photon recording from our lab', tag: 'Lab data · CA1, living mouse' },
        { id: 'syn', from: 505, dur: 165, el: <Synapse />, kicker: 'The mechanism', text: 'β-amyloid blocks glutamate clearance and drives hyperactivity', tag: 'Illustration · after Zott et al., Science 2019' },
        { id: 'methods', from: 655, dur: 160, el: <Methods labels />, kicker: 'Four windows on one circuit', text: 'From synapses to circuits, from mouse to human' },
        { id: 'fund', from: 800, dur: 100, el: <Funding /> },
      ]
    : [
        { id: 'brain', from: 0, dur: 180, el: <Brain dur={180} /> },
        { id: 'neurons', from: 165, dur: 190, el: <Neurons /> },
        { id: 'rec', from: 340, dur: 160, el: <Recording dur={160} /> },
        { id: 'syn', from: 485, dur: 190, el: <Synapse /> },
        { id: 'methods', from: 660, dur: 160, el: <Methods labels={false} /> },
        { id: 'neurons2', from: 805, dur: 95, el: <Neurons seed={3} /> },
      ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(90% 80% at 50% 40%, #0b2a31, ${C.bg})` }}>
      <Dust />
      {scenes.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
          <Fade dur={s.dur}>
            {s.el}
            {captions && s.kicker && s.text && (
              <>
                <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(2,8,10,.85), transparent 45%)' }} />
                <Caption kicker={s.kicker} text={s.text} tag={s.tag} dur={s.dur} />
              </>
            )}
          </Fade>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
