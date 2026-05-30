import { useStore } from '../store';
import type { LoadedFile } from '../store';
import { ThermoMinimap } from '../ThermoMinimap';
import { TransportButton } from '../controls';
import {
  IconFirst, IconPrev, IconPlay, IconPause, IconNext, IconLast,
} from './icons';

export function Timeline({
  file,
  frame,
  totalFrames,
  playing,
  playbackSpeed,
  togglePlay,
  nextFrame,
  setFrame,
}: {
  file: LoadedFile | null;
  frame: number;
  totalFrames: number;
  playing: boolean;
  playbackSpeed: number;
  togglePlay: () => void;
  nextFrame: () => void;
  setFrame: (frame: number) => void;
}) {
  return (
        <div style={{
          height: 60, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 20px',
          borderTop: '1px solid #1f2937',
          background: '#0a0a0c',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {/* Transport controls */}
          <div style={{ display: 'flex', gap: 4 }}>
            <TransportButton
              onClick={() => useStore.getState().setFrame(0)}
              title="First frame"
              icon={<IconFirst />}
            />
            <TransportButton
              onClick={() => useStore.getState().prevFrame()}
              title="Previous [←]"
              icon={<IconPrev />}
            />
            <TransportButton
              onClick={togglePlay}
              title="Play/Pause [Space]"
              icon={playing ? <IconPause /> : <IconPlay />}
              active={playing}
              width={40}
            />
            <TransportButton
              onClick={nextFrame}
              title="Next [→]"
              icon={<IconNext />}
            />
            <TransportButton
              onClick={() => useStore.getState().setFrame(totalFrames - 1)}
              title="Last frame"
              icon={<IconLast />}
            />
          </div>

          {/* Scrubber */}
          <ThermoMinimap
            thermo={file?.thermo ?? null}
            totalFrames={totalFrames}
            currentFrame={frame}
            onFrameChange={(f) => {
              if (playing) togglePlay();
              setFrame(f);
            }}
          />

          {/* Frame counter */}
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#64748b',
            minWidth: 90,
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span style={{ color: '#f8fafc', fontWeight: 500 }}>{Math.floor(frame) + 1}</span>
            <span style={{ color: '#475569' }}> / {totalFrames}</span>
          </div>

          {/* Speed selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[0.25, 0.5, 1, 2, 4].map(speed => (
              <button
                key={speed}
                onClick={() => useStore.getState().setPlaybackSpeed(speed)}
                style={{
                  padding: '6px 8px',
                  minWidth: 36,
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: playbackSpeed === speed ? 600 : 400,
                  color: playbackSpeed === speed ? '#0a0a0c' : '#64748b',
                  background: playbackSpeed === speed ? '#f59e0b' : '#121418',
                  border: `1px solid ${playbackSpeed === speed ? '#f59e0b' : '#334155'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                  transition: 'all 100ms ease-out',
                }}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>
  );
}
