import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={scrolled ? 'scrolled' : ''}>
      <Link to="/" className="nav-brand">
        <svg className="logo-mark" viewBox="0 0 32 32" fill="none">
          <path d="M16 2L2 9.5V22.5L16 30L30 22.5V9.5L16 2Z" fill="url(#brandGrad)" />
          <defs>
            <linearGradient id="brandGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="var(--lupine-500)" />
              <stop offset="1" stopColor="var(--violet-500)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="nav-brand-text">Lupine Materials Science</div>
      </Link>
      <div className="nav-links">
        <Link to="/platform-architecture">Platform</Link>
        <Link to="/team">Team</Link>
        <Link to="/docs">Docs</Link>
        <a href="https://lupinematerials.science" target="_blank" rel="noopener noreferrer">Viewer</a>
        <Link to="/pricing" className="nav-cta">Early Access</Link>
      </div>
    </nav>
  );
}
