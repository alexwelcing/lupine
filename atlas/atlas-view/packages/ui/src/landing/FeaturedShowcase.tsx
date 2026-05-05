import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ALL_EXAMPLES, FEATURED_IDS, type GalleryExample } from './shared';

export function FeaturedShowcase() {
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
