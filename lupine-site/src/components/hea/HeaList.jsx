import React from 'react';

export default function HeaList({ items }) {
  // items is an array of strings: ['Primary Phase: FCC', 'Secondary Phase: BCC']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {items.map((item, index) => (
        <div key={index} style={{
          padding: '24px 32px',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderLeft: `4px solid ${index % 2 === 0 ? '#bbc3ff' : '#00f5d4'}`, 
          color: '#e2e2e2',
          fontFamily: '"JetBrains Mono", var(--font-sans)',
          fontSize: '13px',
          letterSpacing: '0.05em',
          cursor: 'default',
          transition: 'background 0.3s, transform 0.3s',
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)';
            e.currentTarget.style.zIndex = 10;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.zIndex = 1;
        }}
        >
          {/* Index Marker to emphasize structural density */}
          <div style={{
              color: 'rgba(255,255,255,0.2)', 
              fontSize: '10px', 
              fontWeight: 700 
          }}>
              [0{index + 1}]
          </div>
          <div>{item}</div>
        </div>
      ))}
    </div>
  );
}
