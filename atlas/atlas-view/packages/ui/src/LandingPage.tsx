/**
 * LandingPage — Splash landing experience for glimPSE
 *
 * Architecture:
 *   1. HeroSection    — particle constellation background, title, stats, scroll cue
 *   2. FeaturedShowcase — 6 visually stunning featured molecules
 *   3. DropZone       — tactile file upload with animated border
 *   4. Gallery        — full stitch-designed quilt (imported)
 *   5. LandingFooter  — stats + CTA
 *
 * All animations are CSS-driven with IntersectionObserver triggers.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useStore } from './store';
import { Gallery } from './Gallery';
import galleryData from './gallery-data.json';

// ─── Types ──────────────────────────────────────────────────────────────

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: string;
  atoms: string;
  frames: string;
  file: string;
  available: boolean;
  colors: [string, string, string];
  featured?: boolean;
  metadata?: Record<string, string>;
}

const ALL_EXAMPLES: GalleryExample[] = galleryData as any[];

const FEATURED_IDS = [
  'c60_buckyball',
  'au_nanocluster',
  'cnt_6_6',
  'graphene_ribbon',
  'water_cluster_64',
  'cuzr_melt',
];

// ─── CSS Animations (injected once) ─────────────────────────────────────

const ANIMATION_CSS = `
@keyframes heroFadeIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes heroScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(15,98,254,0.15); }
  50% { box-shadow: 0 0 40px rgba(15,98,254,0.35); }
}
@keyframes breathe {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}
@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(8px); opacity: 1; }
}
@keyframes threadGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes counterUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes borderDash {
  to { stroke-dashoffset: -20; }
}
`;

// ─── Particle Background ────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;
    let mouse = { x: -1000, y: -1000 };
    let raf = 0;

    const PARTICLE_COUNT = Math.min(120, Math.floor((w * h) / 12000));
    const CONNECT_DIST = 120;
    const MOUSE_REPULSE = 150;

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.2,
    }));

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -1000; mouse.y = -1000; };
    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', onResize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_REPULSE && dist > 0) {
          const force = (MOUSE_REPULSE - dist) / MOUSE_REPULSE;
          p.vx += (dx / dist) * force * 0.8;
          p.vy += (dy / dist) * force * 0.8;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(120, 180, 255, ${p.opacity})`;
        ctx.fill();

        // Connections
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const cdx = p.x - q.x;
          const cdy = p.y - q.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < CONNECT_DIST) {
            const alpha = (1 - cdist / CONNECT_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(100, 160, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'auto',
      }}
    />
  );
}

// ─── Animated Counter ───────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <div ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{value.toLocaleString()}{suffix}
    </div>
  );
}

// ─── Hero Section ───────────────────────────────────────────────────────

function HeroSection() {
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

// ─── Featured Showcase ──────────────────────────────────────────────────

function FeaturedShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const featured = useMemo(() => {
    return FEATURED_IDS.map(id => ALL_EXAMPLES.find(e => e.id === id)).filter(Boolean) as GalleryExample[];
  }, []);

  const handleLoad = useCallback(async (example: GalleryExample) => {
    if (!example.available) return;
    const url = new URL(window.location.href);
    url.searchParams.set('sim', example.id);
    window.history.pushState({}, '', url);
    // Trigger gallery load logic via event
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        padding: '80px 24px',
        background: 'linear-gradient(180deg, #020204 0%, #0a0e18 100%)',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 16,
            marginBottom: 40,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease-out',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 3.5vw, 36px)',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '-0.02em',
            }}
          >
            Featured Molecules
          </h2>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              transformOrigin: 'left',
              animation: visible ? 'threadGrow 1.2s ease-out 0.3s forwards' : 'none',
              transform: visible ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 1.2s ease-out 0.3s',
            }}
          />
        </div>

        {/* Featured grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {featured.map((ex, i) => {
            const hovered = hoveredId === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => handleLoad(ex)}
                onMouseEnter={() => setHoveredId(ex.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: 'none',
                  padding: 0,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
                  boxShadow: hovered
                    ? '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(15,98,254,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
                  <img
                    src={`/gallery/snapshots/${ex.id}.jpg`}
                    alt={ex.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: hovered ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {/* Gradient overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(2,2,4,0.9) 0%, rgba(2,2,4,0.2) 50%, transparent 100%)',
                  }} />
                  {/* Hover overlay */}
                  {hovered && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(15,98,254,0.15)',
                      backdropFilter: 'blur(2px)',
                    }}>
                      <span style={{
                        padding: '10px 24px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 100,
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                      }}>
                        Explore →
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px 20px', position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}>
                    <span style={{
                      fontSize: 10,
                      padding: '3px 10px',
                      borderRadius: 4,
                      background: 'rgba(15,98,254,0.12)',
                      color: '#6b9fff',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontWeight: 600,
                    }}>
                      {ex.domain}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {ex.atoms} atoms
                    </span>
                  </div>
                  <h3 style={{
                    margin: '0 0 4px',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#f8fafc',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ex.title}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {ex.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Drop Zone Section ──────────────────────────────────────────────────

function DropZoneSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { loading, loadProgress, error, setFile, setLoading, setError } = useStore();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { total, parsed } = e.detail;
      if (total > 0) setLoading(true, parsed / total);
    };
    window.addEventListener('atlas:parse-progress', handler as EventListener);
    return () => window.removeEventListener('atlas:parse-progress', handler as EventListener);
  }, [setLoading]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    const { detectFileType } = await import('@atlas/parsers');
    const sorted = Array.from(files).sort((a, b) => {
      const ta = detectFileType(a.name);
      const tb = detectFileType(b.name);
      if (ta === 'dump' && tb !== 'dump') return -1;
      if (ta !== 'dump' && tb === 'dump') return 1;
      return 0;
    });
    setLoading(true, 0);
    setError(null);
    try {
      let trajectory = null;
      let thermo = null;
      const { parseFile } = await import('@atlas/parsers');
      for (const f of sorted) {
        const result = await parseFile(f);
        if (result.trajectory) trajectory = result.trajectory;
        if (result.thermo) thermo = result.thermo;
      }
      if (trajectory) {
        setFile({ name: sorted[0].name, size: sorted.reduce((s, f) => s + f.size, 0), trajectory, thermo });
      } else {
        throw new Error('No valid trajectory data found in the uploaded files.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    }
  }, [setFile, setLoading, setError]);

  if (loading) {
    return (
      <section id="dropzone" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <svg width="80" height="80" style={{ marginBottom: 20 }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="40" cy="40" r="34"
            fill="none" stroke="#0f62fe" strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * 68}`}
            strokeDashoffset={`${Math.PI * 68 * (1 - loadProgress)}`}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dashoffset 200ms ease-out', filter: 'drop-shadow(0 0 8px rgba(15,98,254,0.4))' }}
          />
        </svg>
        <div style={{ fontSize: 18, fontWeight: 500, color: '#f8fafc', marginBottom: 8 }}>Parsing...</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, monospace)' }}>
          {Math.round(loadProgress * 100)}%
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="dropzone" style={{ padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#ef4444' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div style={{ fontSize: 18, color: '#ef4444', marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>Click or drag to try another file</div>
      </section>
    );
  }

  return (
    <section
      id="dropzone"
      ref={sectionRef}
      style={{
        padding: '100px 24px',
        background: 'linear-gradient(180deg, #0a0e18 0%, #06080d 100%)',
      }}
    >
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s ease-out',
      }}>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: 'clamp(24px, 3.5vw, 36px)',
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '-0.02em',
        }}>
          Bring Your Own Data
        </h2>
        <p style={{
          margin: '0 0 40px',
          fontSize: 16,
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          maxWidth: 480,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          Drop LAMMPS dumps, XYZ coordinates, or log files. We handle the parsing — you handle the science.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".lammpstrj,.dump,.gz,.log,.data,.lmp,.xyz"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />

        <div
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'relative',
            padding: '72px 48px',
            borderRadius: 28,
            border: `1.5px dashed ${dragOver ? '#0f62fe' : 'rgba(255,255,255,0.12)'}`,
            background: dragOver ? 'rgba(15,98,254,0.06)' : 'rgba(255,255,255,0.015)',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: dragOver ? 'pulseGlow 2s ease-in-out infinite' : 'none',
          }}
        >
          {/* Animated SVG border on drag */}
          {dragOver && (
            <svg style={{ position: 'absolute', inset: -2, width: 'calc(100% + 4px)', height: 'calc(100% + 4px)', pointerEvents: 'none' }}>
              <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="28" fill="none" stroke="#0f62fe" strokeWidth="1.5" strokeDasharray="8 4" style={{ animation: 'borderDash 1s linear infinite' }} />
            </svg>
          )}

          <div style={{
            width: 72, height: 72,
            borderRadius: 24,
            background: dragOver ? 'linear-gradient(135deg, #0f62fe, #7c3aed)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${dragOver ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            transition: 'all 0.4s ease',
            transform: dragOver ? 'scale(1.1)' : 'scale(1)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div style={{ fontSize: 20, fontWeight: 600, color: '#f8fafc', marginBottom: 8 }}>
            {dragOver ? 'Drop it here' : 'Drag & drop your files'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
            or click to browse — supports .lammpstrj, .dump, .xyz, .log
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['LAMMPS', 'XYZ', 'GZip', 'Log'].map((tag) => (
              <span key={tag} style={{
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.35)',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Gallery Section ────────────────────────────────────────────────────

function GallerySection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="gallery"
      ref={sectionRef}
      style={{
        padding: '60px 0 100px',
        background: '#06080d',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease-out',
      }}
    >
      <Gallery />
    </section>
  );
}

// ─── Landing Footer ─────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer style={{
      padding: '60px 24px',
      background: 'linear-gradient(180deg, #06080d 0%, #020204 100%)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      textAlign: 'center',
    }}>
      <div style={{
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#f8fafc',
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}>
          Ready to explore?
        </div>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.4)',
          margin: '0 0 24px',
          lineHeight: 1.6,
        }}>
          Pick a simulation from the gallery above or drop your own data to begin.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#dropzone" style={{
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 600,
            color: 'white',
            background: 'linear-gradient(135deg, #0f62fe, #7c3aed)',
            borderRadius: 100,
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(15,98,254,0.3)',
          }}>
            Upload a File
          </a>
          <a href="#gallery" style={{
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 100,
            textDecoration: 'none',
          }}>
            Browse Gallery
          </a>
        </div>
        <div style={{
          marginTop: 40,
          fontSize: 12,
          color: 'rgba(255,255,255,0.2)',
        }}>
          glimPSE — built with Lupine Science
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ──────────────────────────────────────────────────

export function LandingPage() {
  return (
    <>
      <style>{ANIMATION_CSS}</style>
      <div style={{ width: '100%', minHeight: '100vh', background: '#020204' }}>
        <HeroSection />
        <FeaturedShowcase />
        <DropZoneSection />
        <GallerySection />
        <LandingFooter />
      </div>
    </>
  );
}
