/**
 * Gallery — Expanded simulation showcase for research
 *
 * Curated examples spanning materials classes and simulation types.
 * Each includes metadata for academic attribution.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useStore } from './store';
import galleryData from './gallery-data.json';

// ─── Example definitions ──────────────────────────────────────────────

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
  /** Whether the data file is available on disk */
  available: boolean;
  colors: [string, string, string];
  /** Scientific metadata */
  metadata?: {
    method?: string;
    potential?: string;
    temperature?: string;
    ensemble?: string;
    reference?: string;
    doi?: string;
    density?: string;
  };
}

const DOMAIN_COLORS: Record<Domain, string> = {
  'Metals & Alloys': '#ff6b6b',
  'Ceramics & Oxides': '#4ecdc4',
  'Polymers & Soft Matter': '#ffe66d',
  'Nanomaterials': '#a8e6cf',
  'Biomolecules': '#ff8b94',
  'Energy Materials': '#7fd8be',
  'Defects & Mechanics': '#ffd93d',
  'Methods': '#c7ceea',
  'Fluids & Solvents': '#82b1ff',
  'Advanced Theory & Validation': '#bf5cf0',
};

const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];

// ─── Gallery Component ────────────────────────────────────────────────

export function Gallery() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Domain | 'All'>('All');
  const [search, setSearch] = useState('');

  const filteredExamples = EXAMPLES.filter(ex => {
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

  const handleLoad = useCallback(async (example: GalleryExample) => {
    if (!example.available) return;
    setLoadingId(example.id);
    useStore.getState().setLoading(true, 0);
    try {
      const base = (import.meta as any).env?.BASE_URL || '/';
      const cleanFile = example.file.replace(/^\/+/, '');
      const cleanBase = base.endsWith('/') ? base : `${base}/`;
      const url = `${cleanBase}${cleanFile}`;

      if (example.id === 'lupine_brand_asset') {
        // Fetch and parse the scientific XYZ molecule first
        const scientificUrl = `${cleanBase}gallery/curated/lupine_bluebonnet.xyz`.replace(/([^:]\/)\/+/g, "$1");
        const resp = await fetch(scientificUrl);
        const blob = await resp.blob();
        const fileObj = new File([blob], 'lupine_bluebonnet.xyz');
        const { parseFile } = await import('@atlas/parsers');
        const parseResult = await parseFile(fileObj);
        if (!parseResult.trajectory) throw new Error("No trajectory found in scientific prefab");
        const scientificFrame = parseResult.trajectory.frames[0];

        // Pass the scientific frame to the procedural instancer
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
        
        // Force botanical preset for perfect detailed view
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

  return (
    <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 16,
        }}>
          <div style={{
            width: 3, height: 20,
            background: 'linear-gradient(180deg, var(--accent), #b480ff)',
            borderRadius: 2,
          }} />
          <span style={{
            fontSize: 16, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            Example Library
          </span>
          <span style={{
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            {filteredExamples.length} simulations
          </span>
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 16,
        }}>
          {(['All', ...Object.keys(DOMAIN_COLORS)] as (Domain | 'All')[]).map(domain => (
            <button
              key={domain}
              onClick={() => setFilter(domain)}
              style={{
                padding: '6px 12px',
                fontSize: 12, fontWeight: 500,
                color: filter === domain ? 'white' : 'var(--text-muted)',
                background: filter === domain ? 'var(--accent)' : 'transparent',
                border: `1px solid ${filter === domain ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 20,
                cursor: 'pointer',
                transition: 'all 100ms ease-out',
              }}
            >
              {domain}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search examples..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 400,
            padding: '10px 14px',
            fontSize: 14,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Grid */}
      {filter === 'All' && !search ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {(Object.keys(DOMAIN_COLORS) as Domain[]).map(domain => {
            const domainExamples = filteredExamples.filter(ex => ex.domain === domain);
            if (domainExamples.length === 0) return null;
            
            // Limit to 6 items in the "All" overview, except if they search
            const isTruncated = domainExamples.length > 6;
            const displayExamples = isTruncated ? domainExamples.slice(0, 6) : domainExamples;

            return (
              <div key={domain}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: DOMAIN_COLORS[domain] }} />
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{domain}</h3>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{domainExamples.length} simulations</span>
                  {isTruncated && (
                    <button 
                      onClick={() => setFilter(domain)}
                      style={{ 
                        marginLeft: 'auto', background: 'transparent', border: 'none', 
                        color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 500 
                      }}
                    >
                      View all {domainExamples.length} →
                    </button>
                  )}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: 16,
                }}>
                  {displayExamples.map((ex, i) => (
                    <GalleryCard
                      key={ex.id}
                      example={ex}
                      hovered={hoveredId === ex.id}
                      loading={loadingId === ex.id}
                      onHover={() => setHoveredId(ex.id)}
                      onLeave={() => setHoveredId(null)}
                      onClick={() => handleLoad(ex)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filteredExamples.map((ex, i) => (
            <GalleryCard
              key={ex.id}
              example={ex}
              hovered={hoveredId === ex.id}
              loading={loadingId === ex.id}
              onHover={() => setHoveredId(ex.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => handleLoad(ex)}
              dataDemo={i === 0 ? 'crack2d' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Gallery Card ─────────────────────────────────────────────────────

function GalleryCard({
  example,
  hovered,
  loading,
  onHover,
  onLeave,
  onClick,
  dataDemo,
}: {
  example: GalleryExample;
  hovered: boolean;
  loading: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  dataDemo?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const domainColor = DOMAIN_COLORS[example.domain];

  // Procedural thumbnail
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    // Fallback in case colors array is too short
    const c1 = example.colors[0] || '#444444';
    const c2 = example.colors[1] || c1;
    const c3 = example.colors[2] || c1;

    // Gradient background
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(1, '#040608');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Procedural atoms
    const seed = example.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rng = (i: number) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 49297;
      return x - Math.floor(x);
    };

    const nParticles = 50 + Math.floor(rng(0) * 40);
    for (let i = 0; i < nParticles; i++) {
      const px = rng(i * 3 + 1) * w;
      const py = rng(i * 3 + 2) * h;
      const r = 2 + rng(i * 3 + 3) * 5;
      const colors = [c1, c2, c3];
      const col = colors[Math.floor(rng(i * 7) * 3)];

      // Glow
      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 3);
      glow.addColorStop(0, col + '40');
      glow.addColorStop(1, col + '00');
      ctx.fillStyle = glow;
      ctx.fillRect(px - r * 3, py - r * 3, r * 6, r * 6);

      // Core
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
    }

    // Bonds
    ctx.strokeStyle = c1 + '20';
    ctx.lineWidth = 1;
    const pts: [number, number][] = [];
    for (let i = 0; i < Math.min(nParticles, 30); i++) {
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
  }, [example]);

  return (
    <button
      data-demo={dataDemo}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={loading || !example.available}
      style={{
        position: 'relative',
        opacity: example.available ? 1 : 0.5,
        display: 'flex', flexDirection: 'column',
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-glass)',
        border: `1px solid ${hovered ? domainColor : 'var(--border-subtle)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: loading ? 'wait' : example.available ? 'pointer' : 'default',
        transition: 'all 200ms ease-out',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered
          ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${domainColor}40`
          : 'none',
        textAlign: 'left',
        padding: 0,
        color: 'inherit',
        font: 'inherit',
      }}
    >
      {/* Thumbnail */}
      <canvas
        ref={canvasRef}
        width={300}
        height={130}
        style={{
          width: '100%', height: 130,
          display: 'block',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      />

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        {/* Domain badge */}
        <div style={{
          display: 'inline-block',
          padding: '3px 10px',
          fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: domainColor,
          background: domainColor + '15',
          border: `1px solid ${domainColor}30`,
          borderRadius: 12,
          marginBottom: 10,
        }}>
          {example.domain}{!example.available && ' · Coming soon'}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 4,
          lineHeight: 1.3,
        }}>
          {example.title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: 12,
          color: 'var(--text-dim)',
          lineHeight: 1.4,
          marginBottom: 12,
          minHeight: 34,
        }}>
          {example.subtitle}
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', gap: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}>
          <span style={{
            padding: '3px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}>
            {example.atoms} atoms
          </span>
          <span style={{
            padding: '3px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
          }}>
            {example.frames} frames
          </span>
        </div>

        {/* Metadata preview on hover */}
        {hovered && example.metadata && (
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}>
            {example.metadata.potential && (
              <div>Potential: {example.metadata.potential}</div>
            )}
            {example.metadata.temperature && (
              <div>Temperature: {example.metadata.temperature}</div>
            )}
            {example.metadata.method && (
              <div>Method: {example.metadata.method}</div>
            )}
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
          fontSize: 13, fontWeight: 500,
        }}>
          Loading...
        </div>
      )}
    </button>
  );
}
