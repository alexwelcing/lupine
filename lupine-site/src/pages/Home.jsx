import React from 'react';
import { Link } from 'react-router-dom';
import EntropyLattice from '../components/EntropyLattice.jsx';
import HeaShowcase from '../components/hea/HeaShowcase.jsx';
import VisualAssetsShowcase from '../components/VisualAssetsShowcase.jsx';

export default function Home() {
  return (
    <div className="home-page">
      <header className="hero webgpu-active">
        <div className="hero-content">
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

      {/* The new Stitch-generated component */}
      <section style={{ margin: '80px 40px' }}>
         <EntropyLattice />
      </section>

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
            color: var(--lupine-400);
            margin-bottom: 24px;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 16px 36px;
            background: linear-gradient(135deg, var(--lupine-700), var(--lupine-600));
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
            color: var(--slate-200);
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
