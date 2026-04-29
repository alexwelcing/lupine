/**
 * ThermoMinimap — Temperature-colored timeline minimap
 *
 * Shows a color-coded overview of thermo data across frames.
 * Click to jump, drag handles for range selection.
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import type { ThermoData } from '@atlas/core/types';

interface ThermoMinimapProps {
  thermo: ThermoData | null;
  totalFrames: number;
  currentFrame: number;
  onFrameChange: (frame: number) => void;
  height?: number;
}

export function ThermoMinimap({
  thermo,
  totalFrames,
  currentFrame,
  onFrameChange,
  height = 28,
}: ThermoMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract temperature (or first numeric) data from thermo
  const temps = useMemo(() => {
    if (!thermo || thermo.runs.length === 0) return null;
    const run = thermo.runs[0];
    let data = run.getColumn('Temp');
    if (!data && run.columns.length > 0) {
      // Fallback to first numeric column
      for (const col of run.columns) {
        const c = run.getColumn(col);
        if (c && c.length > 0) {
          data = c;
          break;
        }
      }
    }
    return data;
  }, [thermo]);

  // Draw minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !temps) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Compute min/max
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < temps.length; i++) {
      if (temps[i] < min) min = temps[i];
      if (temps[i] > max) max = temps[i];
    }
    if (min === Infinity) { min = 0; max = 1; }
    const range = max - min || 1;

    // Draw color bars — 1 bar per frame, or sample if more frames than pixels
    const barWidth = Math.max(1, width / totalFrames);
    for (let i = 0; i < totalFrames; i++) {
      const tIdx = Math.floor((i / Math.max(1, totalFrames - 1)) * (temps.length - 1));
      const norm = (temps[tIdx] - min) / range;
      const hue = 240 - norm * 240; // blue (240) -> red (0)
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.fillRect(Math.floor(i * barWidth), 0, Math.ceil(barWidth), height);
    }

    // Current frame indicator
    const x = (currentFrame / Math.max(1, totalFrames - 1)) * width;
    ctx.fillStyle = 'white';
    ctx.fillRect(Math.floor(x), 0, 2, height);
  }, [temps, totalFrames, currentFrame, height]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || totalFrames <= 1) return;
    const x = e.clientX - rect.left;
    const frame = Math.round((x / rect.width) * (totalFrames - 1));
    onFrameChange(Math.max(0, Math.min(frame, totalFrames - 1)));
  }, [totalFrames, onFrameChange]);

  if (!temps) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={0}
          max={Math.max(totalFrames - 1, 0)}
          step={0.01}
          value={currentFrame}
          onChange={(e) => onFrameChange(+e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        flex: 1,
        height,
        position: 'relative',
        cursor: 'pointer',
        borderRadius: 0,
        overflow: 'hidden',
        border: '1px solid #334155',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* Invisible range input for accessibility + drag scrubbing */}
      <input
        type="range"
        min={0}
        max={Math.max(totalFrames - 1, 0)}
        step={0.01}
        value={currentFrame}
        onChange={(e) => onFrameChange(+e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          margin: 0,
        }}
        aria-label="Frame scrubber"
      />
    </div>
  );
}
