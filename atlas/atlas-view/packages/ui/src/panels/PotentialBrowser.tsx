/**
 * PotentialBrowser — NIST IPR Potential Library
 *
 * Browse 675 interatomic potentials by element, pair style, year, and query.
 * Styled to match the existing Gallery aesthetic (glassmorphic cards,
 * dashed borders, dark theme).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import type { NistCatalogEntry, NistSummary } from '@atlas/nist';
import {
  loadNistCatalog,
  summarize,
  filterCatalog,
  allElements,
  allPairStyles,
} from '@atlas/nist';
import { getElementSpecBySymbol } from '@atlas/core';

// Base for NIST catalog + demo trajectories. Defaults to the bundled
// public/nist/ path (catalog JSON is small — fine to ship). Heavy demo
// trajectories belong in object storage: set VITE_NIST_BASE_URL (e.g.
// https://storage.googleapis.com/<bucket>/nist) at build/deploy and the
// app loads them from there with zero code change.
const NIST_BASE = String(
  import.meta.env.VITE_NIST_BASE_URL ?? '/nist',
).replace(/\/$/, '');

// ─── Types ──────────────────────────────────────────────────────────────

interface PotentialCardProps {
  potential: NistCatalogEntry;
  onSelect: (id: string) => void;
  onLoadDemo: (id: string) => void;
}

// ─── Element Color Helper ───────────────────────────────────────────────

function elementColor(symbol: string): string {
  const spec = getElementSpecBySymbol(symbol);
  return spec?.color ?? '#94a3b8';
}

// ─── Card ───────────────────────────────────────────────────────────────

function PotentialCard({ potential, onSelect, onLoadDemo }: PotentialCardProps) {
  const [hovered, setHovered] = useState(false);
  const hasDemo = !!potential.demo_path;

  // Pair-style → thread color
  const threadColor = useMemo(() => {
    const map: Record<string, string> = {
      eam: '#b8d4e3',
      'eam/alloy': '#e8b4b8',
      'eam/fs': '#c4e0c4',
      'eam/cd': '#f0d9a8',
      meam: '#d4d4e8',
      'meam/spline': '#d9c4e8',
      tersoff: '#a8d5ba',
      sw: '#f5e6a3',
      adp: '#e8c4d9',
      bop: '#a8c8e8',
      reax: '#d0b888',
    };
    return map[potential.pair_style] ?? '#94a3b8';
  }, [potential.pair_style]);

  return (
    <button
      style={sPatch(hovered, false, threadColor)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(potential.id)}
    >
      {/* Header band */}
      <div style={sPatchHeader(threadColor)}>
        <span style={sPairStyleBadge(threadColor)}>{potential.pair_style}</span>
        <span style={sYear}>{potential.year}</span>
      </div>

      {/* Body */}
      <div style={sPatchBody}>
        <div style={sPatchTitle}>{potential.short_label}</div>
        <div style={sPatchId} title={potential.id}>
          {potential.id}
        </div>

        {/* Element pills */}
        <div style={sElementRow}>
          {potential.elements.map((el) => (
            <span key={el} style={sElementPill(elementColor(el))}>
              {el}
            </span>
          ))}
        </div>

        {potential.doi && (
          <a
            href={`https://doi.org/${potential.doi}`}
            target="_blank"
            rel="noreferrer"
            style={sDoi}
            onClick={(e) => e.stopPropagation()}
          >
            DOI ↗
          </a>
        )}
      </div>

      {/* Footer actions */}
      <div style={sPatchFooter}>
        <button
          style={sDemoBtn(hasDemo, hovered)}
          disabled={!hasDemo}
          onClick={(e) => {
            e.stopPropagation();
            if (hasDemo) onLoadDemo(potential.id);
          }}
        >
          {hasDemo ? '▶ Load Demo' : 'Demo pending'}
        </button>
      </div>
    </button>
  );
}

// ─── Browser ────────────────────────────────────────────────────────────

export function PotentialBrowser() {
  const catalog = useStore((s) => s.nistCatalog);
  const setCatalog = useStore((s) => s.setNistCatalog);
  const setActiveId = useStore((s) => s.setActivePotentialId);
  const setShow = useStore((s) => s.setShowPotentialBrowser);

  const [query, setQuery] = useState('');
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [selectedPairStyles, setSelectedPairStyles] = useState<string[]>([]);
  const [summary, setSummary] = useState<NistSummary | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load catalog on first mount
  useEffect(() => {
    if (catalog) return;
    loadNistCatalog(`${NIST_BASE}/nist_catalog.json`)
      .then((data) => {
        setCatalog(data);
        setSummary(summarize(data));
      })
      .catch((err) => console.error('Failed to load NIST catalog:', err));
  }, [catalog, setCatalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return filterCatalog(catalog, {
      query,
      elements: selectedElements,
      pair_styles: selectedPairStyles,
      year_min: null,
      year_max: null,
      single_element_only: false,
    });
  }, [catalog, query, selectedElements, selectedPairStyles]);

  const elements = useMemo(() => (catalog ? allElements(catalog) : []), [catalog]);
  const pairStyles = useMemo(() => (catalog ? allPairStyles(catalog) : []), [catalog]);

  const toggleElement = (el: string) => {
    setSelectedElements((prev) =>
      prev.includes(el) ? prev.filter((e) => e !== el) : [...prev, el]
    );
  };

  const togglePairStyle = (ps: string) => {
    setSelectedPairStyles((prev) =>
      prev.includes(ps) ? prev.filter((p) => p !== ps) : [...prev, ps]
    );
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    // Auto-load the demo trajectory on selection when one exists, so a
    // single click on a potential card opens it in the viewer. The
    // explicit "Load Demo" button remains for re-loading.
    const entry = catalog?.find((c) => c.id === id);
    if (entry?.demo_path) {
      void handleLoadDemo(id);
    }
  };

  const handleLoadDemo = async (id: string) => {
    const entry = catalog?.find((c) => c.id === id);
    if (!entry?.demo_path) {
      console.warn('[NIST] No demo available for', id);
      return;
    }

    const demoUrl = `${NIST_BASE}/${entry.demo_path}`;

    // Clean up any previous streaming session
    if ((window as any).__atlasStreamingCleanup) {
      (window as any).__atlasStreamingCleanup();
      delete (window as any).__atlasStreamingCleanup;
    }

    const { isGlimbinUrl } = await import('@atlas/parsers/StreamingLoader');
    if (!isGlimbinUrl(demoUrl)) {
      console.warn('[NIST] Demo is not a glimbin:', demoUrl);
      return;
    }

    const store = useStore.getState();
    store.setLoading(true, 0.1);

    try {
      const { StreamingLoader } = await import('@atlas/parsers/StreamingLoader');
      const loader = new StreamingLoader(demoUrl, {
        onProgress: (_phase, progress) => {
          useStore.getState().setLoading(true, 0.1 + progress * 0.6);
        },
        onTelemetry: (stats) => {
          useStore.getState().setStreamingTelemetry(stats);
        },
      });

      const header = await loader.fetchHeader();
      await loader.fetchIndex();
      const frame0 = await loader.fetchFrame(0);
      const meta = loader.getMetadata()!;

      const placeholderFrames = new Array(meta.totalFrames);
      placeholderFrames[0] = frame0;

      store.setFile({
        name: entry.short_label || entry.id,
        size: meta.fileSize,
        trajectory: {
          frames: placeholderFrames,
          totalFrames: meta.totalFrames,
          atomTypes: meta.atomTypes,
          globalBounds: meta.globalBounds,
        },
        thermo: null,
        sourceUrl: demoUrl,
      });

      const unsubFrameWatch = useStore.subscribe(
        (s) => s.frame,
        async (frameIndex) => {
          const currentFile = useStore.getState().file;
          if (!currentFile) return;
          if (currentFile.trajectory.frames[frameIndex]) return;
          try {
            const frame = await loader.fetchFrame(frameIndex);
            const file = useStore.getState().file;
            if (file) {
              file.trajectory.frames[frameIndex] = frame;
              useStore.setState({ file: { ...file } });
            }
            const isPlaying = useStore.getState().playing;
            loader.prefetch(frameIndex, isPlaying ? 1 : 0, isPlaying ? 8 : 3);
          } catch (err: any) {
            console.warn(`[streaming] Frame ${frameIndex} fetch failed:`, err.message);
          }
        }
      );

      (window as any).__atlasStreamingCleanup = () => {
        unsubFrameWatch();
        loader.dispose();
      };

      store.setLoading(false, 1);
      setShow(false);
    } catch (err: any) {
      console.error('[NIST] Failed to load demo:', err);
      store.setLoading(false);
      store.setError?.(err.message || 'Demo load failed');
    }
  };

  if (!catalog) {
    return (
      <div style={sQuilt} data-testid="potential-browser-loading">
        <div style={{ color: 'rgba(255,255,255,0.5)', padding: 40, textAlign: 'center' }}>
          Loading NIST Potential Library…
        </div>
      </div>
    );
  }

  return (
    <div style={sQuilt} data-testid="potential-browser">
      {/* Header */}
      <div style={sHeader}>
        <div style={sHeaderTitle}>
          <div style={sHeaderIcon}>⚛</div>
          <div>
            <h2 style={sHeading}>NIST Potential Library</h2>
            <p style={sSub}>
              {summary?.total_potentials ?? catalog.length} interatomic potentials ·{' '}
              {summary?.unique_elements ?? 0} elements · {summary?.unique_pair_styles ?? 0} pair styles
            </p>
          </div>
        </div>

        <div style={sSearch}>
          <span style={{ opacity: 0.5 }}>🔎</span>
          <input
            ref={searchRef}
            style={sSearchInput}
            placeholder="Search potentials…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button style={sClearBtn} onClick={() => { setQuery(''); searchRef.current?.focus(); }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Element filter ribbon */}
      <div style={sRibbon}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>Elements</span>
        {elements.map((el) => {
          const active = selectedElements.includes(el);
          return (
            <button
              key={el}
              style={sElementChip(active, elementColor(el))}
              onClick={() => toggleElement(el)}
            >
              {el}
            </button>
          );
        })}
        {selectedElements.length > 0 && (
          <button style={sClearFilter} onClick={() => setSelectedElements([])}>
            Clear
          </button>
        )}
      </div>

      {/* Pair style filter ribbon */}
      <div style={sRibbon}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginRight: 6 }}>Pair styles</span>
        {pairStyles.map((ps) => {
          const active = selectedPairStyles.includes(ps);
          return (
            <button
              key={ps}
              style={sRibbonTab(active, '#94a3b8')}
              onClick={() => togglePairStyle(ps)}
            >
              {ps}
              <span style={sRibbonCount}>
                {catalog.filter((c) => c.pair_style === ps).length}
              </span>
            </button>
          );
        })}
        {selectedPairStyles.length > 0 && (
          <button style={sClearFilter} onClick={() => setSelectedPairStyles([])}>
            Clear
          </button>
        )}
      </div>

      {/* Results count */}
      <div style={sSectionHeader}>
        <div style={sSectionThread('#1edce0')} />
        <h3 style={sSectionTitle}>Results</h3>
        <span style={sSectionCount}>
          {filtered.length} of {catalog.length}
        </span>
      </div>

      {/* Card grid */}
      <div style={sGrid}>
        {filtered.map((pot) => (
          <PotentialCard
            key={pot.id}
            potential={pot}
            onSelect={handleSelect}
            onLoadDemo={handleLoadDemo}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 60 }}>
          No potentials match the current filters.
        </div>
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const sQuilt: React.CSSProperties = {
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
  padding: '0 24px 40px',
  overflowY: 'auto',
  height: '100%',
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
  fontSize: 20,
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
  minWidth: 260,
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

const sClearBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.4)',
  cursor: 'pointer',
  fontSize: 12,
  padding: 2,
};

const sRibbon: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 6,
  marginBottom: 16,
  padding: '10px 14px',
  background: 'rgba(255,255,255,0.015)',
  borderRadius: 10,
  border: '1.5px dashed rgba(255,255,255,0.06)',
  alignItems: 'center',
};

const sRibbonTab = (active: boolean, _threadColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: active ? 600 : 500,
  color: active ? '#f8fafc' : 'rgba(255,255,255,0.45)',
  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
  border: active ? '1.5px dashed rgba(255,255,255,0.25)' : '1.5px dashed transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  userSelect: 'none',
});

const sRibbonCount: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: 500,
};

const sElementChip = (active: boolean, color: string): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  color: active ? '#0f0f14' : '#f8fafc',
  background: active ? color : 'rgba(255,255,255,0.04)',
  border: `1.5px dashed ${active ? color : 'rgba(255,255,255,0.1)'}`,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  userSelect: 'none',
});

const sClearFilter: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 11,
  color: 'rgba(255,255,255,0.4)',
  background: 'transparent',
  border: '1.5px dashed rgba(255,255,255,0.1)',
  cursor: 'pointer',
  marginLeft: 'auto',
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

const sPatchHeader = (color: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  borderBottom: `1px solid ${color}20`,
  background: `${color}08`,
});

const sPairStyleBadge = (color: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  color,
  padding: '2px 8px',
  borderRadius: 4,
  background: `${color}15`,
  border: `1px dashed ${color}30`,
});

const sYear: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  fontVariantNumeric: 'tabular-nums',
};

const sPatchBody: React.CSSProperties = {
  padding: '14px',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const sPatchTitle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#f8fafc',
  letterSpacing: '-0.01em',
};

const sPatchId: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.3)',
  fontFamily: 'monospace',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const sElementRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 6,
  marginTop: 2,
};

const sElementPill = (color: string): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  padding: '3px 8px',
  borderRadius: 4,
  color: '#0f0f14',
  background: color,
  border: `1px solid ${color}`,
});

const sDoi: React.CSSProperties = {
  fontSize: 11,
  color: '#60a5fa',
  textDecoration: 'none',
  marginTop: 'auto',
  paddingTop: 4,
};

const sPatchFooter: React.CSSProperties = {
  padding: '10px 14px',
  borderTop: '1px solid rgba(255,255,255,0.04)',
  display: 'flex',
  gap: 8,
};

const sDemoBtn = (enabled: boolean, hovered: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '6px 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  border: 'none',
  cursor: enabled ? 'pointer' : 'not-allowed',
  background: enabled
    ? hovered
      ? 'rgba(30, 220, 224, 0.15)'
      : 'rgba(30, 220, 224, 0.08)'
    : 'rgba(255,255,255,0.03)',
  color: enabled ? '#1edce0' : 'rgba(255,255,255,0.25)',
  transition: 'all 0.2s ease',
});
