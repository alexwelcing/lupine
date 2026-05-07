/**
 * ToolbarRipple — Inline micro-effect for button interactions.
 *
 * Renders a brief energy ripple on the button that was clicked.
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
  /** Duration in ms. Default: 350 */
  duration?: number;
}

export function ToolbarRipple({ fire, color = '#1edce0', duration = 350 }: ToolbarRippleProps) {
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
        @keyframes fx-ripple-expand {
          0%   { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          overflow: 'hidden',
          borderRadius: 'inherit',
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            animation: `fx-ripple-expand ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
          }}
        />
      </div>
    </>
  );
}
