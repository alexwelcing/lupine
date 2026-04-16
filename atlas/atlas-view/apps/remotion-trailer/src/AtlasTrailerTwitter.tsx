/**
 * AtlasTrailerTwitter — 15-second version optimized for Twitter
 * 
 * Fast-paced cuts, punchy text, optimized for mobile viewing
 * Structure:
 * 0:00-0:03  Logo + hook
 * 0:03-0:06  Feature 1 (WebGPU)
 * 0:06-0:09  Feature 2 (Measurements)
 * 0:09-0:12  Demo montage
 * 0:12-0:15  CTA
 */

import { useVideoConfig, Sequence } from 'remotion';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { IntroScene } from './scenes/IntroScene';
import { FeatureScene } from './scenes/FeatureScene';
import { DemoScene } from './scenes/DemoScene';
import { OutroScene } from './scenes/OutroScene';
import { GlitchTransition } from './components/GlitchTransition';

export const AtlasTrailerTwitter: React.FC = () => {
  const { fps } = useVideoConfig();

  const scenes = {
    intro: { start: 0, duration: 3 * fps },
    feature1: { start: 3 * fps, duration: 3 * fps },
    feature2: { start: 6 * fps, duration: 3 * fps },
    demo: { start: 9 * fps, duration: 3 * fps },
    outro: { start: 12 * fps, duration: 3 * fps },
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#06080d' }}>
      <Audio src={staticFile('audio/hype-track-short.mp3')} volume={0.8} />

      {/* Quick cuts - no transitions, just hard cuts for speed */}
      
      <Sequence from={scenes.intro.start} durationInFrames={scenes.intro.duration}>
        <IntroScene compact />
      </Sequence>

      <Sequence from={scenes.feature1.start} durationInFrames={scenes.feature1.duration}>
        <FeatureScene
          title="100K ATOMS"
          subtitle="60 FPS"
          icon="gpu"
          accentColor="#00c8f0"
          recording="webgpu-demo"
          recordingFrames={20}
          compact
        />
      </Sequence>

      <Sequence from={scenes.feature2.start} durationInFrames={scenes.feature2.duration}>
        <FeatureScene
          title="MEASURE"
          subtitle="Distance • Angle • Dihedral"
          icon="measure"
          accentColor="#5de8a0"
          recording="measurement-demo"
          recordingFrames={15}
          compact
        />
      </Sequence>

      <Sequence from={scenes.demo.start} durationInFrames={scenes.demo.duration}>
        <DemoScene compact />
      </Sequence>

      <Sequence from={scenes.outro.start} durationInFrames={scenes.outro.duration}>
        <OutroScene compact />
      </Sequence>
    </AbsoluteFill>
  );
};
