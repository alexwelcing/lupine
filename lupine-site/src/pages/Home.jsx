import React from 'react';
import { Link } from 'react-router-dom';
import HeaShowcase from '../components/hea/HeaShowcase.jsx';
import VisualAssetsShowcase from '../components/VisualAssetsShowcase.jsx';

export default function Home() {
  return (
    <div className="home-page">
      <header className="hero">
        <div className="hero-orbits">
          <div className="orbit-ring"></div>
          <div className="orbit-ring"></div>
          <div className="orbit-ring"></div>
        </div>
        <div className="hero-content">
          <div className="hero-logo">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="lupine-svg-logo">
              <circle cx="40" cy="40" r="5" fill="#9ba6ea"/>
              <circle cx="40" cy="40" r="4" fill="#7b8ae0"/>
              <ellipse cx="40" cy="40" rx="30" ry="10" stroke="url(#grad1)" strokeWidth="1.2" fill="none">
                <animateTransform attributeName="transform" type="rotate" dur="8s" from="0 40 40" to="360 40 40" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="40" cy="40" rx="30" ry="10" stroke="url(#grad2)" strokeWidth="1.2" fill="none" transform="rotate(60 40 40)">
                <animateTransform attributeName="transform" type="rotate" dur="12s" from="60 40 40" to="420 40 40" repeatCount="indefinite"/>
              </ellipse>
              <ellipse cx="40" cy="40" rx="30" ry="10" stroke="url(#grad3)" strokeWidth="1.2" fill="none" transform="rotate(120 40 40)">
                <animateTransform attributeName="transform" type="rotate" dur="10s" from="120 40 40" to="480 40 40" repeatCount="indefinite"/>
              </ellipse>
              <path d="M40 8 C43 20, 46 30, 40 35 C34 30, 37 20, 40 8Z" fill="#5565d4" opacity="0.75"/>
              <path d="M40 72 C37 60, 34 50, 40 45 C46 50, 43 60, 40 72Z" fill="#5565d4" opacity="0.55"/>
              <path d="M8 40 C20 37, 30 34, 35 40 C30 46, 20 43, 8 40Z" fill="#8b6bc4" opacity="0.65"/>
              <path d="M72 40 C60 43, 50 46, 45 40 C50 34, 60 37, 72 40Z" fill="#8b6bc4" opacity="0.45"/>
              <path d="M17 17 C26 23, 32 29, 35 35 C29 32, 23 26, 17 17Z" fill="#4ecdc4" opacity="0.4"/>
              <path d="M63 63 C54 57, 48 51, 45 45 C51 48, 57 54, 63 63Z" fill="#4ecdc4" opacity="0.3"/>
              <circle r="2" fill="#9ba6ea">
                <animateMotion dur="8s" repeatCount="indefinite" path="M40,30 A10,10 0 1,1 40,50 A10,10 0 1,1 40,30"/>
              </circle>
              <circle r="1.5" fill="#b9a0e0">
                <animateMotion dur="12s" repeatCount="indefinite" path="M30,40 A10,10 0 1,1 50,40 A10,10 0 1,1 30,40"/>
              </circle>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#5565d4" stopOpacity="0.8"/><stop offset="100%" stopColor="#5565d4" stopOpacity="0.1"/></linearGradient>
                <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8b6bc4" stopOpacity="0.7"/><stop offset="100%" stopColor="#8b6bc4" stopOpacity="0.1"/></linearGradient>
                <linearGradient id="grad3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4ecdc4" stopOpacity="0.5"/><stop offset="100%" stopColor="#4ecdc4" stopOpacity="0.1"/></linearGradient>
              </defs>
            </svg>
          </div>
          <div className="hero-label">The Unified Platform</div>
          <h1>
             Compute the <em>Future</em> of Materials
          </h1>
          <p className="hero-sub">
            Lupine Materials Science is building the unified computational platform for materials discovery. From quantum DFT to molecular dynamics to ML potentials — one system, zero fragmentation.
          </p>
          <div className="hero-actions">
            <Link to="/pricing" className="btn-primary">Get Early Access</Link>
            <Link to="/platform-architecture" className="btn-secondary">Explore Architecture</Link>
          </div>
        </div>
      </header>



      {/* Visual Assets Showcase from web viewer assets */}
      <VisualAssetsShowcase />

      {/* High Entropy Density Alloy Design System Showcase */}
      <HeaShowcase />

      {/* Legacy CSS expects to find elements with these classes */}
      <style>{`
        .hero {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            position: relative;
            padding: 120px 40px 80px;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background:
                radial-gradient(ellipse 80% 50% at 50% 30%, rgba(46, 58, 135, 0.15) 0%, transparent 70%),
                radial-gradient(ellipse 60% 40% at 70% 60%, rgba(91, 58, 140, 0.1) 0%, transparent 60%),
                radial-gradient(ellipse 40% 30% at 30% 70%, rgba(78, 205, 196, 0.05) 0%, transparent 50%);
            pointer-events: none;
        }
        
        .hero-content {
            position: relative;
            z-index: 2;
            max-width: 900px;
        }
        
        .hero h1 {
            font-family: var(--font-serif);
            font-size: clamp(36px, 5.5vw, 72px);
            font-weight: 400;
            line-height: 1.15;
            color: var(--slate-100);
            margin-bottom: 28px;
        }
        
        .hero h1 em {
            font-style: italic;
            background: linear-gradient(135deg, var(--lupine-400), var(--violet-300));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .hero-sub {
            font-size: 18px;
            color: var(--slate-400);
            max-width: 620px;
            margin: 0 auto 48px;
            line-height: 1.8;
            font-weight: 300;
        }
        
        .hero-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
        }
        
        .hero-label {
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            color: var(--color-primary);
            margin-bottom: 24px;
        }

        .hero-orbits {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 700px;
            height: 700px;
            pointer-events: none;
            opacity: 0.12;
        }

        .orbit-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            border: 1px solid var(--color-primary);
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }

        .orbit-ring:nth-child(1) {
            width: 300px;
            height: 300px;
            animation: orbit-spin 20s linear infinite;
        }

        .orbit-ring:nth-child(2) {
            width: 500px;
            height: 200px;
            animation: orbit-spin 30s linear infinite reverse;
            transform: translate(-50%, -50%) rotate(60deg);
        }

        .orbit-ring:nth-child(3) {
            width: 600px;
            height: 250px;
            animation: orbit-spin 25s linear infinite;
            transform: translate(-50%, -50%) rotate(-30deg);
        }

        @keyframes orbit-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .hero-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 40px;
            animation: hero-logo-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes hero-logo-in {
            from {
                opacity: 0;
                transform: scale(0.6) translateY(20px);
            }
            to {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 16px 36px;
            background: linear-gradient(135deg, var(--color-primary-container), var(--color-primary));
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-secondary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 16px 36px;
            background: rgba(255, 255, 255, 0.04);
            color: var(--color-on-surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s;
        }
      `}</style>
    </div>
  );
}
