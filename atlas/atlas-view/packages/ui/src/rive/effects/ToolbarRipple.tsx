/**
 * ToolbarRipple — Inline micro-effect for button interactions.
 *
 * Renders an intense, immediate tactical flash on the button that was clicked.
 * Designed to be composited inside ToolButton, TransportButton, etc.
 *
 * Usage:
 *   <ToolbarRipple fire={wasJustClicked} color="#1edce0" />
 */

import { useEffect, useState, useRef } from 'react';

interface ToolbarRippleProps {
  /** Set to true to fire the ripple. Resets automatically. */
  fire: boolean;
  /** Ripple accent color. Default: cyan */
  color?: string;
  /** Duration in ms. Default: 50 */
  duration?: number;
}

export function ToolbarRipple({ fire, color = '#1edce0', duration = 50 }: ToolbarRippleProps) {
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

  return (
    <>
      <style>{`
        @keyframes fx-tactical-flash {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: color,
          pointerEvents: 'none',
          animation: `fx-tactical-flash ${duration}ms ease-out forwards`,
          mixBlendMode: 'screen',
        }}
      />
    </>
  );
}
