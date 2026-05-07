import React, { useState } from 'react';

interface AnimatedSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function AnimatedSlider({ value, min, max, step = 1, onChange, style, ...props }: AnimatedSliderProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate percentage for gradient track filling
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ position: 'relative', width: '100%', height: 24, display: 'flex', alignItems: 'center' }}>
      <style>{`
        .amped-ui-slider::-webkit-slider-thumb {
          appearance: none;
          width: 8px;
          height: 16px;
          background: #1edce0;
          border-radius: 0;
          cursor: pointer;
          box-shadow: 0 0 10px 2px rgba(30, 220, 224, 0.4);
          transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .amped-ui-slider::-webkit-slider-thumb:hover, .amped-ui-slider:active::-webkit-slider-thumb {
          transform: scaleY(1.3);
          background: #f8fafc;
          box-shadow: 0 0 15px 3px rgba(30, 220, 224, 0.8), 0 0 4px 1px #fff;
        }
        .amped-ui-slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 0;
        }
      `}</style>
      
      {/* Visual track fill */}
      <div style={{
        position: 'absolute',
        left: 0,
        height: 4,
        width: `${percentage}%`,
        background: isFocused || isHovered ? '#1edce0' : '#475569',
        boxShadow: isFocused || isHovered ? '0 0 8px rgba(30, 220, 224, 0.6)' : 'none',
        pointerEvents: 'none',
        transition: 'background 100ms ease-out, box-shadow 100ms ease-out',
        zIndex: 0,
      }} />

      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsFocused(true)}
        onMouseUp={() => setIsFocused(false)}
        onBlur={() => setIsFocused(false)}
        className="amped-ui-slider"
        style={{
          width: '100%',
          appearance: 'none',
          outline: 'none',
          background: 'transparent',
          position: 'relative',
          zIndex: 1,
          margin: 0,
          ...style
        }}
        {...props}
      />
    </div>
  );
}
