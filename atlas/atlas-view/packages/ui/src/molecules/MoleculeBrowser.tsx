import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  searchMolecules,
  MOLECULE_PROVIDERS,
  type MoleculeHit,
  type MoleculeSourceId,
} from './index';
import { loadMoleculeHit } from './load';

/**
 * MoleculeBrowser — one browsable, source-filterable grid over ALL molecule
 * collections (Gallery, NIST, Saved, Meta OMol25, PubChem, Library).
 *
 * The curated Gallery only shows ~34 hand-picked entries, so the 27,697-structure
 * Meta OMol25 dataset (and the other federated sources) had no browsable surface.
 * This tab fixes that: it runs the federated `searchMolecules()` — which supports
 * query-less browse — and loads any hit via the same `loadMoleculeHit()` path the
 * rest of the app uses (sets store.file → viewer opens). No bespoke loader.
 */

const ACCENT = '#1edce0';

// Sources offered as filter chips. `null` = all sources. OMol25 (Meta) is
// surfaced prominently — it's the headline collection this tab unlocks.
const SOURCE_CHIPS: { id: MoleculeSourceId | null; label: string; note?: string }[] = [
  { id: null, label: 'All sources' },
  { id: 'omol', label: 'Meta OMol25', note: '27,697 DFT structures' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'nist', label: 'NIST' },
  { id: 'pubchem', label: 'PubChem' },
  { id: 'library', label: 'Library' },
  { id: 'social', label: 'Social QRs' },
  { id: 'saved', label: 'Saved' },
];

// Common element quick-filters (AND across selected). Covers organics + the
// metals/oxides the catalog leans on.
const ELEMENT_CHIPS = ['H', 'C', 'N', 'O', 'F', 'S', 'P', 'Si', 'Cl', 'Fe', 'Cu', 'Ni', 'Li', 'Mg', 'Al', 'Ca'];

// Per-source accent for the card badge so the provenance reads at a glance.
const SOURCE_COLOR: Record<MoleculeSourceId, string> = {
  gallery: '#1edce0',
  nist: '#c084fc',
  saved: '#f59e0b',
  pubchem: '#38bdf8',
  omol: '#34d399',
  library: '#fb7185',
  social: '#111827',
};
const SOURCE_LABEL: Record<MoleculeSourceId, string> = {
  gallery: 'Gallery',
  nist: 'NIST',
  saved: 'Saved',
  pubchem: 'PubChem',
  omol: 'Meta OMol25',
  library: 'Library',
  social: 'Social QRs',
};

const PER_SOURCE_LIMIT = 24;

export function MoleculeBrowser() {
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [source, setSource] = useState<MoleculeSourceId | null>(null);
  const [elements, setElements] = useState<string[]>([]);
  const [hits, setHits] = useState<MoleculeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const reqId = useRef(0);

  // Debounce the free-text query so each keystroke doesn't fan out a search.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 220);
    return () => clearTimeout(t);
  }, [text]);

  // Run the federated search whenever the query / source / elements change.
  // PER_SOURCE_LIMIT caps each provider; an empty query is a browse (every
  // provider returns its first N).
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    searchMolecules(
      {
        text: debounced.trim(),
        elements: elements.length ? elements : undefined,
        sources: source ? [source] : undefined,
        limit: PER_SOURCE_LIMIT,
      },
      MOLECULE_PROVIDERS,
    )
      .then((results) => {
        if (id === reqId.current) setHits(results);
      })
      .catch(() => {
        if (id === reqId.current) setHits([]);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [debounced, source, elements]);

  const toggleElement = (el: string) =>
    setElements((prev) => (prev.includes(el) ? prev.filter((x) => x !== el) : [...prev, el]));

  const launch = async (hit: MoleculeHit) => {
    setLoadingId(`${hit.source}:${hit.id}`);
    try {
      await loadMoleculeHit(hit);
      // loadMoleculeHit → loadMoleculeSource → setFile(): the viewer takes over.
    } catch {
      setLoadingId(null);
    }
  };

  const countLabel = useMemo(() => {
    if (loading) return 'Searching…';
    const base = `${hits.length} result${hits.length === 1 ? '' : 's'}`;
    return hits.length >= PER_SOURCE_LIMIT ? `${base}+ (refine to narrow)` : base;
  }, [loading, hits.length]);

  return (
    <div style={wrapStyle}>
      {/* ─── Controls ─── */}
      <div style={controlsStyle}>
        <div style={searchRowStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search every collection — formula, element, name…"
            aria-label="Search molecules across all collections"
            style={searchInputStyle}
          />
        </div>

        <div style={chipRowStyle} role="group" aria-label="Source">
          {SOURCE_CHIPS.map((c) => {
            const active = source === c.id;
            return (
              <button
                key={c.label}
                onClick={() => setSource(c.id)}
                title={c.note}
                style={sourceChipStyle(active)}
              >
                {c.label}
                {c.note && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 10 }}>· {c.note}</span>}
              </button>
            );
          })}
        </div>

        <div style={chipRowStyle} role="group" aria-label="Element filter">
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', marginRight: 2 }}>
            Contains
          </span>
          {ELEMENT_CHIPS.map((el) => {
            const active = elements.includes(el);
            return (
              <button key={el} onClick={() => toggleElement(el)} style={elementChipStyle(active)}>
                {el}
              </button>
            );
          })}
          {elements.length > 0 && (
            <button onClick={() => setElements([])} style={clearChipStyle}>clear</button>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{countLabel}</div>
      </div>

      {/* ─── Result grid ─── */}
      {hits.length === 0 && !loading ? (
        <div style={emptyStyle}>
          No molecules match. Try a formula (e.g. <em>C6H6</em>), an element chip, or a different source.
        </div>
      ) : (
        <div style={gridStyle}>
          {hits.map((hit) => {
            const key = `${hit.source}:${hit.id}`;
            const busy = loadingId === key;
            const color = SOURCE_COLOR[hit.source] ?? ACCENT;
            return (
              <button key={key} onClick={() => launch(hit)} disabled={busy} style={cardStyle(busy)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={cardTitleStyle}>{hit.title}</span>
                  <span style={badgeStyle(color)}>{SOURCE_LABEL[hit.source]}</span>
                </div>
                {hit.subtitle && <div style={cardSubtitleStyle}>{hit.subtitle}</div>}
                {hit.elements && hit.elements.length > 0 && (
                  <div style={elementsRowStyle}>
                    {hit.elements.slice(0, 8).map((el) => (
                      <span key={el} style={elementPillStyle}>{el}</span>
                    ))}
                    {hit.elements.length > 8 && <span style={elementPillStyle}>+{hit.elements.length - 8}</span>}
                  </div>
                )}
                {busy && <div style={busyStyle}>Loading…</div>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───
const wrapStyle: CSSProperties = {
  maxWidth: 1100, margin: '0 auto', padding: '0 24px',
  display: 'flex', flexDirection: 'column', gap: 16,
};
const controlsStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 };
const searchRowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'rgba(255,255,255,0.05)', border: '1px solid #1f2937', borderRadius: 100,
  padding: '10px 18px',
};
const searchInputStyle: CSSProperties = {
  flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
  color: '#f8fafc', fontSize: 15,
};
const chipRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const sourceChipStyle = (active: boolean): CSSProperties => ({
  padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  color: active ? '#04141a' : '#cbd5e1',
  background: active ? ACCENT : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? ACCENT : '#1f2937'}`,
  transition: 'background 120ms, color 120ms, border-color 120ms',
});
const elementChipStyle = (active: boolean): CSSProperties => ({
  minWidth: 30, padding: '5px 9px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  fontFamily: 'var(--font-mono, ui-monospace), monospace',
  color: active ? '#04141a' : '#94a3b8',
  background: active ? ACCENT : 'rgba(255,255,255,0.04)',
  border: `1px solid ${active ? ACCENT : '#1f2937'}`,
  transition: 'background 120ms, color 120ms',
});
const clearChipStyle: CSSProperties = {
  padding: '5px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
  color: '#64748b', background: 'transparent', border: '1px solid #334155',
};
const gridStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10,
};
const cardStyle = (busy: boolean): CSSProperties => ({
  position: 'relative', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6,
  padding: '12px 14px', borderRadius: 10, cursor: busy ? 'default' : 'pointer',
  background: '#0d1117', border: '1px solid #1f2937',
  opacity: busy ? 0.6 : 1, transition: 'border-color 120ms, background 120ms',
});
const cardTitleStyle: CSSProperties = {
  color: '#f1f5f9', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono, ui-monospace), monospace',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const badgeStyle = (color: string): CSSProperties => ({
  flexShrink: 0, padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: '0.04em',
  color, background: `${color}1f`, border: `1px solid ${color}55`,
});
const cardSubtitleStyle: CSSProperties = {
  color: '#64748b', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
const elementsRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 };
const elementPillStyle: CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#94a3b8', padding: '1px 5px', borderRadius: 4,
  background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2937',
  fontFamily: 'var(--font-mono, ui-monospace), monospace',
};
const busyStyle: CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, color: ACCENT, fontWeight: 700, background: 'rgba(6,8,13,0.6)', borderRadius: 10,
};
const emptyStyle: CSSProperties = {
  color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '40px 16px',
};
