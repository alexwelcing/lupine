/**
 * BreathingDot — Ambient status pulse indicator.
 *
 * A small dot that gently pulses to indicate the app is alive and
 * connected. Changes color based on system state.
 *
 * Usage:
 *   <BreathingDot status="active" />
 */

interface BreathingDotProps {
  /** Current status — drives color */
  status?: 'idle' | 'active' | 'warning' | 'error';
  /** Size in px. Default: 6 */
  size?: number;
}

const STATUS_COLORS = {
  idle: '#64748b',
  active: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
};

export function BreathingDot({ status = 'active', size = 6 }: BreathingDotProps) {
  const color = STATUS_COLORS[status];

  return (
    <>
      <style>{`
        @keyframes fx-breathe {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px 1px ${color}60; }
          50%      { opacity: 0.4; box-shadow: 0 0 2px 0px ${color}30; }
        }
      `}</style>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        animation: 'fx-breathe 2.5s ease-in-out infinite',
        flexShrink: 0,
      }} />
    </>
  );
}
