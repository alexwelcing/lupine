import { Composition, registerRoot } from 'remotion';
import { AtlasTrailer } from './AtlasTrailer';
import { AtlasTrailerExtended } from './AtlasTrailerExtended';
import { AtlasTrailerTwitter } from './AtlasTrailerTwitter';
import { AtlasHypeTrailer } from './AtlasHypeTrailer';
import { AtlasFlythroughTrailer } from './AtlasFlythroughTrailer';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* NEW: Epic 45-second Hype Trailer - VIEWER + DISTILLER */}
      <Composition
        id="AtlasHypeTrailer"
        component={AtlasHypeTrailer}
        durationInFrames={45 * 60}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{}}
      />

      {/* Standard 30-second version */}
      <Composition
        id="AtlasTrailer"
        component={AtlasTrailer}
        durationInFrames={30 * 60}
        fps={60}
        width={1920}
        height={1080}
        defaultProps={{
          showLogo: true,
          showFeatures: true,
          showDemo: true,
          showCTA: true,
        }}
      />

      {/* Extended 60-second version */}
      <Composition
        id="AtlasTrailerExtended"
        component={AtlasTrailerExtended}
        durationInFrames={60 * 60}
        fps={60}
        width={1920}
        height={1080}
      />

      {/* Twitter 15-second version */}
      <Composition
        id="AtlasTrailerTwitter"
        component={AtlasTrailerTwitter}
        durationInFrames={15 * 60}
        fps={60}
        width={1920}
        height={1080}
      />

      {/* Square version for Instagram */}
      <Composition
        id="AtlasTrailerSquare"
        component={AtlasTrailerTwitter}
        durationInFrames={15 * 60}
        fps={60}
        width={1080}
        height={1080}
      />

      {/* Flythrough feature showcase */}
      <Composition
        id="AtlasFlythroughTrailer"
        component={AtlasFlythroughTrailer}
        durationInFrames={14 * 60}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};

// Register the root component for Remotion
registerRoot(RemotionRoot);
