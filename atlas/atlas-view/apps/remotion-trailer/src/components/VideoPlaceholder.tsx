/**
 * VideoPlaceholder — Renders when video file is not available
 * Shows a colored screen with text label
 */

import { useCurrentFrame, interpolate } from 'remotion';
import { AbsoluteFill } from 'remotion';

interface VideoPlaceholderProps {
  label: string;
  color?: string;
  duration?: number;
}

export const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({
  label,
  color = '#00c8f0',
  duration = 5,
}) => {
  const frame = useCurrentFrame();

  const pulse = interpolate(frame, [0, 30], [0.5, 1], {
    extrapolateRight: 'extend',
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${color}20, ${color}05)`,
        border: `2px dashed ${color}40`,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          opacity: pulse,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `${color}30`,
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
          }}
        >
          🎬
        </div>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 24,
            color: color,
            margin: 0,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 14,
            color: '#8892a8',
            marginTop: 8,
          }}
        >
          Screen Recording Placeholder
        </p>
      </div>
    </AbsoluteFill>
  );
};
