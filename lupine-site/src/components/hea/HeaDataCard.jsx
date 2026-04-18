import React from 'react';

export default function HeaDataCard({ title, composition }) {
  // composition is an array of objects: { element: 'Titanium', value: 99.9, color: '#d7fff3' }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#1b1b1b', // surface-container-low
      padding: '32px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Vector Mesh in Background */}
      <div style={{
          position: 'absolute',
          top: -20, right: -20, opacity: 0.05,
          fontFamily: '"JetBrains Mono", monospace', fontSize: '140px', lineHeight: 1, pointerEvents: 'none'
      }}>
        HEA
      </div>

      <header style={{ marginBottom: '32px' }}>
        <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            color: '#fff',
            margin: '0 0 8px 0',
            fontWeight: '400',
            letterSpacing: '0.02em',
            fontStyle: 'italic'
        }}>
            {title}
        </h3>
        <span style={{
            fontFamily: '"JetBrains Mono", var(--font-sans)',
            fontSize: '11px',
            color: '#b9cac4',
            textTransform: 'uppercase',
            letterSpacing: '0.15em'
        }}>
            Density Matrix // Tonal Allocation
        </span>
      </header>

      {/* Tonal Stacking (No borders, just shifting backgrounds) */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {composition.map((item, i) => {
           // Shift tone based on index to create "stacking" depth
           // We move from surface-container-highest down to surface-container-lowest
           const toneVals = ['#353535', '#2a2a2a', '#1f1f1f', '#181818', '#0e0e0e'];
           const bgTone = toneVals[i % toneVals.length];

           return (
             <div key={item.element} style={{
                backgroundColor: bgTone,
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'background-color 0.3s'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: item.color || '#3a4a46' }} />
                    <span style={{ 
                        fontFamily: '"JetBrains Mono", var(--font-sans)', 
                        fontSize: '14px', 
                        color: '#e2e2e2', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {item.element}
                    </span>
                </div>
                <div style={{
                    fontFamily: '"JetBrains Mono", var(--font-sans)', 
                    fontSize: '15px', 
                    color: item.color || '#00f5d4', 
                    fontWeight: '700'
                }}>
                    {item.value.toFixed(2)}%
                </div>
             </div>
           )
        })}
      </div>
    </div>
  );
}
