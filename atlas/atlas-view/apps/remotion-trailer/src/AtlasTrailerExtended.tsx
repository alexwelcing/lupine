/**
 * AtlasTrailerExtended — Extended 60-second version with more scenes
 * 
 * Structure:
 * 0:00-0:05   Logo reveal
 * 0:05-0:10   Tagline
 * 0:10-0:15   WebGPU feature
 * 0:15-0:20   Performance stats
 * 0:20-0:25   Measurement feature
 * 0:25-0:30   Bond detection feature
 * 0:30-0:40   Demo montage
 * 0:40-0:50   Code/tech highlight
 * 0:50-0:60   Outro CTA
 */

import { useVideoConfig, useCurrentFrame, interpolate, Easing } from 'remotion';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { TaglineScene } from './scenes/TaglineScene';
import { FeatureScene } from './scenes/FeatureScene';
import { StatsScene } from './scenes/StatsScene';
import { DemoScene } from './scenes/DemoScene';
import { CodeScene } from './scenes/CodeScene';
import { OutroScene } from './scenes/OutroScene';
import { GlitchTransition } from './components/GlitchTransition';
import { BackgroundGrid } from './components/BackgroundGrid';

export const AtlasTrailerExtended: React.FC = () => {
  const { fps } = useVideoConfig();

  const scenes = {
    intro: { start: 0, duration: 5 * fps },
    tagline: { start: 5 * fps, duration: 5 * fps },
    feature1: { start: 10 * fps, duration: 5 * fps },
    stats: { start: 15 * fps, duration: 5 * fps },
    feature2: { start: 20 * fps, duration: 5 * fps },
    feature3: { start: 25 * fps, duration: 5 * fps },
    demo: { start: 30 * fps, duration: 10 * fps },
    code: { start: 40 * fps, duration: 10 * fps },
    outro: { start: 50 * fps, duration: 10 * fps },
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#06080d' }}>
      <BackgroundGrid />
      <Audio src={staticFile('audio/hype-track.mp3')} volume={0.7} />

      {/* Scene 1: Logo */}
      <Sequence from={scenes.intro.start} durationInFrames={scenes.intro.duration}>
        <IntroScene />
      </Sequence>
      <Transition at={scenes.intro.start + scenes.intro.duration - 15} />

      {/* Scene 2: Tagline */}
      <Sequence from={scenes.tagline.start} durationInFrames={scenes.tagline.duration}>
        <TaglineScene />
      </Sequence>
      <Transition at={scenes.tagline.start + scenes.tagline.duration - 15} />

      {/* Scene 3: WebGPU */}
      <Sequence from={scenes.feature1.start} durationInFrames={scenes.feature1.duration}>
        <FeatureScene
          title="WEBGPU POWERED"
          subtitle="GPU-accelerated rendering"
          icon="gpu"
          accentColor="#00c8f0"
          recording="webgpu-demo"
          recordingFrames={20}
        />
      </Sequence>
      <Transition at={scenes.feature1.start + scenes.feature1.duration - 15} />

      {/* Scene 4: Performance Stats */}
      <Sequence from={scenes.stats.start} durationInFrames={scenes.stats.duration}>
        <StatsScene />
      </Sequence>
      <Transition at={scenes.stats.start + scenes.stats.duration - 15} />

      {/* Scene 5: Measurements */}
      <Sequence from={scenes.feature2.start} durationInFrames={scenes.feature2.duration}>
        <FeatureScene
          title="PRECISE TOOLS"
          subtitle="Distance • Angle • Dihedral"
          icon="measure"
          accentColor="#5de8a0"
          recording="measurement-demo"
          recordingFrames={15}
        />
      </Sequence>
      <Transition at={scenes.feature2.start + scenes.feature2.duration - 15} />

      {/* Scene 6: Bonds */}
      <Sequence from={scenes.feature3.start} durationInFrames={scenes.feature3.duration}>
        <FeatureScene
          title="BOND DETECTION"
          subtitle="Automatic connectivity analysis"
          icon="bonds"
          accentColor="#f0b840"
          recording="measure-tool"
          recordingFrames={15}
        />
      </Sequence>
      <Transition at={scenes.feature3.start + scenes.feature3.duration - 15} />

      {/* Scene 7: Demo Montage */}
      <Sequence from={scenes.demo.start} durationInFrames={scenes.demo.duration}>
        <DemoScene />
      </Sequence>
      <Transition at={scenes.demo.start + scenes.demo.duration - 15} />

      {/* Scene 8: Code/Tech */}
      <Sequence from={scenes.code.start} durationInFrames={scenes.code.duration}>
        <CodeScene />
      </Sequence>
      <Transition at={scenes.code.start + scenes.code.duration - 15} />

      {/* Scene 9: Outro */}
      <Sequence from={scenes.outro.start} durationInFrames={scenes.outro.duration}>
        <OutroScene extended />
      </Sequence>
    </AbsoluteFill>
  );
};

const Transition: React.FC<{ at: number }> = ({ at }) => (
  <Sequence from={at} durationInFrames={15}>
    <GlitchTransition />
  </Sequence>
);
