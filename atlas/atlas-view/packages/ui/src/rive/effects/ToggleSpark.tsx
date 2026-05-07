/**
 * ToggleSpark — Inline micro-effect for boolean toggle switches.
 *
 * Fires a brief spark/flash when a toggle flips (bonds, axes, cell, etc).
 * Renders inline within the toggle component.
 *
 * Usage:
 *   <ToggleSpark fire={justToggled} on={isEnabled} />
 */

import { useEffect, useState, useRef } from 'react';

interface ToggleSparkProps {
  /** Set to true to fire the spark */
  fire: boolean;
  /** Whether the toggle is now ON (affects color) */
  on: boolean;
  /** Duration in ms. Default: 250 */
  duration?: number;
}

export function ToggleSpark({ fire, on, duration = 250 }: ToggleSparkProps) {
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (fire) {
      setPlaying(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPlaying(false), duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fire, duration]);

  if (!playing) return null;

  const color = on ? '#34d399' : '#64748b';

  return (
    <>
      <style>{`
        @keyframes fx-spark-burst {
          0%   { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fx-spark-dot {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0) translateY(-8px); }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: -4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {/* Central burst */}
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
          animation: `fx-spark-burst ${duration}ms ease-out forwards`,
        }} />
        {/* Satellite dots */}
        {[0, 72, 144, 216, 288].map((angle) => (
          <div key={angle} style={{
            position: 'absolute',
            width: 3, height: 3, borderRadius: '50%',
            background: color,
            transform: `rotate(${angle}deg) translateY(-10px)`,
            animation: `fx-spark-dot ${duration}ms ease-out ${50 + (angle / 10)}ms forwards`,
          }} />
        ))}
      </div>
    </>
  );
}
