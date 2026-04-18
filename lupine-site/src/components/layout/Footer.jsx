import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.05)',
      padding: '60px 40px',
      marginTop: '80px',
      textAlign: 'center',
      color: 'var(--slate-400)'
    }}>
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '24px' }}>
        <Link to="/team" style={{ color: 'inherit', textDecoration: 'none' }}>Team</Link>
        <Link to="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</Link>
        <Link to="/investors" style={{ color: 'inherit', textDecoration: 'none' }}>Investors</Link>
        <Link to="/docs" style={{ color: 'inherit', textDecoration: 'none' }}>Documentation</Link>
      </div>
      <p style={{ fontSize: '13px' }}>© {new Date().getFullYear()} Lupine Materials Science. The Unified Computational Platform.</p>
    </footer>
  );
}
