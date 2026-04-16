import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring, random } from 'remotion';
import { AbsoluteFill } from 'remotion';

interface IntroSceneProps {
  compact?: boolean;
  extended?: boolean;
}

export const IntroScene: React.FC<IntroSceneProps> = ({ compact, extended }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Animation timings
  const logoReveal = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const subtitleReveal = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const taglineReveal = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const glowPulse = interpolate(frame, [0, 60], [0.5, 1], {
    extrapolateRight: 'extend',
    easing: Easing.sin,
  });

  // Spring animation for logo
  const logoScale = spring({
    fps,
    frame,
    config: {
      damping: 10,
      mass: 0.5,
      stiffness: 100,
    },
  });

  // Generate particles for explosion effect
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: 960 + (random(`px-${i}`) - 0.5) * 400,
    y: 540 + (random(`py-${i}`) - 0.5) * 200,
    size: random(`ps-${i}`) * 4 + 1,
    speed: random(`pspeed-${i}`) * 3 + 1,
    angle: random(`pangle-${i}`) * Math.PI * 2,
    delay: Math.floor(random(`pdelay-${i}`) * 20),
    color: random(`pcolor-${i}`) > 0.5 ? '#00c8f0' : '#5de8a0',
  }));

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #0c1220 0%, #06080d 70%)',
        overflow: 'hidden',
      }}
    >
      {/* Animated grid background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 200, 240, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 200, 240, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          transform: `perspective(500px) rotateX(60deg) translateY(${frame * 0.5}px)`,
          opacity: 0.3,
        }}
      />

      {/* Particle explosion effect */}
      {particles.map((p) => {
        const particleFrame = frame - p.delay;
        if (particleFrame < 0) return null;

        const distance = particleFrame * p.speed * 5;
        const x = p.x + Math.cos(p.angle) * distance;
        const y = p.y + Math.sin(p.angle) * distance;
        const opacity = interpolate(
          particleFrame,
          [0, 30, 60],
          [1, 0.6, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: p.color,
              opacity,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        );
      })}

      {/* Central glow burst */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(0, 200, 240, ${interpolate(frame, [0, 30, 60], [0.3, 0.1, 0])}) 0%, transparent 70%)`,
          transform: `scale(${interpolate(frame, [0, 60], [0.5, 2])})`,
          pointerEvents: 'none',
        }}
      />

      {/* Logo container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `scale(${logoScale})`,
          opacity: logoReveal,
          zIndex: 10,
        }}
      >
        {/* ATLAS text */}
        <h1
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 180,
            fontWeight: 700,
            letterSpacing: '0.1em',
            margin: 0,
            background: 'linear-gradient(180deg, #ffffff 0%, #00c8f0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: `0 0 ${60 * glowPulse}px rgba(0, 200, 240, 0.5)`,
            position: 'relative',
          }}
        >
          ATLAS
          {/* Glow behind text */}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, #ffffff 0%, #00c8f0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: `blur(${20 * glowPulse}px)`,
              opacity: 0.5,
            }}
          >
            ATLAS
          </span>
        </h1>

        {/* view text */}
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 100,
            fontWeight: 300,
            letterSpacing: '0.3em',
            color: '#00c8f0',
            marginTop: -20,
            opacity: subtitleReveal,
            transform: `translateY(${20 * (1 - subtitleReveal)}px)`,
            textShadow: `0 0 30px rgba(0, 200, 240, 0.5)`,
          }}
        >
          VIEW
        </span>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 24,
          color: '#8892a8',
          letterSpacing: '0.2em',
          marginTop: 60,
          opacity: taglineReveal,
          transform: `translateY(${30 * (1 - taglineReveal)}px)`,
          zIndex: 10,
        }}
      >
        NEXT-GEN MOLECULAR DYNAMICS VISUALIZATION
      </p>

      {/* Feature badges */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          display: 'flex',
          gap: 20,
          opacity: taglineReveal,
          zIndex: 10,
        }}
      >
        {['WEBGPU', '60FPS', 'OPEN SOURCE'].map((text, i) => (
          <span
            key={text}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              color: '#00c8f0',
              padding: '8px 16px',
              border: '1px solid rgba(0, 200, 240, 0.3)',
              borderRadius: 4,
              opacity: interpolate(frame, [70 + i * 10, 90 + i * 10], [0, 1]),
              background: 'rgba(0, 200, 240, 0.05)',
            }}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Corner accents */}
      <CornerAccent position="top-left" frame={frame} />
      <CornerAccent position="top-right" frame={frame} />
      <CornerAccent position="bottom-left" frame={frame} />
      <CornerAccent position="bottom-right" frame={frame} />

      {/* Scanlines overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          )`,
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </AbsoluteFill>
  );
};

const CornerAccent: React.FC<{ position: string; frame: number }> = ({ position, frame }) => {
  const positions: Record<string, React.CSSProperties> = {
    'top-left': { top: 40, left: 40 },
    'top-right': { top: 40, right: 40, transform: 'rotate(90deg)' },
    'bottom-left': { bottom: 40, left: 40, transform: 'rotate(-90deg)' },
    'bottom-right': { bottom: 40, right: 40, transform: 'rotate(180deg)' },
  };

  const opacity = interpolate(frame, [0, 30], [0, 1]);
  const glowIntensity = interpolate(frame, [0, 60, 120], [0.3, 1, 0.5], {
    extrapolateRight: 'extend',
    easing: Easing.sin,
  });

  return (
    <svg
      width={80}
      height={80}
      viewBox="0 0 60 60"
      style={{
        position: 'absolute',
        ...positions[position],
        opacity,
        filter: `drop-shadow(0 0 ${10 * glowIntensity}px rgba(0, 200, 240, 0.5))`,
      }}
    >
      <path
        d="M0 0 L0 30 M0 0 L30 0"
        stroke="#00c8f0"
        strokeWidth="2"
        fill="none"
      />
      <circle cx="5" cy="5" r="2" fill="#00c8f0" opacity={0.5} />
    </svg>
  );
};
