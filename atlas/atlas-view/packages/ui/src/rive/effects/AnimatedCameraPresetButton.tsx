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
          0% { background: rgba(255,255,255,0.9); transform: scale(1.1); box-shadow: 0 0 15px rgba(255,255,255,0.8); }
          100% { background: ${active ? 'var(--accent)' : 'rgba(0,0,0,0.4)'}; transform: scale(1); box-shadow: 0 0 0px rgba(255,255,255,0); }
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
          color: active ? 'white' : 'rgba(255,255,255,0.7)',
          background: active ? 'var(--accent)' : 'rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          transition: 'all 150ms ease-out',
          animation: clicked ? 'fx-camera-flash-bg 400ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          perspective: 400,
        }}
        onMouseEnter={(e) => {
          if (!active && !clicked) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          if (!active && !clicked) e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
        }}
      >
        <span style={{ 
          display: 'block', 
          animation: clicked ? 'fx-camera-snap-text 400ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
        }}>
          {label}
        </span>
      </button>
    </>
  );
}
