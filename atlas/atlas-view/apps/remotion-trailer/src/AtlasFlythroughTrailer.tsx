import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { BackgroundGrid } from './components/BackgroundGrid';
import { FeatureScene } from './scenes/FeatureScene';
import { GlitchTransition } from './components/GlitchTransition';
import { IntroScene } from './scenes/IntroScene';

export const AtlasFlythroughTrailer: React.FC = () => {
  const { fps } = useVideoConfig();

  // Simple 14-second composition
  // 0-4s: Intro
  // 4-14s: Flythrough Feature
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#06080d' }}>
      {/* Background effects */}
      <BackgroundGrid />
      
      {/* Audio track */}
      <Audio src={staticFile('audio/hype-track.mp3')} volume={0.7} />
      
      {/* Intro */}
      <Sequence from={0} durationInFrames={4 * fps}>
        <IntroScene />
      </Sequence>

      <Sequence from={4 * fps - 15} durationInFrames={15}>
        <GlitchTransition />
      </Sequence>
      
      {/* Flythrough Feature */}
      <Sequence from={4 * fps} durationInFrames={10 * fps}>
        <FeatureScene
          title="CINEMATIC FLYTHROUGHS"
          subtitle="Keyframe paths • Catmull-Rom splines • Direct to MP4"
          icon="playback"
          accentColor="#f59e0b"
          recording="main-viewer.mp4"
          recordingFrames={300}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
