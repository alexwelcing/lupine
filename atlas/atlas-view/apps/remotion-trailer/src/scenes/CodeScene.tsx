import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { AbsoluteFill } from 'remotion';

const codeLines = [
  { text: 'import { AtomsOptimized } from "@atlas/scene";', color: '#c586c0', delay: 0 },
  { text: '', color: '', delay: 5 },
  { text: '// Load 100,000 atoms', color: '#6a9955', delay: 10 },
  { text: 'const frame = await parseDump(file);', color: '#9cdcfe', delay: 15 },
  { text: '', color: '', delay: 20 },
  { text: '// Render at 60fps', color: '#6a9955', delay: 25 },
  { text: '<AtomsOptimized', color: '#4ec9b0', delay: 30 },
  { text: '  frame={frame}', color: '#9cdcfe', delay: 35 },
  { text: '  colorMode="stress"', color: '#9cdcfe', delay: 40 },
  { text: '  effects={{ ssao: true }}', color: '#9cdcfe', delay: 45 },
  { text: '/>', color: '#4ec9b0', delay: 50 },
];

export const CodeScene: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e1e',
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
      }}
    >
      {/* Window chrome */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          width: 900,
          background: '#252526',
          borderRadius: '8px 8px 0 0',
          padding: '12px 16px',
          display: 'flex',
          gap: 8,
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
        <span
          style={{
            marginLeft: 16,
            fontSize: 12,
            color: '#858585',
          }}
        >
          App.tsx
        </span>
      </div>

      {/* Code editor */}
      <div
        style={{
          width: 900,
          background: '#1e1e1e',
          borderRadius: '0 0 8px 8px',
          padding: '24px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {codeLines.map((line, i) => {
          const opacity = interpolate(
            frame,
            [line.delay, line.delay + 10],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                opacity,
                transform: `translateX(${10 * (1 - opacity)}px)`,
              }}
            >
              {/* Line number */}
              <span
                style={{
                  width: 40,
                  color: '#858585',
                  fontSize: 16,
                  userSelect: 'none',
                }}
              >
                {i + 1}
              </span>
              {/* Code */}
              <span
                style={{
                  color: line.color || '#d4d4d4',
                  fontSize: 18,
                  whiteSpace: 'pre',
                }}
              >
                {line.text}
              </span>
            </div>
          );
        })}

        {/* Cursor */}
        <div
          style={{
            display: 'flex',
            marginTop: 8,
          }}
        >
          <span style={{ width: 40 }} />
          <span
            style={{
              width: 2,
              height: 22,
              background: '#00c8f0',
              opacity: interpolate(frame, [0, 30], [1, 0]),
            }}
          />
        </div>
      </div>

      {/* Tech stack badges */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginTop: 60,
          opacity: interpolate(frame, [60, 80], [0, 1]),
        }}
      >
        {['React', 'TypeScript', 'WebGPU', 'Rust/WASM'].map((tech, i) => (
          <span
            key={tech}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 200, 240, 0.1)',
              border: '1px solid rgba(0, 200, 240, 0.3)',
              borderRadius: 4,
              color: '#00c8f0',
              fontSize: 14,
              letterSpacing: '0.05em',
              opacity: interpolate(frame, [70 + i * 5, 85 + i * 5], [0, 1]),
            }}
          >
            {tech}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
