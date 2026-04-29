import { Config } from '@remotion/cli/config';

export const config: Config = {
  // Video settings for hype trailer
  frameRate: 60,
  width: 1920,
  height: 1080,
  
  // FFmpeg encoding for high quality
  ffmpegOverride: (ffmpegCommand) => {
    ffmpegCommand
      .outputOptions([
        '-c:v libx264',
        '-crf 18',           // High quality
        '-preset slow',      // Better compression
        '-pix_fmt yuv420p',  // Compatibility
        '-movflags +faststart',
        '-c:a aac',
        '-b:a 320k',         // High quality audio
      ]);
    return ffmpegCommand;
  },
};
