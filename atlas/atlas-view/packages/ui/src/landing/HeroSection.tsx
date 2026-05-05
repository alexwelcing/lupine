import { useMemo } from 'react';
import { ParticleCanvas } from './ParticleCanvas';
import { AnimatedCounter } from './AnimatedCounter';
import { ALL_EXAMPLES } from './shared';

export function HeroSection() {
  const stats = useMemo(() => {
    const totalAtoms = ALL_EXAMPLES.reduce((sum, e) => {
      const n = parseInt(e.atoms.replace(/[^0-9]/g, ''));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const totalSims = ALL_EXAMPLES.filter(e => e.available).length;
    const domains = new Set(ALL_EXAMPLES.map(e => e.domain)).size;
    return { totalAtoms, totalSims, domains };
  }, []);

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 56px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, #0a0e1a 0%, #020204 70%)',
      }}
    >
      <ParticleCanvas />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 24px' }}>
        {/* Logo mark */}
        <div
          style={{
            animation: 'heroFadeIn 1s ease-out forwards',
            opacity: 0,
          }}
        >
          <div
            style={{
              width: 80, height: 80,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #0f62fe, #d04ed6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 28px',
              boxShadow: '0 16px 40px rgba(15,98,254,0.3), 0 0 60px rgba(15,98,254,0.1)',
              animation: 'float 6s ease-in-out infinite',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="1.5">
              <circle cx="24" cy="16" r="6" />
              <circle cx="14" cy="32" r="6" />
              <circle cx="34" cy="32" r="6" />
              <line x1="21" y1="21" x2="17" y2="27" strokeLinecap="round" />
              <line x1="27" y1="21" x2="31" y2="27" strokeLinecap="round" />
              <line x1="20" y1="32" x2="28" y2="32" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            margin: '0 0 16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a8b8d8 50%, #6b8cce 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'heroFadeIn 1s ease-out 0.2s forwards',
            opacity: 0,
            filter: 'drop-shadow(0 0 40px rgba(15,98,254,0.15))',
          }}
        >
          glimPSE
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 'clamp(16px, 2.5vw, 22px)',
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 400,
            maxWidth: 520,
            margin: '0 auto 40px',
            lineHeight: 1.5,
            animation: 'heroFadeIn 1s ease-out 0.4s forwards',
            opacity: 0,
          }}
        >
          Molecular dynamics, visualized in your browser. Explore millions of atoms in real time — no installation, no waiting.
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 56,
            animation: 'heroFadeIn 1s ease-out 0.6s forwards',
            opacity: 0,
          }}
        >
          <a
            href="#dropzone"
            style={{
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #0f62fe, #7c3aed)',
              border: 'none',
              borderRadius: 100,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(15,98,254,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,98,254,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(15,98,254,0.35)';
            }}
          >
            Drop a File
          </a>
          <a
            href="#gallery"
            style={{
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 100,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
          >
            Browse Gallery
          </a>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 40,
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'heroFadeIn 1s ease-out 0.8s forwards',
            opacity: 0,
          }}
        >
          {[
            { value: stats.totalSims, label: 'Simulations', suffix: '+' },
            { value: Math.floor(stats.totalAtoms / 1000), label: 'Thousand Atoms', suffix: 'K+' },
            { value: stats.domains, label: 'Scientific Domains', suffix: '' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'clamp(28px, 4vw, 40px)',
                  fontWeight: 700,
                  color: '#f8fafc',
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                <AnimatedCounter target={stat.value} suffix={stat.suffix} duration={2500 + i * 400} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          animation: 'heroFadeIn 1s ease-out 1.2s forwards',
          opacity: 0,
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Scroll
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" style={{ animation: 'scrollBounce 2s ease-in-out infinite' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  );
}
