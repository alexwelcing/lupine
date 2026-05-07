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
          0% { transform: scale(1); }
          40% { transform: scale(0.92); }
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
          borderRadius: 12,
          border: 'none',
          background: active ? 'var(--accent)' : 'transparent',
          color: active ? 'white' : 'rgba(255,255,255,0.9)',
          cursor: 'pointer',
          transition: 'all 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          fontSize: 13,
          fontWeight: 500,
          flexShrink: 0,
          overflow: 'hidden',
          animation: clicked ? 'fx-tool-bounce 350ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = 'transparent';
        }}
      >
        <ToolbarRipple fire={clicked} color={active ? '#ffffff' : '#1edce0'} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: active ? 'scale(1.05)' : 'scale(1)',
        }}>
          {icon}
        </div>
        <span style={{
          transition: 'transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: active ? 'translateX(2px)' : 'translateX(0)',
        }}>{label}</span>
      </button>
    </>
  );
}
