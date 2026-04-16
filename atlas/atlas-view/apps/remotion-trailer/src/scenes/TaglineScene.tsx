import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const TaglineScene: React.FC = () => {
  const frame = useCurrentFrame();

  const textReveal = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const lineExpand = interpolate(frame, [10, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #06080d 0%, #0c1220 100%)',
      }}
    >
      {/* Main tagline */}
      <h2
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 72,
          fontWeight: 700,
          textAlign: 'center',
          color: '#fff',
          letterSpacing: '0.05em',
          margin: 0,
          opacity: textReveal,
          transform: `translateY(${30 * (1 - textReveal)}px)`,
        }}
      >
        VISUALIZE THE INVISIBLE
      </h2>

      {/* Decorative line */}
      <div
        style={{
          width: 600 * lineExpand,
          height: 2,
          background: 'linear-gradient(90deg, transparent, #00c8f0, transparent)',
          margin: '40px 0',
        }}
      />

      {/* Sub-taglines */}
      <div
        style={{
          display: 'flex',
          gap: 60,
          opacity: interpolate(frame, [20, 50], [0, 1]),
        }}
      >
        {['MOLECULAR DYNAMICS', 'QUANTUM SIMULATIONS', 'MATERIALS SCIENCE'].map((text, i) => (
          <span
            key={text}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 16,
              color: '#00c8f0',
              letterSpacing: '0.2em',
              opacity: interpolate(frame, [30 + i * 5, 50 + i * 5], [0, 1]),
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
