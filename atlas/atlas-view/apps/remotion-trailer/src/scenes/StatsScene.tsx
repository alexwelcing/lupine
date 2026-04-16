import { useCurrentFrame, interpolate, Easing, spring } from 'remotion';
import { useVideoConfig } from 'remotion';
import { AbsoluteFill } from 'remotion';

interface StatItemProps {
  value: string;
  label: string;
  delay: number;
  frame: number;
  fps: number;
}

const StatItem: React.FC<StatItemProps> = ({ value, label, delay, frame, fps }) => {
  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 12, stiffness: 100 },
  });

  const count = Math.floor(parseInt(value) * progress);
  const displayValue = value.includes('K') 
    ? `${count}K` 
    : value.includes('fps') 
    ? `${count}fps` 
    : `${count}x`;

  return (
    <div
      style={{
        textAlign: 'center',
        opacity: interpolate(frame, [delay, delay + 20], [0, 1]),
        transform: `translateY(${50 * (1 - progress)}px)`,
      }}
    >
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 120,
          fontWeight: 700,
          color: '#00c8f0',
          textShadow: '0 0 40px rgba(0, 200, 240, 0.5)',
        }}
      >
        {displayValue}
      </div>
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 20,
          color: '#8892a8',
          letterSpacing: '0.1em',
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleReveal = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const stats = [
    { value: '100', label: 'THOUSAND ATOMS', delay: 10 },
    { value: '60', label: 'FRAMES PER SECOND', delay: 25 },
    { value: '10', label: 'TIMES FASTER', delay: 40 },
  ];

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#06080d',
      }}
    >
      {/* Title */}
      <h3
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 32,
          color: '#8892a8',
          letterSpacing: '0.2em',
          marginBottom: 60,
          opacity: titleReveal,
        }}
      >
        PERFORMANCE
      </h3>

      {/* Stats grid */}
      <div
        style={{
          display: 'flex',
          gap: 100,
        }}
      >
        {stats.map((stat) => (
          <StatItem
            key={stat.label}
            value={stat.value}
            label={stat.label}
            delay={stat.delay}
            frame={frame}
            fps={fps}
          />
        ))}
      </div>

      {/* Comparison text */}
      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 16,
          color: '#4a5368',
          marginTop: 80,
          opacity: interpolate(frame, [60, 80], [0, 1]),
        }}
      >
        VERSUS TRADITIONAL CPU RENDERERS
      </p>
    </AbsoluteFill>
  );
};
