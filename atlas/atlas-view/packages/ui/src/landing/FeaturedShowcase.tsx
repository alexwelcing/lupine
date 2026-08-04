import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ALL_EXAMPLES, FEATURED_IDS, type GalleryExample } from './shared';
import { FeaturedCard } from './FeaturedCard';
import { openMolecule } from '../viewer/openMolecule';

/**
 * FeaturedShowcase — the landing "Featured Molecules" grid.
 *
 * Each card is a self-sufficient FeaturedCard whose hero art is always a branded
 * procedural thumbnail, with the real rendered snapshot fading in over it when it
 * exists. Missing snapshots can no longer leave a card looking broken.
 */
export function FeaturedShowcase() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const featured = useMemo(
    () => FEATURED_IDS.map((id) => ALL_EXAMPLES.find((e) => e.id === id)).filter(Boolean) as GalleryExample[],
    [],
  );

  const handleOpen = useCallback((example: GalleryExample) => {
    void openMolecule({ kind: 'gallery', id: example.id, history: 'push' });
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{ padding: 'clamp(40px, 6vw, 80px) 16px', background: 'linear-gradient(180deg, #020204 0%, #0a0e18 100%)' }}
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
          <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            Featured Molecules
          </h2>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
              transformOrigin: 'left',
              transform: visible ? 'scaleX(1)' : 'scaleX(0)',
              transition: 'transform 1.2s ease-out 0.3s',
            }}
          />
        </div>

        {/* Featured grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {featured.map((ex, i) => (
            <FeaturedCard key={ex.id} example={ex} index={i} visible={visible} onOpen={handleOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}
