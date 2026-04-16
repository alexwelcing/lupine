import { useCurrentFrame, interpolate, random } from 'remotion';
import { AbsoluteFill } from 'remotion';

export const GlitchTransition: React.FC = () => {
  const frame = useCurrentFrame();

  // Generate random glitch blocks
  const glitchBlocks = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: random(`x-${i}`) * 1920,
    y: random(`y-${i}`) * 1080,
    width: random(`w-${i}`) * 400 + 100,
    height: random(`h-${i}`) * 100 + 20,
    color: random(`c-${i}`) > 0.5 ? '#00c8f0' : '#fff',
    delay: Math.floor(random(`d-${i}`) * 10),
  }));

  // RGB split intensity
  const rgbSplit = interpolate(frame, [0, 15], [50, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#06080d',
        overflow: 'hidden',
      }}
    >
      {/* RGB Split effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(90deg, 
              rgba(255,0,0,0.3) 0%, 
              transparent ${50 - rgbSplit}%, 
              transparent ${50 + rgbSplit}%, 
              rgba(0,255,255,0.3) 100%
            )
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* Glitch blocks */}
      {glitchBlocks.map((block) => {
        const opacity = interpolate(
          frame,
          [block.delay, block.delay + 5, block.delay + 10],
          [0, 1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        const xOffset = interpolate(
          frame,
          [0, 15],
          [random(`xo-${block.id}`) * 100 - 50, 0],
          { extrapolateRight: 'clamp' }
        );

        return (
          <div
            key={block.id}
            style={{
              position: 'absolute',
              left: block.x + xOffset,
              top: block.y,
              width: block.width,
              height: block.height,
              backgroundColor: block.color,
              opacity: opacity * 0.3,
              transform: `skewX(${(frame % 5) * 2}deg)`,
            }}
          />
        );
      })}

      {/* Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.5) 2px,
            rgba(0,0,0,0.5) 4px
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* Center flash */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          opacity: interpolate(frame, [0, 5, 15], [0, 1, 0]),
        }}
      />
    </AbsoluteFill>
  );
};
