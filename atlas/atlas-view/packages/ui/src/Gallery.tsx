/**
 * Gallery — Stitch-designed simulation showcase with real snapshots
 * and interactive GLB hover previews.
 *
 * Each card shows a real rendered snapshot. On hover, the snapshot
 * swaps for an interactive 3D GLB preview controlled by mouse position.
 */

import { useCallback, useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { useStore } from './store';
import galleryData from './gallery-data.json';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─── Types ──────────────────────────────────────────────────────────────

type Domain =
  | 'Metals & Alloys'
  | 'Ceramics & Oxides'
  | 'Polymers & Soft Matter'
  | 'Nanomaterials'
  | 'Biomolecules'
  | 'Energy Materials'
  | 'Defects & Mechanics'
  | 'Methods'
  | 'Fluids & Solvents'
  | 'Advanced Theory & Validation';

interface GalleryExample {
  id: string;
  title: string;
  subtitle: string;
  domain: Domain;
  atoms: string;
  frames: string;
  file: string;
  available: boolean;
  colors: [string, string, string];
  metadata?: {
    method?: string;
    potential?: string;
    temperature?: string;
    ensemble?: string;
    reference?: string;
    doi?: string;
    density?: string;
  };
  featured?: boolean;
}

const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];

const DOMAIN_COLORS: Record<Domain, string> = {
  'Metals & Alloys': '#e8b4b8',
  'Ceramics & Oxides': '#a8d5ba',
  'Polymers & Soft Matter': '#f5e6a3',
  'Nanomaterials': '#b8d4e3',
  'Biomolecules': '#e8c4d9',
  'Energy Materials': '#c4e0c4',
  'Defects & Mechanics': '#f0d9a8',
  'Methods': '#d4d4e8',
  'Fluids & Solvents': '#a8c8e8',
  'Advanced Theory & Validation': '#d9c4e8',
};

const DOMAIN_THREAD: Record<Domain, string> = {
  'Metals & Alloys': '#c9a0a4',
  'Ceramics & Oxides': '#8ab89a',
  'Polymers & Soft Matter': '#d4c984',
  'Nanomaterials': '#98b8c8',
  'Biomolecules': '#c8a4b8',
  'Energy Materials': '#a4c4a4',
  'Defects & Mechanics': '#d0b888',
  'Methods': '#b8b8d0',
  'Fluids & Solvents': '#88a8c8',
  'Advanced Theory & Validation': '#b8a4c8',
};

const ALL_DOMAINS = Object.keys(DOMAIN_COLORS) as Domain[];

// ─── GLB Hover Preview ──────────────────────────────────────────────────

function GLBPreview({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);
  const targetRot = useRef({ x: 0, y: 0 });
  const currentRot = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!groupRef.current) return;
    // Smooth lerp to target rotation
    currentRot.current.x += (targetRot.current.x - currentRot.current.x) * 0.1;
    currentRot.current.y += (targetRot.current.y - currentRot.current.y) * 0.1;
    groupRef.current.rotation.x = currentRot.current.x;
    groupRef.current.rotation.y = currentRot.current.y;
  });

  // Auto-rotate slowly when idle
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  // Center and scale the scene
  const centeredScene = useMemo(() => {
    const cloned = scene.clone();
    const box = new THREE.Box3().setFromObject(cloned);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 3 / maxDim : 1;
    cloned.position.sub(center);
    cloned.scale.setScalar(scale);
    return cloned;
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={centeredScene} />
    </group>
  );
}

function GLBPreviewCanvas({ url, onMouseMove }: { url: string; onMouseMove: (x: number, y: number) => void }) {
  return (
    <div
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * Math.PI * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * Math.PI;
        onMouseMove(x, y);
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0c0c10' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-5, -2, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <GLBPreview url={url} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────────────────────

const sQuilt: React.CSSProperties = {
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
  padding: '0 24px 40px',
};

const sHeader: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 24,
  padding: '20px 0',
  borderBottom: '2px dashed rgba(255,255,255,0.08)',
};

const sHeaderTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
};

const sHeaderIcon: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1.5px dashed rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.7)',
  flexShrink: 0,
};

const sHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
  color: '#f8fafc',
  letterSpacing: '-0.02em',
};

const sSub: React.CSSProperties = {
  margin: '2px 0 0',
  fontSize: 13,
  color: 'rgba(255,255,255,0.4)',
};

const sSearch: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.03)',
  border: '1.5px dashed rgba(255,255,255,0.1)',
  color: 'rgba(255,255,255,0.5)',
  minWidth: 240,
  transition: 'border-color 0.2s, background 0.2s',
};

const sSearchInput: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#f8fafc',
  fontSize: 14,
  flex: 1,
  fontFamily: 'inherit',
};

const sRibbon: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 6,
  marginBottom: 28,
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.015)',
  borderRadius: 10,
  border: '1.5px dashed rgba(255,255,255,0.06)',
};

const sRibbonTab = (active: boolean, threadColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  color: active ? '#f8fafc' : 'rgba(255,255,255,0.45)',
  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
  border: active ? `1.5px dashed ${threadColor}` : '1.5px dashed transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  userSelect: 'none',
});

const sRibbonDot: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  flexShrink: 0,
};

const sRibbonCount: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
};

const sSection: React.CSSProperties = {
  marginBottom: 32,
};

const sSectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 16,
  paddingBottom: 10,
  borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const sSectionThread = (color: string): React.CSSProperties => ({
  width: 3,
  height: 20,
  borderRadius: 2,
  background: color,
  flexShrink: 0,
});

const sSectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#f8fafc',
};

const sSectionCount: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
};

const sSectionMore: React.CSSProperties = {
  marginLeft: 8,
  fontSize: 12,
  color: 'rgba(255,255,255,0.45)',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  padding: '2px 8px',
  borderRadius: 4,
  transition: 'color 0.2s, background 0.2s',
};

const sGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
};

const sPatch = (hovered: boolean, unavailable: boolean, threadColor: string): React.CSSProperties => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column' as const,
  textAlign: 'left' as const,
  background: 'rgba(255,255,255,0.02)',
  borderRadius: 12,
  overflow: 'hidden',
  cursor: unavailable ? 'not-allowed' : 'pointer',
  opacity: unavailable ? 0.4 : 1,
  transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s ease',
  transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
  boxShadow: hovered
    ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${threadColor}30, inset 0 1px 0 ${threadColor}15`
    : '0 2px 8px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
  border: 'none',
  padding: 0,
  width: '100%',
});

const sPatchBorder = (threadColor: string): React.CSSProperties => ({
  position: 'absolute' as const,
  inset: 3,
  borderRadius: 9,
  border: `1.5px dashed ${threadColor}25`,
  pointerEvents: 'none',
  zIndex: 2,
});

const sPatchThumb: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 160,
  overflow: 'hidden',
  background: '#0c0c10',
};

const sPatchImg: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  transition: 'opacity 0.3s ease',
};

const sPatchCanvas: React.CSSProperties = {
  position: 'absolute' as const,
  inset: 0,
  width: '100%',
  height: '100%',
};

const sPatchBody: React.CSSProperties = {
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 6,
  flex: 1,
};

const sPatchBadge: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontWeight: 500,
};

const sPatchDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
};

const sPatchSoon: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: 9,
  padding: '2px 6px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

const sPatchTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#f8fafc',
  lineHeight: 1.3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

const sPatchSubtitle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical' as const,
};

const sPatchTags: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 5,
  marginTop: 4,
};

const sPatchTag: React.CSSProperties = {
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.04)',
  border: '1px dashed rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
};

const sPatchMeta: React.CSSProperties = {
  marginTop: 6,
  paddingTop: 8,
  borderTop: '1px dashed rgba(255,255,255,0.06)',
  fontSize: 10,
  color: 'rgba(255,255,255,0.3)',
  lineHeight: 1.6,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 2,
};

const sPatchLoading: React.CSSProperties = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  background: 'rgba(12,12,16,0.85)',
  backdropFilter: 'blur(4px)',
  zIndex: 10,
  color: 'rgba(255,255,255,0.7)',
  fontSize: 12,
  fontWeight: 500,
};

// ─── Gallery ────────────────────────────────────────────────────────────

export function Gallery() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [search, setSearch] = useState('');

  const filteredExamples = useMemo(() => {
    return EXAMPLES.filter(ex => {
      if (filter !== 'All' && ex.domain !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          ex.title.toLowerCase().includes(s) ||
          ex.subtitle.toLowerCase().includes(s) ||
          ex.domain.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [filter, search]);

  const handleLoad = useCallback(async (example: GalleryExample, isPopState = false) => {
    if (!example.available) return;

    if (!isPopState) {
      const url = new URL(window.location.href);
      url.searchParams.set('sim', example.id);
      window.history.pushState({}, '', url);
    }

    setLoadingId(example.id);
    useStore.getState().setLoading(true, 0);
    try {
      const base = (import.meta as any).env?.BASE_URL || '/';
      const cleanFile = example.file.replace(/^\/+/, '');
      const cleanBase = base.endsWith('/') ? base : `${base}/`;
      const url = `${cleanBase}${cleanFile}`;

      if (example.id === 'lupine_brand_asset') {
        const scientificUrl = `${cleanBase}gallery/curated/lupine_bluebonnet.xyz`.replace(/([^:]\/)\/+/g, "$1");
        const resp = await fetch(scientificUrl);
        const blob = await resp.blob();
        const fileObj = new File([blob], 'lupine_bluebonnet.xyz');
        const { parseFile } = await import('@atlas/parsers');
        const parseResult = await parseFile(fileObj);
        if (!parseResult.trajectory) throw new Error('No trajectory found in scientific prefab');
        const scientificFrame = parseResult.trajectory.frames[0];
        const { generateLupineFrame } = await import('@atlas/core');
        const frame = generateLupineFrame(scientificFrame);

        useStore.getState().setFile({
          name: example.title,
          size: 1024,
          trajectory: {
            frames: [frame],
            totalFrames: 1,
            atomTypes: parseResult.trajectory.atomTypes,
            globalBounds: {
              min: [frame.boxBounds[0], frame.boxBounds[2], frame.boxBounds[4]] as any,
              max: [frame.boxBounds[1], frame.boxBounds[3], frame.boxBounds[5]] as any,
            },
          },
          thermo: null,
          sourceUrl: 'procedural',
        });
        useStore.getState().setRenderStyle('botanical');
        useStore.getState().setAtomScale(1.4);
        setLoadingId(null);
        return;
      }

      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Failed to fetch: ${resp.status}`);
      const blob = await resp.blob();
      const fileObj = new File([blob], example.file.split('/').pop() ?? 'file.dump');
      const { parseFile } = await import('@atlas/parsers');
      const result = await parseFile(fileObj);

      if (result.trajectory) {
        useStore.getState().setFile({
          name: example.title,
          size: blob.size,
          trajectory: result.trajectory,
          thermo: result.thermo ?? null,
          sourceUrl: url,
        });
      }
    } catch (err: any) {
      console.warn(`Gallery load failed for ${example.id}:`, err.message);
      useStore.getState().setError(
        `Could not load "${example.title}" — try dragging the file directly.`
      );
    } finally {
      setLoadingId(null);
    }
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const sim = params.get('sim');
      if (sim) {
        const ex = EXAMPLES.find(e => e.id === sim);
        if (ex && ex.available) handleLoad(ex, true);
      } else {
        useStore.getState().clearFile();
      }
    };
    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [handleLoad]);

  return (
    <div style={sQuilt}>
      {/* ─── Header ─── */}
      <div style={sHeader}>
        <div style={sHeaderTitle}>
          <div style={sHeaderIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="18" r="3" />
              <line x1="9" y1="6" x2="15" y2="6" strokeDasharray="2 2" />
              <line x1="9" y1="18" x2="15" y2="18" strokeDasharray="2 2" />
              <line x1="6" y1="9" x2="6" y2="15" strokeDasharray="2 2" />
              <line x1="18" y1="9" x2="18" y2="15" strokeDasharray="2 2" />
            </svg>
          </div>
          <div>
            <h2 style={sHeading}>Simulation Quilt</h2>
            <p style={sSub}>
              {filteredExamples.length} curated patches — drag, drop, or click to explore
            </p>
          </div>
        </div>

        <div style={sSearch}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search patches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={sSearchInput}
          />
        </div>
      </div>

      {/* ─── Filter ribbon ─── */}
      <div style={sRibbon}>
        <button
          style={sRibbonTab(filter === 'All', 'rgba(255,255,255,0.2)')}
          onClick={() => setFilter('All')}
        >
          All
          <span style={sRibbonCount}>{EXAMPLES.length}</span>
        </button>
        {ALL_DOMAINS.map(domain => {
          const count = EXAMPLES.filter(e => e.domain === domain).length;
          return (
            <button
              key={domain}
              style={sRibbonTab(filter === domain, DOMAIN_THREAD[domain])}
              onClick={() => setFilter(domain)}
            >
              <span style={{ ...sRibbonDot, background: DOMAIN_COLORS[domain] }} />
              {domain}
              <span style={sRibbonCount}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Quilt grid ─── */}
      {filter === 'All' && !search ? (
        ALL_DOMAINS.map(domain => {
          const domainExamples = filteredExamples.filter(ex => ex.domain === domain);
          if (domainExamples.length === 0) return null;
          const isTruncated = domainExamples.length > 6;
          const displayExamples = isTruncated ? domainExamples.slice(0, 6) : domainExamples;

          return (
            <section key={domain} style={sSection}>
              <div style={sSectionHeader}>
                <div style={sSectionThread(DOMAIN_THREAD[domain])} />
                <h3 style={sSectionTitle}>{domain}</h3>
                <span style={sSectionCount}>{domainExamples.length} patches</span>
                {isTruncated && (
                  <button
                    style={sSectionMore}
                    onClick={() => setFilter(domain)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f8fafc';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    View all →
                  </button>
                )}
              </div>
              <div style={sGrid}>
                {displayExamples.map((ex) => (
                  <PatchCard
                    key={ex.id}
                    example={ex}
                    hovered={hoveredId === ex.id}
                    loading={loadingId === ex.id}
                    onHover={() => setHoveredId(ex.id)}
                    onLeave={() => setHoveredId(null)}
                    onClick={() => handleLoad(ex, false)}
                  />
                ))}
              </div>
            </section>
          );
        })
      ) : (
        <div style={sGrid}>
          {filteredExamples.map((ex) => (
            <PatchCard
              key={ex.id}
              example={ex}
              hovered={hoveredId === ex.id}
              loading={loadingId === ex.id}
              onHover={() => setHoveredId(ex.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => handleLoad(ex, false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Patch Card ─────────────────────────────────────────────────────────

function PatchCard({
  example,
  hovered,
  loading,
  onHover,
  onLeave,
  onClick,
}: {
  example: GalleryExample;
  hovered: boolean;
  loading: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgError, setImgError] = useState(false);
  const [glbRot, setGlbRot] = useState({ x: 0, y: 0 });
  const domainColor = DOMAIN_COLORS[example.domain];
  const threadColor = DOMAIN_THREAD[example.domain];

  const snapshotUrl = `/gallery/snapshots/${example.id}.jpg`;
  const glbUrl = `/gallery/models/${example.id}.glb`;

  // Procedural fallback thumbnail
  useEffect(() => {
    if (!imgError) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const c1 = example.colors[0] || '#444';
    const c2 = example.colors[1] || c1;
    const c3 = example.colors[2] || c1;

    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 4) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const seed = example.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i: number) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 49297;
      return x - Math.floor(x);
    };

    const nParticles = 40 + Math.floor(rng(0) * 30);
    for (let i = 0; i < nParticles; i++) {
      const px = rng(i * 3 + 1) * w;
      const py = rng(i * 3 + 2) * h;
      const r = 2 + rng(i * 3 + 3) * 4;
      const colors = [c1, c2, c3];
      const col = colors[Math.floor(rng(i * 7) * 3)];

      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      glow.addColorStop(0, col + '35');
      glow.addColorStop(1, col + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }

    ctx.strokeStyle = c1 + '18';
    ctx.lineWidth = 1;
    const pts: [number, number][] = [];
    for (let i = 0; i < Math.min(nParticles, 24); i++) {
      pts.push([rng(i * 3 + 1) * w, rng(i * 3 + 2) * h]);
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        if (dx * dx + dy * dy < 2500) {
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[j][0], pts[j][1]);
          ctx.stroke();
        }
      }
    }
  }, [example, imgError]);

  const showGlbPreview = hovered && !imgError && example.available;

  return (
    <button
      style={sPatch(hovered, !example.available, threadColor)}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={loading || !example.available}
    >
      <div style={sPatchBorder(threadColor)} />

      <div style={sPatchThumb}>
        {/* Snapshot image (default) */}
        {!imgError && (
          <img
            src={snapshotUrl}
            alt={example.title}
            style={{
              ...sPatchImg,
              opacity: showGlbPreview ? 0 : 1,
              position: showGlbPreview ? 'absolute' : 'relative',
            }}
            onError={() => setImgError(true)}
          />
        )}

        {/* Procedural canvas fallback */}
        {(imgError || !example.available) && (
          <canvas
            ref={canvasRef}
            width={320}
            height={160}
            style={sPatchCanvas}
          />
        )}

        {/* Interactive GLB preview on hover */}
        {showGlbPreview && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <GLBPreviewCanvas
              url={glbUrl}
              onMouseMove={(x, y) => setGlbRot({ x: y * 0.5, y: x })}
            />
          </div>
        )}
      </div>

      <div style={sPatchBody}>
        <div style={sPatchBadge}>
          <span style={{ ...sPatchDot, background: domainColor }} />
          {example.domain}
          {!example.available && <span style={sPatchSoon}>Soon</span>}
        </div>

        <h4 style={sPatchTitle}>{example.title}</h4>
        <p style={sPatchSubtitle}>{example.subtitle}</p>

        <div style={sPatchTags}>
          <span style={sPatchTag}>{example.atoms} atoms</span>
          <span style={sPatchTag}>{example.frames} frames</span>
        </div>

        {hovered && example.metadata && (
          <div style={sPatchMeta}>
            {example.metadata.potential && (
              <div>Potential: {example.metadata.potential}</div>
            )}
            {example.metadata.temperature && (
              <div>Temp: {example.metadata.temperature}</div>
            )}
            {example.metadata.method && (
              <div>Method: {example.metadata.method}</div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div style={sPatchLoading}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="12"
              fill="none"
              stroke={threadColor}
              strokeWidth="2"
              strokeDasharray="60 20"
              strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 16 16"
                to="360 16 16"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
          <span>Loading...</span>
        </div>
      )}
    </button>
  );
}
