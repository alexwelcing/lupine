import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import { AbsoluteFill, staticFile } from 'remotion';

interface OutroSceneProps {
  compact?: boolean;
  extended?: boolean;
}

export const OutroScene: React.FC<OutroSceneProps> = ({ compact, extended }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo animation
  const logoScale = spring({
    fps,
    frame: frame - 10,
    config: {
      damping: 12,
      mass: 0.8,
      stiffness: 80,
    },
  });

  // Text animations
  const textReveal = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const ctaReveal = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Button pulse
  const buttonPulse = interpolate(frame, [90, 120, 150], [1, 1.05, 1], {
    extrapolateRight: 'extend',
    easing: Easing.sin,
  });

  // Particle effect
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 1920,
    y: Math.random() * 1080,
    size: Math.random() * 3 + 1,
    speed: Math.random() * 2 + 0.5,
    delay: Math.random() * 60,
  }));

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #06080d 70%)',
        overflow: 'hidden',
      }}
    >
      {/* Animated particles */}
      {particles.map((p) => {
        const y = interpolate(
          frame,
          [p.delay, p.delay + 200],
          [p.y, p.y - 300],
          { extrapolateRight: 'extend' }
        );
        const opacity = interpolate(
          frame,
          [p.delay, p.delay + 30, p.delay + 170, p.delay + 200],
          [0, 1, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: p.x,
              top: y,
              width: p.size,
              height: p.size,
              background: '#00c8f0',
              borderRadius: '50%',
              opacity: opacity * 0.6,
              boxShadow: `0 0 ${p.size * 2}px #00c8f0`,
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 40,
        }}
      >
        <h1
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: '0.1em',
            margin: 0,
            background: 'linear-gradient(180deg, #ffffff 0%, #00c8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ATLAS
        </h1>
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 60,
            fontWeight: 300,
            letterSpacing: '0.3em',
            color: '#00c8f0',
            display: 'block',
            textAlign: 'center',
            marginTop: -10,
          }}
        >
          VIEW
        </span>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 28,
          color: '#8892a8',
          letterSpacing: '0.15em',
          marginBottom: 60,
          opacity: textReveal,
          transform: `translateY(${20 * (1 - textReveal)}px)`,
        }}
      >
        FREE. OPEN SOURCE. WEBGPU.
      </p>

      {/* CTA Button */}
      <div
        style={{
          opacity: ctaReveal,
          transform: `scale(${buttonPulse}) translateY(${30 * (1 - ctaReveal)}px)`,
        }}
      >
        <a
          href="https://github.com/atlas-sim/atlas-view"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 16,
            padding: '24px 48px',
            background: 'linear-gradient(135deg, #00c8f0 0%, #0088cc 100%)',
            borderRadius: 8,
            textDecoration: 'none',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 24,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '0.1em',
            boxShadow: '0 0 40px rgba(0, 200, 240, 0.4)',
          }}
        >
          <GitHubIcon />
          GET IT ON GITHUB
        </a>
      </div>

      {/* URL */}
      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 18,
          color: '#4a5368',
          marginTop: 40,
          opacity: ctaReveal,
          letterSpacing: '0.1em',
        }}
      >
        github.com/atlas-sim/atlas-view
      </p>

      {/* Corner decorations */}
      <CornerDecoration position="top-left" frame={frame} />
      <CornerDecoration position="top-right" frame={frame} />
      <CornerDecoration position="bottom-left" frame={frame} />
      <CornerDecoration position="bottom-right" frame={frame} />
    </AbsoluteFill>
  );
};

const GitHubIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const CornerDecoration: React.FC<{ position: string; frame: number }> = ({ position, frame }) => {
  const positions: Record<string, React.CSSProperties> = {
    'top-left': { top: 40, left: 40 },
    'top-right': { top: 40, right: 40 },
    'bottom-left': { bottom: 40, left: 40 },
    'bottom-right': { bottom: 40, right: 40 },
  };

  const opacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        width: 100,
        height: 100,
        ...positions[position],
        opacity,
      }}
    >
      <svg width="100" height="100" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`grad-${position}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00c8f0" stopOpacity="0" />
            <stop offset="100%" stopColor="#00c8f0" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d="M0 0 L40 0 L0 40 Z"
          fill={`url(#grad-${position})`}
          transform={
            position === 'top-right' ? 'rotate(90 50 50)' :
            position === 'bottom-right' ? 'rotate(180 50 50)' :
            position === 'bottom-left' ? 'rotate(270 50 50)' :
            ''
          }
        />
      </svg>
    </div>
  );
};
