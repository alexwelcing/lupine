import React, { useState } from 'react';

export default function HeaSlider({ label, min = 0, max = 100, defaultValue = 50, onChange }) {
  const [value, setValue] = useState(defaultValue);

  const handleDrag = (e) => {
    const val = e.target.value;
    setValue(val);
    if(onChange) onChange(val);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ padding: '24px 0', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ 
            fontFamily: 'var(--font-serif)', 
            fontSize: '14px', 
            letterSpacing: '0.05em', 
            color: '#b9cac4',
            fontStyle: 'italic'
        }}>
            {label}
        </span>
        <span style={{ 
            fontFamily: '"JetBrains Mono", var(--font-sans)', 
            fontSize: '13px', 
            color: '#00f5d4' 
        }}>
            {value}
        </span>
      </div>

      <div style={{ position: 'relative', height: '32px', display: 'flex', alignItems: 'center' }}>
        {/* Rendered Track (Brutalist, Chromatic) */}
        <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: '#1b1b1b', // surface-container-low
            zIndex: 1
        }}>
           {/* Filled Track glowing metallic */}
           <div style={{
               position: 'absolute',
               left: 0,
               top: 0,
               bottom: 0,
               width: `${percentage}%`,
               background: 'linear-gradient(90deg, #006c5c 0%, #00f5d4 100%)',
               boxShadow: '0 0 16px rgba(0, 245, 212, 0.4)'
           }} />
        </div>

        {/* Input Overlap */}
        <input 
            type="range" 
            min={min} 
            max={max} 
            value={value} 
            onChange={handleDrag}
            style={{
                width: '100%',
                opacity: 0, // hide default slider thumb, rely on absolute div below
                position: 'absolute',
                zIndex: 10,
                cursor: 'pointer',
                margin: 0,
                height: '100%'
            }}
        />

        {/* Crystalline Thumb Node */}
        <div style={{
            position: 'absolute',
            left: `calc(${percentage}% - 6px)`,
            width: '12px',
            height: '24px',
            background: '#ffffff',
            boxShadow: '0 0 12px rgba(255,255,255,0.8), 0 0 40px rgba(0,245,212,0.6)',
            zIndex: 5,
            pointerEvents: 'none', // Handled by invisible input
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' // Sharp crystal hexagon
        }} />
      </div>
    </div>
  );
}
