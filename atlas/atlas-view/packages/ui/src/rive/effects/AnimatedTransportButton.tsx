import { useState, useCallback } from 'react';
import { ToolbarRipple } from './ToolbarRipple';

interface AnimatedTransportButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}

export function AnimatedTransportButton({ onClick, title, icon }: AnimatedTransportButtonProps) {
  const [clicked, setClicked] = useState(false);

  const handleClick = useCallback(() => {
    setClicked(true);
    onClick();
    setTimeout(() => setClicked(false), 250);
  }, [onClick]);

  return (
    <>
      <style>{`
        @keyframes fx-transport-snap {
          0% { transform: scale(1); box-shadow: 0 0 15px 2px rgba(30, 220, 224, 0.5); border-color: #1edce0; }
          40% { transform: scale(0.92); }
          100% { transform: scale(1); box-shadow: 0 0 0px 0px rgba(30, 220, 224, 0); border-color: #334155; }
        }
      `}</style>
      <button
        onClick={handleClick}
        title={title}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32,
          color: clicked ? '#1edce0' : '#64748b',
          background: clicked ? 'rgba(30, 220, 224, 0.15)' : '#121418',
          border: '1px solid',
          borderColor: clicked ? '#1edce0' : '#334155',
          borderRadius: 0,
          cursor: 'pointer',
          transition: 'all 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          animation: clicked ? 'fx-transport-snap 250ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!clicked) {
            e.currentTarget.style.color = '#f8fafc';
            e.currentTarget.style.borderColor = 'rgba(30, 220, 224, 0.5)';
            e.currentTarget.style.background = '#1e293b';
          }
        }}
        onMouseLeave={(e) => {
          if (!clicked) {
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.borderColor = '#334155';
            e.currentTarget.style.background = '#121418';
          }
        }}
      >
        <ToolbarRipple fire={clicked} color={'#1edce0'} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: clicked ? 'scale(1.1)' : 'scale(1)',
          textShadow: clicked ? '0 0 8px rgba(30, 220, 224, 0.8)' : 'none',
        }}>
          {icon}
        </div>
      </button>
    </>
  );
}
