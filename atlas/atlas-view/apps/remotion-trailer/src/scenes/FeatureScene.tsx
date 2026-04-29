import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { AbsoluteFill, Video, Img, staticFile } from 'remotion';

interface FeatureSceneProps {
  title: string;
  subtitle: string;
  icon: 'gpu' | 'measure' | 'bonds' | 'playback';
  accentColor: string;
  recording: string; // Screen recording filename or sequence folder name
  recordingFrames?: number; // Total frames if testing an image sequence
  compact?: boolean;
  extended?: boolean;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  title,
  subtitle,
  icon,
  accentColor,
  recording,
  recordingFrames = 300,
  compact,
  extended,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Title animation
  const titleProgress = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Recording container animation
  const videoScale = interpolate(frame, [10, 40], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const videoOpacity = interpolate(frame, [10, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow effect
  const glowIntensity = interpolate(frame, [0, 30, 60], [0, 1, 0.5], {
    extrapolateRight: 'extend',
    easing: Easing.sin,
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
      {/* Title section */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          textAlign: 'center',
          transform: `translateY(${50 * (1 - titleProgress)}px)`,
          opacity: titleProgress,
        }}
      >
        <h2
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: accentColor,
            margin: 0,
            textShadow: `0 0 ${40 * glowIntensity}px ${accentColor}80`,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 28,
            color: '#8892a8',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Screen recording container */}
      <div
        style={{
          width: 1400,
          height: 788,
          marginTop: 100,
          borderRadius: 16,
          overflow: 'hidden',
          border: `2px solid ${accentColor}40`,
          boxShadow: `
            0 0 ${60 * glowIntensity}px ${accentColor}30,
            inset 0 0 100px rgba(0,0,0,0.5)
          `,
          transform: `scale(${videoScale})`,
          opacity: videoOpacity,
        }}
      >
        {/* Screen recording */}
        {recording.endsWith('.mp4') ? (
          <Video
            src={staticFile(`recordings/${recording}`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <Img
            src={staticFile(`recordings/${recording}/frame_${String(frame % recordingFrames).padStart(4, '0')}.png`)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              180deg,
              transparent 70%,
              ${accentColor}10 100%
            )`,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Feature icon */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          opacity: interpolate(frame, [30, 50], [0, 1]),
        }}
      >
        <FeatureIcon type={icon} color={accentColor} />
      </div>

      {/* Decorative lines */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: '50%',
          width: 2,
          height: 200,
          background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
          transform: 'translateY(-50%)',
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: '50%',
          width: 2,
          height: 200,
          background: `linear-gradient(180deg, transparent, ${accentColor}, transparent)`,
          transform: 'translateY(-50%)',
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};

const FeatureIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const icons: Record<string, React.ReactNode> = {
    gpu: (
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 8h8v8H8z" />
        <path d="M8 2v2M16 2v2M8 20v2M16 20v2M2 8h2M2 16h2M20 8h2M20 16h2" />
      </svg>
    ),
    measure: (
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M3 6h18M3 12h18M3 18h18" />
        <path d="M8 6v12M16 6v12" />
      </svg>
    ),
    bonds: (
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 9v6M9 6h6M15 18h6M18 15V9" />
      </svg>
    ),
    playback: (
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  };

  return (
    <div
      style={{
        padding: 24,
        border: `2px solid ${color}40`,
        borderRadius: 16,
        background: `${color}10`,
      }}
    >
      {icons[type] || icons.gpu}
    </div>
  );
};
