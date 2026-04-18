import React, { useState } from 'react';

export default function HeaButton({ children, onClick, variant = 'primary' }) {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle = {
    padding: '16px 32px',
    border: 'none',
    borderRadius: '0px', // Strict Zero-Radius Mandate
    fontFamily: '"JetBrains Mono", var(--font-sans)',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  };

  const variants = {
    primary: {
      background: isHovered 
        ? 'linear-gradient(135deg, #26fedc 0%, #00dfc1 100%)' // High luminosity on hover
        : 'linear-gradient(135deg, #d7fff3 0%, #00dfc1 100%)', // Iridescent Teal
      color: '#00201a',
      boxShadow: isHovered ? '0 0 40px rgba(0, 245, 212, 0.2)' : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'none'
    },
    ghost: {
      background: 'transparent',
      color: '#d7fff3',
      border: '1px solid rgba(131, 148, 143, 0.15)', // The Ghost Border
      boxShadow: isHovered ? '0 0 30px rgba(0, 245, 212, 0.05) inset' : 'none',
      transform: isHovered ? 'translateY(-1px)' : 'none'
    }
  };

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Decorative Matrix Node */}
      <div style={{
          width: '4px',
          height: '4px',
          background: variant === 'primary' ? '#00201a' : '#d7fff3',
          opacity: isHovered ? 1 : 0.6
      }} />
      {children}
    </button>
  );
}
