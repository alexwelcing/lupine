/**
 * HeaderShimmer — Ambient accent line shimmer effect.
 *
 * A thin horizontal line at the top of the viewport that continuously
 * pulses with a traveling light. Adds subtle life to the interface
 * without demanding attention.
 *
 * Usage:
 *   <HeaderShimmer active={hasFileLoaded} />
 */

interface HeaderShimmerProps {
  /** Whether the shimmer is active. Default: true */
  active?: boolean;
  /** Line color. Default: cyan accent */
  color?: string;
}

export function HeaderShimmer({ active = true, color = '#1edce0' }: HeaderShimmerProps) {
  if (!active) return null;

  return (
    <>
      <style>{`
        @keyframes fx-header-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 1,
        zIndex: 200,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: `linear-gradient(90deg, transparent, ${color}15, transparent)`,
      }}>
        <div style={{
          width: '30%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${color}40, ${color}60, ${color}40, transparent)`,
          animation: 'fx-header-shimmer 4s ease-in-out infinite',
        }} />
      </div>
    </>
  );
}
