import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';
import { AbsoluteFill } from 'remotion';

interface Achievement {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}

const achievements: Achievement[] = [
  {
    icon: '🎯',
    title: 'SPATIAL HASH HOVER',
    description: 'O(1) atom lookup at 60fps',
    color: '#00c8f0',
    delay: 0,
  },
  {
    icon: '📏',
    title: 'MEASUREMENT TOOLS',
    description: 'Distance, Angle & Dihedral',
    color: '#5de8a0',
    delay: 20,
  },
  {
    icon: '🎨',
    title: 'VELOCITY COLORING',
    description: 'Real-time dynamics visualization',
    color: '#f0b840',
    delay: 40,
  },
  {
    icon: '⚡',
    title: '4x MSAA RENDERING',
    description: 'Pixel-perfect sphere quality',
    color: '#ff6b6b',
    delay: 60,
  },
  {
    icon: '🎬',
    title: 'SMOOTH PLAYBACK',
    description: '1-120 FPS with frame scrubbing',
    color: '#c084fc',
    delay: 80,
  },
  {
    icon: '📦',
    title: 'DISTILLER PIPELINE',
    description: 'Research → Deploy in one command',
    color: '#f472b6',
    delay: 100,
  },
];

const AchievementCard: React.FC<{
  achievement: Achievement;
  frame: number;
  fps: number;
  index: number;
}> = ({ achievement, frame, fps, index }) => {
  const { icon, title, description, color, delay } = achievement;
  
  const progress = spring({
    fps,
    frame: frame - delay,
    config: { damping: 15, stiffness: 120 },
  });

  const glowPulse = interpolate(
    frame,
    [delay, delay + 30, delay + 60],
    [0.3, 1, 0.5],
    { extrapolateRight: 'extend', easing: Easing.sin }
  );

  const isUnlocked = frame > delay + 10;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '24px 32px',
        background: `linear-gradient(135deg, ${color}10 0%, transparent 100%)`,
        border: `1px solid ${isUnlocked ? color : '#333'}`,
        borderRadius: 12,
        opacity: progress,
        transform: `translateX(${100 * (1 - progress)}px)`,
        boxShadow: isUnlocked ? `0 0 ${30 * glowPulse}px ${color}30` : 'none',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          background: isUnlocked 
            ? `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`
            : '#333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          transform: isUnlocked ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.3s, background 0.3s',
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 18,
            fontWeight: 700,
            color: isUnlocked ? color : '#666',
            letterSpacing: '0.05em',
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            color: isUnlocked ? '#8892a8' : '#444',
          }}
        >
          {description}
        </div>
      </div>

      {/* Unlock indicator */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: isUnlocked ? color : 'transparent',
          border: `2px solid ${isUnlocked ? color : '#333'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isUnlocked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </div>
  );
};

export const AchievementScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleReveal = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #0c1220 0%, #06080d 70%)',
        padding: 60,
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 40,
          opacity: titleReveal,
          transform: `translateY(${30 * (1 - titleReveal)}px)`,
        }}
      >
        <div
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            color: '#00c8f0',
            letterSpacing: '0.3em',
            marginBottom: 16,
          }}
        >
          MAJOR MILESTONES UNLOCKED
        </div>
        <h2
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 56,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          FEATURES SHIPPED
        </h2>
      </div>

      {/* Achievement grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
          maxWidth: 1200,
        }}
      >
        {achievements.map((achievement, index) => (
          <AchievementCard
            key={achievement.title}
            achievement={achievement}
            frame={frame}
            fps={fps}
            index={index}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 400,
          height: 4,
          background: '#333',
          borderRadius: 2,
          marginTop: 40,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (frame / 120) * 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00c8f0, #5de8a0)',
            borderRadius: 2,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Counter */}
      <div
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 14,
          color: '#8892a8',
          marginTop: 16,
          opacity: interpolate(frame, [20, 40], [0, 1]),
        }}
      >
        {Math.min(6, Math.floor(frame / 20))} / 6 UNLOCKED
      </div>

      {/* Decorative particles */}
      {Array.from({ length: 30 }, (_, i) => {
        const x = (i % 6) * 320 + 160;
        const y = Math.floor(i / 6) * 180 + 90;
        const delay = i * 5;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: achievements[Math.floor(i / 5)]?.color || '#00c8f0',
              opacity: interpolate(
                frame,
                [delay, delay + 20, delay + 40],
                [0, 0.6, 0]
              ),
              transform: `scale(${interpolate(
                frame,
                [delay, delay + 20],
                [0, 1]
              )})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
