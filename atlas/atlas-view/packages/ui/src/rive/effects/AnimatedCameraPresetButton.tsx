import { useState, useCallback } from 'react';

interface AnimatedCameraPresetButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}

export function AnimatedCameraPresetButton({ label, active, onClick, title }: AnimatedCameraPresetButtonProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = useCallback(() => {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 400);
  }, [onClick]);

  return (
    <>
      <style>{`
        @keyframes fx-camera-flash-bg {
          0% { background: rgba(30, 220, 224, 0.4); transform: scale(1.1); box-shadow: 0 0 25px rgba(30, 220, 224, 0.8); }
          100% { background: ${active ? 'rgba(30, 220, 224, 0.15)' : 'rgba(0,0,0,0.4)'}; transform: scale(1); box-shadow: 0 0 0px rgba(30, 220, 224, 0); }
        }
        @keyframes fx-camera-snap-text {
          0% { transform: rotateY(0deg) scale(1); }
          50% { transform: rotateY(180deg) scale(0.6); }
          100% { transform: rotateY(360deg) scale(1); }
        }
      `}</style>
      <button
        onClick={handleClick}
        title={title}
        style={{
          width: 40, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
          color: active ? '#1edce0' : 'rgba(255,255,255,0.7)',
          background: active ? 'rgba(30, 220, 224, 0.15)' : 'rgba(0,0,0,0.4)',
          border: active ? '1px solid #1edce0' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: 0,
          boxShadow: active ? '0 0 12px 2px rgba(30, 220, 224, 0.4), inset 0 0 8px 1px rgba(30, 220, 224, 0.2)' : 'none',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          transition: 'all 100ms ease-out',
          animation: clicked ? 'fx-camera-flash-bg 250ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          perspective: 400,
        }}
        onMouseEnter={(e) => {
          if (!active && !clicked) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.border = '1px solid rgba(30, 220, 224, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active && !clicked) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }}
      >
        <span style={{ 
          display: 'block', 
          animation: clicked ? 'fx-camera-snap-text 250ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          textShadow: active ? '0 0 8px rgba(30, 220, 224, 0.8)' : 'none',
        }}>
          {label}
        </span>
      </button>
    </>
  );
}
