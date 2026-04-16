import { useVideoConfig, useCurrentFrame, interpolate, Easing, interpolateColors } from 'remotion';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { AchievementScene } from './scenes/AchievementScene';
import { FeatureScene } from './scenes/FeatureScene';
import { DemoScene } from './scenes/DemoScene';
import { StatsScene } from './scenes/StatsScene';
import { CodeScene } from './scenes/CodeScene';
import { OutroScene } from './scenes/OutroScene';
import { GlitchTransition } from './components/GlitchTransition';
import { BackgroundGrid } from './components/BackgroundGrid';

export const AtlasHypeTrailer: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Epic 45-second trailer structure
  const scenes = {
    // 0-4s: Logo intro with epic reveal
    intro: { start: 0, duration: 4 * fps },
    
    // 4-10s: Achievement unlock sequence (NEW)
    achievements: { start: 4 * fps, duration: 6 * fps },
    
    // 10-14s: WebGPU Performance
    webgpu: { start: 10 * fps, duration: 4 * fps },
    
    // 14-18s: Measurement Tools
    measurement: { start: 14 * fps, duration: 4 * fps },
    
    // 18-24s: Demo montage (3-panel)
    demo: { start: 18 * fps, duration: 6 * fps },
    
    // 24-30s: Distiller Pipeline showcase (NEW)
    distiller: { start: 24 * fps, duration: 6 * fps },
    
    // 30-36s: Code/tech stack showcase
    code: { start: 30 * fps, duration: 6 * fps },
    
    // 36-41s: Stats/performance numbers
    stats: { start: 36 * fps, duration: 5 * fps },
    
    // 41-45s: Outro CTA
    outro: { start: 41 * fps, duration: 4 * fps },
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#06080d' }}>
      {/* Animated background */}
      <BackgroundGrid />
      
      {/* Epic background gradient pulse */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, 
            rgba(0, 200, 240, ${0.05 + interpolate(frame, [0, 150, 300], [0, 0.05, 0])}) 0%, 
            transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      
      {/* Audio track */}
      <Audio src={staticFile('audio/hype-track.mp3')} volume={0.7} />
      
      {/* Scene 1: Logo intro */}
      <Sequence from={scenes.intro.start} durationInFrames={scenes.intro.duration}>
        <IntroScene />
      </Sequence>
      
      {/* Transition 1 */}
      <Sequence from={scenes.intro.start + scenes.intro.duration - 15} durationInFrames={15}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 2: Achievement unlock sequence */}
      <Sequence from={scenes.achievements.start} durationInFrames={scenes.achievements.duration}>
        <AchievementScene />
      </Sequence>
      
      {/* Transition 2 */}
      <Sequence from={scenes.achievements.start + scenes.achievements.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 3: WebGPU Feature */}
      <Sequence from={scenes.webgpu.start} durationInFrames={scenes.webgpu.duration}>
        <FeatureScene
          title="WEBGPU POWERED"
          subtitle="GPU-Accelerated Rendering • 100k Atoms • 60fps"
          icon="gpu"
          accentColor="#00c8f0"
          recording="webgpu-demo"
          recordingFrames={30}
        />
      </Sequence>
      
      {/* Transition 3 */}
      <Sequence from={scenes.webgpu.start + scenes.webgpu.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 4: Measurement Tools */}
      <Sequence from={scenes.measurement.start} durationInFrames={scenes.measurement.duration}>
        <FeatureScene
          title="MEASUREMENT TOOLS"
          subtitle="Distance • Angle • Dihedral • Real-time Analysis"
          icon="measure"
          accentColor="#5de8a0"
          recording="measurement-demo"
          recordingFrames={30}
        />
      </Sequence>
      
      {/* Transition 4 */}
      <Sequence from={scenes.measurement.start + scenes.measurement.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 5: Demo montage */}
      <Sequence from={scenes.demo.start} durationInFrames={scenes.demo.duration}>
        <DemoScene />
      </Sequence>
      
      {/* Transition 5 */}
      <Sequence from={scenes.demo.start + scenes.demo.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 6: Distiller Pipeline */}
      <Sequence from={scenes.distiller.start} durationInFrames={scenes.distiller.duration}>
        <DistillerScene />
      </Sequence>
      
      {/* Transition 6 */}
      <Sequence from={scenes.distiller.start + scenes.distiller.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 7: Code showcase */}
      <Sequence from={scenes.code.start} durationInFrames={scenes.code.duration}>
        <CodeScene />
      </Sequence>
      
      {/* Transition 7 */}
      <Sequence from={scenes.code.start + scenes.code.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 8: Stats */}
      <Sequence from={scenes.stats.start} durationInFrames={scenes.stats.duration}>
        <StatsScene />
      </Sequence>
      
      {/* Transition 8 */}
      <Sequence from={scenes.stats.start + scenes.stats.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 9: Outro */}
      <Sequence from={scenes.outro.start} durationInFrames={scenes.outro.duration}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

// Distiller Pipeline Scene - showcasing the deployment automation
const DistillerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleReveal = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  const pipelineSteps = [
    { icon: '📝', label: 'RESEARCH', desc: 'Markdown docs', color: '#f0b840', delay: 30 },
    { icon: '⚙️', label: 'DISTILL', desc: 'Process & analyze', color: '#00c8f0', delay: 60 },
    { icon: '🔨', label: 'BUILD', desc: 'Web + WASM', color: '#5de8a0', delay: 90 },
    { icon: '🚀', label: 'DEPLOY', desc: 'Cloud Run', color: '#f472b6', delay: 120 },
  ];

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
      {/* Title */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 80,
          opacity: titleReveal,
          transform: `translateY(${50 * (1 - titleReveal)}px)`,
        }}
      >
        <h2
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#f472b6',
            margin: 0,
            textShadow: '0 0 40px rgba(244, 114, 182, 0.5)',
          }}
        >
          DISTILLER PIPELINE
        </h2>
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 24,
            color: '#8892a8',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}
        >
          Research → Build → Deploy in One Command
        </p>
      </div>

      {/* Pipeline visualization */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {pipelineSteps.map((step, index) => {
          const stepProgress = interpolate(
            frame,
            [step.delay, step.delay + 20],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );

          const isActive = frame > step.delay + 10;

          return (
            <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  opacity: stepProgress,
                  transform: `translateY(${30 * (1 - stepProgress)}px)`,
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 20,
                    background: isActive
                      ? `linear-gradient(135deg, ${step.color} 0%, ${step.color}80 100%)`
                      : '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 40,
                    boxShadow: isActive ? `0 0 40px ${step.color}50` : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  {step.icon}
                </div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 16,
                    fontWeight: 700,
                    color: isActive ? step.color : '#666',
                    letterSpacing: '0.1em',
                  }}
                >
                  {step.label}
                </div>
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  {step.desc}
                </div>
              </div>

              {/* Arrow between steps */}
              {index < pipelineSteps.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 2,
                    background: interpolateColors(
                      frame,
                      [step.delay + 15, step.delay + 30],
                      ['#333333', step.color]
                    ),
                    opacity: stepProgress,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: -6,
                      top: -4,
                      width: 0,
                      height: 0,
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: `8px solid ${
                        frame > step.delay + 20 ? step.color : '#333'
                      }`,
                      transition: 'border-left-color 0.3s',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Command line preview */}
      <div
        style={{
          marginTop: 80,
          padding: '20px 32px',
          background: '#1a1a1a',
          borderRadius: 8,
          border: '1px solid #333',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 16,
          opacity: interpolate(frame, [150, 180], [0, 1]),
          transform: `translateY(${20 * (1 - interpolate(frame, [150, 180], [0, 1]))}px)`,
        }}
      >
        <span style={{ color: '#5de8a0' }}>$</span>
        <span style={{ color: '#fff', marginLeft: 8 }}>python</span>
        <span style={{ color: '#f0b840', marginLeft: 8 }}>deploy_slim.py</span>
        <span style={{ color: '#00c8f0', marginLeft: 8 }}>--production</span>
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 18,
            background: '#00c8f0',
            marginLeft: 4,
            animation: 'blink 1s infinite',
            opacity: interpolate(frame, [180, 200], [1, 0]),
          }}
        />
      </div>

      {/* Success message */}
      <div
        style={{
          marginTop: 24,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 14,
          color: '#5de8a0',
          opacity: interpolate(frame, [200, 220], [0, 1]),
        }}
      >
        ✓ Deployed to https://atlas-research.dev
      </div>
    </AbsoluteFill>
  );
};
