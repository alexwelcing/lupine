import { useEffect, useRef, useState } from 'react';
import { Gallery } from '../Gallery';
import { PotentialBrowser } from '../panels/PotentialBrowser';

export function GallerySection() {
  const [visible, setVisible] = useState(false);
  const [tab, setTab] = useState<'simulations' | 'potentials'>('simulations');
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Allow deep-linking to the potentials tab
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'potentials') {
      setTab('potentials');
      params.delete('tab');
      const url = new URL(window.location.href);
      url.search = params.toString();
      window.history.replaceState({}, '', url);
    }
  }, []);

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
      {/* Tab bar */}
      <div style={sTabBar} role="tablist" aria-label="Catalog">
        <button
          role="tab"
          aria-selected={tab === 'simulations'}
          data-testid="tab-simulations"
          style={sTab(tab === 'simulations', '#1edce0')}
          onClick={() => setTab('simulations')}
        >
          Simulations
        </button>
        <button
          role="tab"
          aria-selected={tab === 'potentials'}
          data-testid="tab-potentials"
          style={sTab(tab === 'potentials', '#c084fc')}
          onClick={() => setTab('potentials')}
        >
          NIST Potentials
        </button>
      </div>

      {tab === 'simulations' ? <Gallery /> : <PotentialBrowser />}
    </section>
  );
}

const sTabBar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  marginBottom: 32,
  padding: '0 24px',
};

const sTab = (active: boolean, color: string): React.CSSProperties => ({
  padding: '8px 20px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  color: active ? '#f8fafc' : 'rgba(255,255,255,0.45)',
  background: active ? `${color}15` : 'transparent',
  border: active ? `1.5px dashed ${color}` : '1.5px dashed rgba(255,255,255,0.1)',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});
