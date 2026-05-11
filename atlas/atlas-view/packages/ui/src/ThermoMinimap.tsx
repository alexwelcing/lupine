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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="range"
          min={0}
          max={Math.max(totalFrames - 1, 0)}
          step={0.01}
          value={currentFrame}
          onChange={(e) => onFrameChange(+e.target.value)}
          style={{ 
            width: '100%',
            height: 4,
            background: '#1e293b',
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer',
          }}
          className="amped-slider"
        />
        <style>{`
          .amped-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 8px;
            height: 20px;
            margin-top: -8px;
            background: #1edce0;
            border: none;
            border-radius: 0;
            cursor: pointer;
            box-shadow: 0 0 10px 2px rgba(30, 220, 224, 0.5);
            transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .amped-slider::-webkit-slider-thumb:hover {
            transform: scaleY(1.2);
            background: #f8fafc;
            box-shadow: 0 0 15px 3px rgba(30, 220, 224, 0.8);
          }
          .amped-slider::-moz-range-thumb {
            width: 8px;
            height: 20px;
            background: #1edce0;
            border: none;
            border-radius: 0;
            cursor: pointer;
            box-shadow: 0 0 10px 2px rgba(30, 220, 224, 0.5);
            transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .amped-slider::-moz-range-thumb:hover {
            transform: scaleY(1.2);
            background: #f8fafc;
            box-shadow: 0 0 15px 3px rgba(30, 220, 224, 0.8);
          }
          .amped-slider::-moz-range-track {
            height: 4px;
            background: #1e293b;
            border: none;
            border-radius: 0;
          }
        `}</style>
      </div>
    );
  }

  // Calculate the x position of the thumb
  const thumbX = (currentFrame / Math.max(1, totalFrames - 1)) * 100;

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
        background: '#0a0a0c',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', opacity: 0.8 }}
      />
      
      {/* High-fidelity glowing thumb overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${thumbX}%`,
        width: 2,
        background: '#1edce0',
        boxShadow: '0 0 12px 2px rgba(30, 220, 224, 0.9), 0 0 4px 1px #fff',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        transition: 'left 50ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }} />

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
