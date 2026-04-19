import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer-system">
      <div className="footer-horizon"></div>
      
      <div className="footer-content">
        <div className="telemetry-block">
          <h3 className="matrix-title">System Telemetry</h3>
          <div className="telemetry-item">
            <span className="telemetry-label">Kernel Status</span>
            <span className="telemetry-value text-glow-cyan"><span className="status-dot"></span> Online</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Uptime</span>
            <span className="telemetry-value">99.998%</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Security</span>
            <span className="telemetry-value">AES-256 GCM</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Active Compute</span>
            <span className="telemetry-value text-glow-indigo">340 TFLOPs</span>
          </div>
        </div>

        <div className="matrix-navs">
          <div className="nav-column">
            <h3 className="matrix-title">[01] PLATFORM</h3>
            <Link to="/platform-architecture">Architecture</Link>
            <Link to="/pricing">Compute Tiers</Link>
            <Link to="/security">Security</Link>
          </div>
          <div className="nav-column">
            <h3 className="matrix-title">[02] RESOURCES</h3>
            <Link to="/docs">Documentation</Link>
            <Link to="/api">API Reference</Link>
            <Link to="/github">Repository</Link>
          </div>
          <div className="nav-column">
            <h3 className="matrix-title">[03] COMPANY</h3>
            <Link to="/team">Team</Link>
            <Link to="/investors">Investors</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </div>

      <div className="footer-monolith-wrapper">
         <h1 className="monolith-text">LUPINE</h1>
      </div>

      <div className="footer-copyright">
        <span>© {new Date().getFullYear()} Lupine Materials Science.</span>
        <span>The Unified Computational Platform.</span>
      </div>

      <style>{`
        .footer-system {
          position: relative;
          background-color: #0a0b10;
          color: var(--slate-400);
          margin-top: 120px;
          padding-top: 80px;
          border-top: 1px solid var(--slate-800);
          overflow: hidden;
        }

        .footer-horizon {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-primary), var(--indigo-500), transparent);
          box-shadow: 0 0 20px 2px var(--color-primary), 0 0 40px 5px var(--indigo-500);
          opacity: 0.8;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 60px;
          padding: 0 40px 60px;
          position: relative;
          z-index: 10;
        }

        @media (min-width: 768px) {
          .footer-content {
            flex-direction: row;
            justify-content: space-between;
          }
        }

        .matrix-title {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.25em;
          color: var(--slate-500);
          margin-bottom: 24px;
          text-transform: uppercase;
        }

        .telemetry-block {
          flex: 1;
          max-width: 320px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 2px solid var(--slate-800);
          padding: 24px;
          border-radius: 8px;
          backdrop-filter: blur(8px);
        }

        .telemetry-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px dotted rgba(255,255,255,0.1);
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .telemetry-item:last-child {
          border-bottom: none;
        }

        .telemetry-label {
          color: var(--slate-400);
        }

        .telemetry-value {
          color: var(--slate-200);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background-color: var(--color-primary);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--color-primary);
          animation: pulse-dot 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .text-glow-cyan {
          color: var(--color-primary);
          text-shadow: 0 0 10px rgba(93, 217, 208, 0.3);
        }

        .text-glow-indigo {
          color: var(--indigo-400);
          text-shadow: 0 0 10px rgba(129, 140, 248, 0.3);
        }

        .matrix-navs {
          display: flex;
          flex-wrap: wrap;
          gap: 64px;
          flex: 2;
          justify-content: flex-end;
        }

        .nav-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nav-column a {
          color: var(--slate-300);
          text-decoration: none;
          font-family: var(--font-sans);
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .nav-column a:hover {
          color: var(--color-on-surface);
          text-shadow: 0 0 8px rgba(255,255,255,0.4);
          transform: translateX(4px);
        }

        .footer-monolith-wrapper {
           position: relative;
           width: 100%;
           display: flex;
           justify-content: center;
           pointer-events: none;
           user-select: none;
           margin-top: -60px; 
           z-index: 1;
        }

        .monolith-text {
            font-size: clamp(80px, 20vw, 320px);
            font-weight: 900;
            line-height: 0.7;
            margin: 0;
            color: transparent;
            -webkit-text-stroke: 1px rgba(255,255,255,0.06);
            background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 90%);
            -webkit-background-clip: text;
            letter-spacing: -0.04em;
            transform: translateY(15%);
        }

        .footer-copyright {
          position: absolute;
          bottom: 24px;
          left: 40px;
          right: 40px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-family: var(--font-mono);
          color: rgba(255,255,255,0.2);
          z-index: 20;
        }
        
        @media (max-width: 600px) {
           .footer-copyright {
              flex-direction: column;
              align-items: center;
              gap: 8px;
              position: relative;
              bottom: auto;
              left: auto;
              right: auto;
              margin-top: 60px;
              padding-bottom: 24px;
           }
           .matrix-navs {
              gap: 40px;
              justify-content: flex-start;
           }
           .telemetry-block {
              max-width: 100%;
           }
        }
      `}</style>
    </footer>
  );
}
