/**
 * VoiceoverSync — Synchronize visuals with voiceover audio
 * 
 * Usage:
 * 1. Record voiceover script
 * 2. Place at public/audio/voiceover.mp3
 * 3. Use cue points to trigger animations
 */

import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Audio, staticFile } from 'remotion';

interface CuePoint {
  time: number;     // Seconds
  label: string;    // Description
  text?: string;    // Text to display
  action?: () => void;
}

interface VoiceoverSyncProps {
  audioFile: string;
  cues: CuePoint[];
  onCue?: (cue: CuePoint, index: number) => void;
  subtitles?: boolean;
}

// Predefined scripts for the trailer
export const voiceoverScripts = {
  standard: [
    { time: 0.5, text: "Introducing ATLAS View." },
    { time: 2.0, text: "Next-generation molecular dynamics visualization." },
    { time: 5.0, text: "Powered by WebGPU." },
    { time: 7.0, text: "Render one hundred thousand atoms at sixty frames per second." },
    { time: 12.0, text: "Precise measurement tools." },
    { time: 15.0, text: "Distance, angle, and dihedral calculations in real-time." },
    { time: 20.0, text: "Free and open source." },
    { time: 23.0, text: "Built with React, TypeScript, and Rust." },
    { time: 27.0, text: "Get it on GitHub today." },
  ],
  
  short: [
    { time: 0.5, text: "ATLAS View." },
    { time: 1.5, text: "WebGPU-powered MD visualization." },
    { time: 4.0, text: "One hundred K atoms. Sixty FPS." },
    { time: 7.0, text: "Free on GitHub." },
  ],
  
  technical: [
    { time: 0.5, text: "ATLAS View." },
    { time: 2.0, text: "GPU-accelerated molecular dynamics visualization." },
    { time: 6.0, text: "Spatial hashing for O of one atom picking." },
    { time: 10.0, text: "Direct buffer manipulation for ten X performance." },
    { time: 15.0, text: "WebAssembly parsers for instant file loading." },
    { time: 20.0, text: "Open source on GitHub." },
  ],
};

export const VoiceoverSync: React.FC<VoiceoverSyncProps> = ({
  audioFile,
  cues,
  onCue,
  subtitles = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find current cue
  const currentCueIndex = cues.findIndex((cue, i) => {
    const nextCue = cues[i + 1];
    return currentTime >= cue.time && (!nextCue || currentTime < nextCue.time);
  });

  const currentCue = currentCueIndex >= 0 ? cues[currentCueIndex] : null;

  // Trigger callback on cue change
  React.useEffect(() => {
    if (currentCue && onCue) {
      onCue(currentCue, currentCueIndex);
    }
  }, [currentCueIndex]);

  return (
    <>
      <Audio src={staticFile(audioFile)} />
      
      {subtitles && currentCue && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            left: 0,
            right: 0,
            textAlign: 'center',
            padding: '20px 40px',
          }}
        >
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 28,
              color: '#fff',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '12px 24px',
              borderRadius: 8,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            }}
          >
            {(currentCue as any).text || (currentCue as any).label}
          </span>
        </div>
      )}
    </>
  );
};

// Subtitle-only component (if you have audio but no cue data)
export const Subtitles: React.FC<{
  script: Array<{ time: number; text: string }>;
  style?: React.CSSProperties;
}> = ({ script, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const currentLine = script.find((line, i) => {
    const nextLine = script[i + 1];
    return time >= line.time && (!nextLine || time < nextLine.time);
  });

  if (!currentLine) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        textAlign: 'center',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 24,
          fontWeight: 500,
          color: '#fff',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '16px 32px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {currentLine.text}
      </span>
    </div>
  );
};

// Word-by-word highlighting subtitle
export const WordHighlightSubtitles: React.FC<{
  script: Array<{ time: number; duration: number; text: string }>;
}> = ({ script }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const currentLine = script.find((line, i) => {
    const nextLine = script[i + 1];
    return time >= line.time && (!nextLine || time < nextLine.time);
  });

  if (!currentLine) return null;

  const words = currentLine.text.split(' ');
  const wordDuration = (currentLine as any).duration / words.length;
  const currentWordIndex = Math.floor((time - currentLine.time) / wordDuration);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 32,
          fontWeight: 600,
          padding: '20px 40px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 12,
        }}
      >
        {words.map((word, i) => (
          <span
            key={i}
            style={{
              color: i <= currentWordIndex ? '#00c8f0' : '#666',
              marginRight: 12,
              transition: 'color 0.1s ease',
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
};

// Export with React import
import React from 'react';
