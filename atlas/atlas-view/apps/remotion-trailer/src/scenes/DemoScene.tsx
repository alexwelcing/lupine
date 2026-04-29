import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';
import { AbsoluteFill, Video, staticFile, Img } from 'remotion';

interface DemoSceneProps {
  compact?: boolean;
  extended?: boolean;
}

export const DemoScene: React.FC<DemoSceneProps> = ({ compact, extended }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Split screen animations
  const leftPanelX = interpolate(frame, [0, 20], [-500, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const rightPanelX = interpolate(frame, [0, 20], [500, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const centerScale = interpolate(frame, [10, 40], [0.8, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  // Text reveal
  const textReveal = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: '#06080d',
        overflow: 'hidden',
      }}
    >
      {/* Split screen layout */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          gap: 20,
          padding: 40,
        }}
      >
        {/* Left panel: Crack propagation demo */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${leftPanelX}px)`,
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          <DemoPanel
            title="CRACK ANALYSIS"
            recording="crack-demo"
            recordingFrames={15}
            accent="#f0b840"
            delay={0}
          />
        </div>

        {/* Center panel: Velocity coloring showcase */}
        <div
          style={{
            flex: 1.5,
            transform: `scale(${centerScale})`,
            opacity: interpolate(frame, [10, 40], [0, 1]),
          }}
        >
          <DemoPanel
            title="VELOCITY FIELD"
            recording="velocity-demo"
            recordingFrames={20}
            accent="#00c8f0"
            delay={10}
            featured
          />
        </div>

        {/* Right panel: Smooth playback */}
        <div
          style={{
            flex: 1,
            transform: `translateX(${rightPanelX}px)`,
            opacity: interpolate(frame, [0, 20], [0, 1]),
          }}
        >
          <DemoPanel
            title="PLAYBACK"
            recording="playback-demo"
            recordingFrames={25}
            accent="#5de8a0"
            delay={20}
          />
        </div>
      </div>

      {/* Bottom text */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: textReveal,
          transform: `translateY(${30 * (1 - textReveal)}px)`,
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 32,
            color: '#fff',
            letterSpacing: '0.1em',
          }}
        >
          4x MSAA • VELOCITY COLORING • SMOOTH PLAYBACK
        </p>
      </div>
    </AbsoluteFill>
  );
};

interface DemoPanelProps {
  title: string;
  recording: string;
  recordingFrames?: number;
  accent: string;
  delay: number;
  featured?: boolean;
}

const DemoPanel: React.FC<DemoPanelProps> = ({
  title,
  recording,
  recordingFrames = 300,
  accent,
  delay,
  featured,
}) => {
  const frame = useCurrentFrame();

  const borderGlow = interpolate(frame, [delay, delay + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 16,
        overflow: 'hidden',
        border: `2px solid ${accent}${Math.floor(borderGlow * 40).toString(16).padStart(2, '0')}`,
        boxShadow: featured
          ? `0 0 60px ${accent}20`
          : `0 0 20px ${accent}10`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          background: `${accent}15`,
          borderBottom: `1px solid ${accent}30`,
        }}
      >
        <span
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            fontWeight: 600,
            color: accent,
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </span>
      </div>

      {/* Video or Image Sequence */}
      <div style={{ flex: 1, position: 'relative' }}>
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
        
        {/* Scanline effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.1) 2px,
              rgba(0,0,0,0.1) 4px
            )`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
};
