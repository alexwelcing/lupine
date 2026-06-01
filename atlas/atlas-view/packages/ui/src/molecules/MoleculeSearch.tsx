import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MOLECULE_PROVIDERS, searchMolecules, type MoleculeHit, type MoleculeSourceId } from './index';
import { loadMoleculeHit } from './load';

const SOURCE_LABELS: Record<MoleculeSourceId, string> = {
  gallery: 'Gallery',
  nist: 'NIST',
  saved: 'Saved',
  pubchem: 'PubChem',
  omol: 'OMol25',
  library: 'Library',
  social: 'Social QRs',
};

const accent = '#1edce0';
const line = 'rgba(255,255,255,0.1)';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${line}`,
  borderRadius: 8,
  color: 'inherit',
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    cursor: 'pointer',
    border: `1px solid ${active ? accent : line}`,
    background: active ? 'rgba(30,220,224,0.16)' : 'transparent',
    color: active ? accent : 'rgba(255,255,255,0.75)',
  };
}

const resultStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'rgba(255,255,255,0.03)',
  border: `1px solid ${line}`,
  borderRadius: 8,
  padding: '9px 11px',
  color: 'inherit',
  cursor: 'pointer',
};

export interface MoleculeSearchProps {
  /** Called after a result is picked + loaded (e.g. to close a modal). */
  onLoaded?: () => void;
  autoFocus?: boolean;
}

export function MoleculeSearch({ onLoaded, autoFocus = true }: MoleculeSearchProps) {
  const [text, setText] = useState('');
  const [hits, setHits] = useState<MoleculeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<MoleculeSourceId | null>(null);
  const reqRef = useRef(0);

  const enabledSources = useMemo(
    () => MOLECULE_PROVIDERS.filter((p) => p.isAvailable()).map((p) => p.id),
    [],
  );

  const run = useCallback(async (q: string, src: MoleculeSourceId | null) => {
    const req = ++reqRef.current;
    setLoading(true);
    try {
      const results = await searchMolecules(
        { text: q, sources: src ? [src] : undefined, limit: 20 },
        MOLECULE_PROVIDERS,
      );
      if (req === reqRef.current) setHits(results);
    } finally {
      if (req === reqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void run(text, source), 220);
    return () => window.clearTimeout(t);
  }, [text, source, run]);

  const onPick = async (hit: MoleculeHit) => {
    try {
      await loadMoleculeHit(hit);
      onLoaded?.();
    } catch {
      /* loader surfaces its own errors via the store */
    }
  };

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search molecules, atom QRs, Gallery, NIST…"
        aria-label="Search molecules"
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setSource(null)} style={chipStyle(source === null)}>All</button>
        {enabledSources.map((s) => (
          <button key={s} onClick={() => setSource(s)} style={chipStyle(source === s)}>
            {SOURCE_LABELS[s]}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
        {loading && hits.length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.6, padding: '4px 2px' }}>Searching…</div>
        )}
        {!loading && hits.length === 0 && text.trim() && (
          <div style={{ fontSize: 13, opacity: 0.6, padding: '4px 2px' }}>No matches.</div>
        )}
        {hits.map((h) => (
          <button key={`${h.source}:${h.id}`} onClick={() => void onPick(h)} style={resultStyle}>
            <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.title}</span>
              <span style={{ color: accent, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{SOURCE_LABELS[h.source]}</span>
            </div>
            {(h.subtitle || h.formula) && (
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.subtitle ?? h.formula}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
