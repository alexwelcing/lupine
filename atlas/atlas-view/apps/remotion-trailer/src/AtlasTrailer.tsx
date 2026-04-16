import { useVideoConfig, useCurrentFrame, interpolate, Easing } from 'remotion';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { FeatureScene } from './scenes/FeatureScene';
import { DemoScene } from './scenes/DemoScene';
import { OutroScene } from './scenes/OutroScene';
import { GlitchTransition } from './components/GlitchTransition';
import { BackgroundGrid } from './components/BackgroundGrid';

interface AtlasTrailerProps {
  showLogo?: boolean;
  showFeatures?: boolean;
  showDemo?: boolean;
  showCTA?: boolean;
}

export const AtlasTrailer: React.FC<AtlasTrailerProps> = ({
  showLogo = true,
  showFeatures = true,
  showDemo = true,
  showCTA = true,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Scene timings (in frames at 60fps)
  const scenes = {
    intro: { start: 0, duration: 4 * fps },           // 0-4s: Logo reveal
    feature1: { start: 4 * fps, duration: 4 * fps },  // 4-8s: WebGPU + MSAA
    feature2: { start: 8 * fps, duration: 4 * fps },  // 8-12s: Velocity coloring (NEW)
    feature3: { start: 12 * fps, duration: 4 * fps }, // 12-16s: Auto-playback (NEW)
    demo: { start: 16 * fps, duration: 10 * fps },    // 16-26s: Live demo montage
    outro: { start: 26 * fps, duration: 4 * fps },    // 26-30s: CTA
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#06080d' }}>
      {/* Background effects */}
      <BackgroundGrid />
      
      {/* Audio track */}
      <Audio src={staticFile('audio/hype-track.mp3')} volume={0.7} />
      
      {/* Scene 1: Logo intro */}
      {showLogo && (
        <Sequence
          from={scenes.intro.start}
          durationInFrames={scenes.intro.duration}
        >
          <IntroScene />
        </Sequence>
      )}
      
      {/* Transition 1 */}
      <Sequence from={scenes.intro.start + scenes.intro.duration - 15} durationInFrames={15}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 2: WebGPU + 4x MSAA Quality */}
      {showFeatures && (
        <Sequence
          from={scenes.feature1.start}
          durationInFrames={scenes.feature1.duration}
        >
          <FeatureScene
            title="4x MSAA RENDERING"
            subtitle="WebGPU • Pixel-perfect spheres • Zero jaggies"
            icon="gpu"
            accentColor="#00c8f0"
            recording="msaa-demo"
            recordingFrames={20}
          />
        </Sequence>
      )}

      {/* Transition 2 */}
      <Sequence from={scenes.feature1.start + scenes.feature1.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>

      {/* Scene 3: Velocity Coloring (NEW FEATURE) */}
      {showFeatures && (
        <Sequence
          from={scenes.feature2.start}
          durationInFrames={scenes.feature2.duration}
        >
          <FeatureScene
            title="VELOCITY COLORING"
            subtitle="Blue → White → Red • Real-time dynamics"
            icon="measure"
            accentColor="#f0b840"
            recording="velocity-demo"
            recordingFrames={20}
          />
        </Sequence>
      )}

      {/* Transition 3 */}
      <Sequence from={scenes.feature2.start + scenes.feature2.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>

      {/* Scene 4: Auto-Playback (NEW FEATURE) */}
      {showFeatures && (
        <Sequence
          from={scenes.feature3.start}
          durationInFrames={scenes.feature3.duration}
        >
          <FeatureScene
            title="SMOOTH PLAYBACK"
            subtitle="1-120 FPS • GUI controls • Frame scrubbing"
            icon="playback"
            accentColor="#5de8a0"
            recording="playback-demo"
            recordingFrames={25}
          />
        </Sequence>
      )}

      {/* Transition 4 */}
      <Sequence from={scenes.feature3.start + scenes.feature3.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>
      
      {/* Scene 5: Live demo montage */}
      {showDemo && (
        <Sequence
          from={scenes.demo.start}
          durationInFrames={scenes.demo.duration}
        >
          <DemoScene />
        </Sequence>
      )}

      {/* Transition 5 */}
      <Sequence from={scenes.demo.start + scenes.demo.duration - 12} durationInFrames={12}>
        <GlitchTransition />
      </Sequence>

      {/* Scene 6: Outro / CTA */}
      {showCTA && (
        <Sequence
          from={scenes.outro.start}
          durationInFrames={scenes.outro.duration}
        >
          <OutroScene />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
