import { useMemo, useState } from 'react';
import { ParticleCanvas } from './ParticleCanvas';
import { AnimatedCounter } from './AnimatedCounter';
import { HeroMoleculePreview } from './HeroMoleculePreview';
import { ALL_EXAMPLES } from './shared';
import { useStore } from '../store';
import { openRandomOmol25Molecule } from '../molecules/randomOmol';

export function HeroSection() {
  const openConfigurator = useStore((s) => s.openConfigurator);
  const [heroQuery, setHeroQuery] = useState('');
  const submitHeroQuery = () => openConfigurator(heroQuery.trim() || undefined);
  const stats = useMemo(() => {
    const totalAtoms = ALL_EXAMPLES.reduce((sum, e) => {
      const n = parseInt(e.atoms.replace(/[^0-9]/g, ''));
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
    const totalSims = ALL_EXAMPLES.filter(e => e.available).length;
    const domains = new Set(ALL_EXAMPLES.map(e => e.domain)).size;
    return { totalAtoms, totalSims, domains };
  }, []);

  // Primary activation: load a random real OMol25 geometry — no file, no wall.
  const viewAMolecule = () => void openRandomOmol25Molecule();

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
          LUPI
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
          Click any molecule and explore it in 3D — then save and share your view. No install, and no signup just to look.
        </p>

        {/* Type-a-molecule search → guided MCP configurator */}
        <div
          style={{
            maxWidth: 540,
            margin: '0 auto 24px',
            animation: 'heroFadeIn 1s ease-out 0.5s forwards',
            opacity: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 100,
              padding: '6px 6px 6px 18px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitHeroQuery(); }}
              placeholder="Type a molecule — e.g. graphene, LiFePO₄, copper…"
              aria-label="Type a molecule to configure and view"
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: 15,
              }}
            />
            <button
              type="button"
              onClick={submitHeroQuery}
              style={{
                flexShrink: 0,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                background: 'linear-gradient(135deg, #0f62fe, #7c3aed)',
                border: 'none',
                borderRadius: 100,
                cursor: 'pointer',
              }}
            >
              Build a view
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
            A few quick questions → we assemble the MCP request and load it for you.
          </div>
        </div>

        {/* CTA Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 32,
            animation: 'heroFadeIn 1s ease-out 0.6s forwards',
            opacity: 0,
          }}
        >
          <button
            type="button"
            onClick={viewAMolecule}
            style={{
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #0f62fe, #7c3aed)',
              border: 'none',
              borderRadius: 100,
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
            View a molecule →
          </button>
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

        {/* Live viewer preview — a small, always-on rotating molecule that opens
            the real viewer on click. */}
        <div
          style={{
            margin: '0 auto 44px',
            width: 'min(440px, 84vw)',
            animation: 'heroFadeIn 1s ease-out 0.75s forwards',
            opacity: 0,
          }}
        >
          <HeroMoleculePreview onOpen={viewAMolecule} style={{ width: '100%', aspectRatio: '16 / 10' }} />
        </div>

        {/* Tertiary: power-users with their own data */}
        <div
          style={{
            marginTop: -36,
            marginBottom: 56,
            animation: 'heroFadeIn 1s ease-out 0.7s forwards',
            opacity: 0,
          }}
        >
          <a
            href="#dropzone"
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              borderBottom: '1px dashed rgba(255,255,255,0.25)',
              paddingBottom: 1,
            }}
          >
            or drop your own LAMMPS / XYZ file →
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
