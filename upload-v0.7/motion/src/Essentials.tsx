import React from "react";
import { AbsoluteFill, Easing, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Lang, STRINGS } from "./strings";

export const FPS = 30;
// Beat start frames: breathe, 112, water, cut, evacuate, guide; ends at TOTAL (18 s).
const BEATS = [0, 75, 180, 285, 390, 480];
export const TOTAL = 540;

const NAVY = "#0b1e33";
const NAVY_2 = "#14385f";
const WATER = "#2f7fd1";
const CALM = "#3fb6a8";
const WHITE = "#f8fafc";
const ACCENT = "#ffb020";
const RED = "#ff5a4f";
const FONT = "'Inter', 'Helvetica Neue', 'DejaVu Sans', Arial, sans-serif";

// Water line: rises in the first beat, moves gently, then settles and recedes at the end.
const Water: React.FC = () => {
  const frame = useCurrentFrame();
  const level = interpolate(frame, [0, 60, 420, TOTAL], [0.0, 0.26, 0.23, 0.08], {
    extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic),
  });
  const calm = interpolate(frame, [420, TOTAL], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const amp = interpolate(frame, [0, 60, 420, TOTAL], [6, 22, 14, 4], { extrapolateRight: "clamp" });
  const wave = (phase: number, a: number) => {
    const y0 = 1280 * (1 - level);
    let d = `M 0 ${y0}`;
    for (let x = 0; x <= 720; x += 24) {
      d += ` L ${x} ${y0 + Math.sin(x / 90 + frame / 14 + phase) * a}`;
    }
    return d + " L 720 1280 L 0 1280 Z";
  };
  const color = calm > 0.5 ? CALM : WATER;
  return (
    <svg width={720} height={1280} style={{ position: "absolute", inset: 0 }}>
      <path d={wave(1.7, amp * 0.7)} fill={color} opacity={0.35} />
      <path d={wave(0, amp)} fill={color} opacity={0.55} />
    </svg>
  );
};

// One beat: fades in and out, title lines spring up.
const Beat: React.FC<{ lines: [string, string]; icon: React.ReactNode; length: number; big?: boolean }> = ({
  lines, icon, length, big,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, length - 8, length], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const rise = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.6 } });
  return (
    <AbsoluteFill style={{ opacity, alignItems: "center", justifyContent: "center", padding: 56, gap: 40 }}>
      <div style={{ transform: `scale(${0.7 + 0.3 * rise(0)})` }}>{icon}</div>
      <div style={{ textAlign: "center", fontFamily: FONT, color: WHITE }}>
        <div style={{ fontSize: 52, fontWeight: 600, opacity: 0.92, transform: `translateY(${(1 - rise(4)) * 40}px)` }}>
          {lines[0]}
        </div>
        <div style={{
          fontSize: big ? 96 : 60, fontWeight: 800, lineHeight: 1.1, marginTop: 10,
          transform: `translateY(${(1 - rise(9)) * 50}px)`, opacity: rise(9),
        }}>
          {lines[1]}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---- Icons (inline SVG: no fonts or emoji needed) ----
const Breathe: React.FC = () => {
  const frame = useCurrentFrame();
  const s = 1 + 0.12 * Math.sin(frame / 12);
  return (
    <svg width={220} height={220} viewBox="-110 -110 220 220">
      <circle r={90 * s} fill="none" stroke={WHITE} strokeOpacity={0.25} strokeWidth={6} />
      <circle r={62 * s} fill="none" stroke={WHITE} strokeOpacity={0.5} strokeWidth={6} />
      <circle r={34 * s} fill={WHITE} fillOpacity={0.9} />
    </svg>
  );
};

const Call: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = (frame % 30) / 30;
  return (
    <svg width={260} height={260} viewBox="-130 -130 260 260">
      <circle r={70 + pulse * 55} fill="none" stroke={RED} strokeWidth={6} opacity={1 - pulse} />
      <circle r={88} fill={RED} />
      {/* phone handset */}
      <path d="M -34 -40 q -10 10 0 30 q 18 36 54 54 q 20 10 30 0 l 10 -12 l -24 -20 l -14 10 q -22 -10 -34 -34 l 10 -14 l -20 -24 z"
        fill={WHITE} transform="translate(-4 -2)" />
    </svg>
  );
};

const AwayFromWater: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = Math.sin(frame / 8) * 8;
  const arrow = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width={300} height={220} viewBox="0 0 300 220">
      {[150, 178, 206].map((y, i) => (
        <path key={y} d={`M ${10 + shift * (i % 2 ? -1 : 1)} ${y - 40} q 30 -18 60 0 t 60 0 t 60 0`}
          fill="none" stroke={WATER} strokeWidth={10} strokeLinecap="round" />
      ))}
      <g opacity={arrow} transform={`translate(${190 + arrow * 30} 70)`}>
        <path d="M 0 40 L 60 -10" stroke={ACCENT} strokeWidth={14} strokeLinecap="round" />
        <path d="M 30 -16 L 64 -14 L 58 18" fill="none" stroke={ACCENT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
};

const CutUtilities: React.FC = () => {
  const frame = useCurrentFrame();
  const off = (i: number) => interpolate(frame, [18 + i * 14, 30 + i * 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const icons = [
    // gas flame
    <path key="g" d="M 0 -42 q 30 30 22 52 a 22 22 0 0 1 -44 0 q -4 -22 22 -52 z" fill={ACCENT} />,
    // electricity bolt
    <path key="e" d="M 8 -46 L -24 6 L -2 6 L -10 46 L 24 -8 L 2 -8 z" fill={ACCENT} />,
    // water drop
    <path key="w" d="M 0 -44 q 34 40 26 62 a 27 27 0 0 1 -52 0 q -8 -22 26 -62 z" fill={WATER} />,
  ];
  return (
    <svg width={520} height={160} viewBox="-260 -80 520 160">
      {icons.map((icon, i) => (
        <g key={i} transform={`translate(${(i - 1) * 170} 0)`}>
          <circle r={66} fill="none" stroke={WHITE} strokeOpacity={0.35} strokeWidth={5} />
          <g opacity={1 - 0.55 * off(i)}>{icon}</g>
          <line x1={-46} y1={-46} x2={-46 + 92 * off(i)} y2={-46 + 92 * off(i)} stroke={WHITE} strokeWidth={10} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
};

const Evacuate: React.FC = () => {
  const frame = useCurrentFrame();
  const walk = interpolate(frame, [0, 90], [-30, 40]);
  const person = (x: number, s: number) => (
    <g transform={`translate(${x} 0) scale(${s})`}>
      <circle cx={0} cy={-62} r={18} fill={WHITE} />
      <path d="M 0 -40 L 0 20 M 0 -20 L -26 4 M 0 -20 L 26 -2 M 0 20 L -20 64 M 0 20 L 22 64"
        stroke={WHITE} strokeWidth={12} strokeLinecap="round" fill="none" />
    </g>
  );
  return (
    <svg width={420} height={200} viewBox="-210 -100 420 200">
      <g transform={`translate(${walk} 0)`}>
        {person(-80, 1)}
        {person(-10, 0.8)}
      </g>
      <path d="M 90 0 L 170 0 M 140 -28 L 172 0 L 140 28" stroke={ACCENT} strokeWidth={14}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
};

const Guide: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width={220} height={220} viewBox="-110 -110 220 220">
      <circle r={86} fill={CALM} />
      <path d="M -40 2 L -10 32 L 44 -28" fill="none" stroke={WHITE} strokeWidth={16} strokeLinecap="round"
        strokeLinejoin="round" strokeDasharray={160} strokeDashoffset={160 * (1 - draw)} />
    </svg>
  );
};

export const Essentials: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const t = STRINGS[lang] ?? STRINGS.en!;
  const len = (i: number) => (BEATS[i + 1] ?? TOTAL) - BEATS[i];
  const beats: Array<[[string, string], React.ReactNode, boolean?]> = [
    [t.breathe, <Breathe />],
    [t.call, <Call />, true],
    [t.water, <AwayFromWater />],
    [t.cut, <CutUtilities />],
    [t.evacuate, <Evacuate />],
    [t.guide, <Guide />],
  ];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_2} 100%)` }}>
      <Water />
      {beats.map(([lines, icon, big], i) => (
        <Sequence key={i} from={BEATS[i]} durationInFrames={len(i)}>
          <Beat lines={lines} icon={icon} length={len(i)} big={big} />
        </Sequence>
      ))}
      {/* Progress bar: shows it is short */}
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 92, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.18)" }}>
        <div style={{ width: `${(frame / TOTAL) * 100}%`, height: "100%", borderRadius: 4, background: WHITE }} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: FONT, fontSize: 22, color: WHITE, opacity: 0.7 }}>
        {t.source}
      </div>
    </AbsoluteFill>
  );
};
