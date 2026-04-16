import { useCurrentFrame, interpolate } from 'remotion';

export const BackgroundGrid: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle grid movement
  const gridOffset = interpolate(frame, [0, 300], [0, 50], {
    extrapolateRight: 'extend',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: -100,
        backgroundImage: `
          linear-gradient(rgba(0, 200, 240, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 200, 240, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px',
        backgroundPosition: `${gridOffset}px ${gridOffset}px`,
        transform: 'perspective(1000px) rotateX(60deg)',
        transformOrigin: 'center center',
        pointerEvents: 'none',
      }}
    />
  );
};
