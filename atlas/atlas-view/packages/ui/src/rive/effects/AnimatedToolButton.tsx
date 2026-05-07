import { useState, useCallback } from 'react';
import { ToolbarRipple } from './ToolbarRipple';

interface AnimatedToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

export function AnimatedToolButton({ icon, label, active, onClick }: AnimatedToolButtonProps) {
  const [clicked, setClicked] = useState(false);
  
  const handleClick = useCallback(() => {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 350);
  }, [onClick]);

  return (
    <>
      <style>{`
        @keyframes fx-tool-bounce {
          0% { transform: scale(1); box-shadow: 0 0 20px 5px rgba(30, 220, 224, 0.6); background: rgba(30, 220, 224, 0.2); }
          40% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
      <button
        onClick={handleClick}
        title={label}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          borderRadius: 0,
          border: active ? '1px solid #1edce0' : '1px solid rgba(255,255,255,0.1)',
          background: active ? 'rgba(30, 220, 224, 0.15)' : 'rgba(0,0,0,0.4)',
          color: active ? '#1edce0' : 'rgba(255,255,255,0.9)',
          boxShadow: active ? '0 0 12px 2px rgba(30, 220, 224, 0.4), inset 0 0 8px 1px rgba(30, 220, 224, 0.2)' : 'none',
          cursor: 'pointer',
          transition: 'all 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
          overflow: 'hidden',
          animation: clicked ? 'fx-tool-bounce 250ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.border = '1px solid rgba(30, 220, 224, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            e.currentTarget.style.background = 'rgba(0,0,0,0.4)';
            e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }}
      >
        <ToolbarRipple fire={clicked} color={'#1edce0'} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: active ? 'scale(1.05)' : 'scale(1)',
        }}>
          {icon}
        </div>
        <span style={{
          transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: active ? 'translateX(2px)' : 'translateX(0)',
          textShadow: active ? '0 0 8px rgba(30, 220, 224, 0.8)' : 'none',
        }}>{label}</span>
      </button>
    </>
  );
}
