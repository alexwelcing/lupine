import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { omolFacets, type OmolFacets } from './providers/omol';
import { searchMolecules, MOLECULE_PROVIDERS, type MoleculeHit } from './index';
import { loadMoleculeHit } from './load';
import { PERIODIC_TABLE, type PeriodicCell } from './periodicTable';
import { FUNCTIONAL_GROUP_BY_ID, type FunctionalGroupId } from '../organicFunctionalGroups';

/**
 * OmolCollection — a dataset-respecting home for Meta FAIR's Open Molecules 2025
 * (OMol25). The creators navigate chemical space by the periodic table + system
 * size, not a flat grid, so that's the primary experience here:
 *
 *  - a masthead with attribution + level of theory + the paper, and live stats
 *    for THIS validation slice vs the full ~83M-system dataset;
 *  - an interactive periodic table where each present element shows its count in
 *    the slice; clicking AND-filters chemical space;
 *  - a method-derived functional-group screen + formula search;
 *  - results load through the standard loadMoleculeHit() path.
 *
 * Every facet is derived from the real index (omolFacets) — no invented fields.
 * The neutral-validation slice carries no source bond topology, no per-record
 * gap, and one internal source id, so those are not surfaced as source truth.
 */

const ACCENT = '#34d399'; // OMol25 green (matches the source badge elsewhere)
const PER_PAGE = 36;
const PAPER_URL = 'https://arxiv.org/abs/2505.08762';
const FULL_DATASET_SYSTEMS = '≈83M systems · 83 elements · up to 350 atoms';

export function OmolCollection() {
  const [facets, setFacets] = useState<OmolFacets | null>(null);
  const [facetError, setFacetError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); // element symbols (AND)
  const [selectedGroups, setSelectedGroups] = useState<FunctionalGroupId[]>([]);
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [hits, setHits] = useState<MoleculeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const reqId = useRef(0);

  // Load the dataset facets once (element coverage + size range).
  useEffect(() => {
    let alive = true;
    omolFacets()
      .then((f) => { if (alive) { setFacets(f); setFacetError(f.total === 0); } })
      .catch(() => { if (alive) setFacetError(true); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 220);
    return () => clearTimeout(t);
  }, [text]);

  // Query OMol25 only, with the selected elements AND-ed in.
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    searchMolecules(
      {
        text: debounced.trim(),
        elements: selected.length ? selected : undefined,
        functionalGroups: selectedGroups.length ? selectedGroups : undefined,
        sources: ['omol'],
        limit: PER_PAGE,
      },
      MOLECULE_PROVIDERS,
    )
      .then((r) => { if (id === reqId.current) setHits(r); })
      .catch(() => { if (id === reqId.current) setHits([]); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [debounced, selected, selectedGroups]);

  // element → count, for lighting up the periodic table.
  const countByElement = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of facets?.elementCounts ?? []) m.set(e.element, e.count);
    return m;
  }, [facets]);

  const groupFacets = facets?.functionalGroupCounts ?? [];
  const selectedGroupLabels = useMemo(
    () => selectedGroups.map((groupId) => FUNCTIONAL_GROUP_BY_ID[groupId]?.label ?? groupId),
    [selectedGroups],
  );
  const maxCount = facets?.elementCounts[0]?.count ?? 1;

  const toggle = (sym: string) =>
    setSelected((prev) => (prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]));

  const toggleGroup = (groupId: FunctionalGroupId) =>
    setSelectedGroups((prev) => (
      prev.includes(groupId) ? prev.filter((x) => x !== groupId) : [...prev, groupId]
    ));

  const launch = async (hit: MoleculeHit) => {
    setLoadingId(`${hit.source}:${hit.id}`);
    try {
      await loadMoleculeHit(hit);
    } catch {
      setLoadingId(null);
    }
  };

  const activeFilterLabel = [
    selected.length ? `containing ${selected.join(' + ')}` : '',
    selectedGroupLabels.length ? `with ${selectedGroupLabels.join(' + ')}` : '',
  ].filter(Boolean).join(' and ');

  const resultLabel = loading
    ? 'Searching…'
    : `${hits.length}${hits.length >= PER_PAGE ? '+' : ''} structure${hits.length === 1 ? '' : 's'}`
      + (activeFilterLabel ? ` ${activeFilterLabel}` : '');

  return (
    <div style={wrapStyle}>
      {/* ─── Masthead ─── */}
      <header style={mastheadStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={kicker}>Meta FAIR Chemistry</span>
          <h2 style={titleStyle}>Open Molecules 2025</h2>
          <span style={pill}>OMol25</span>
        </div>
        <p style={leadStyle}>
          High-accuracy quantum chemistry at the <strong style={{ color: '#e2e8f0' }}>ωB97M-V/def2-TZVPD</strong> level
          of theory. Browse this neutral-validation slice by chemical space and system size, then open any
          structure with its true DFT geometry. <a href={PAPER_URL} target="_blank" rel="noreferrer" style={linkStyle}>Read the paper →</a>
        </p>
        <div style={statRowStyle}>
          <Stat label="Structures (this slice)" value={facets ? facets.total.toLocaleString() : '…'} />
          <Stat label="Elements present" value={facets ? String(facets.elementCounts.length) : '…'} />
          <Stat label="Atoms / structure" value={facets ? `${facets.natoms.min}–${facets.natoms.max} (med ${facets.natoms.median})` : '…'} />
          <Stat label="Full dataset" value={FULL_DATASET_SYSTEMS} subtle />
        </div>
      </header>

      {facetError && (
        <div style={errorStyle}>
          Couldn't reach the OMol25 index right now. The collection is hosted on Google Cloud Storage —
          try again in a moment.
        </div>
      )}

      {/* ─── Periodic table navigator ─── */}
      <section>
        <div style={sectionHeadStyle}>
          <span style={sectionTitleStyle}>Chemical space</span>
          <span style={sectionHintStyle}>
            Click elements to filter (AND). {selected.length > 0
              ? <button onClick={() => setSelected([])} style={clearBtn}>clear {selected.length}</button>
              : 'Lit cells appear in this slice.'}
          </span>
        </div>
        <PeriodicTable
          countByElement={countByElement}
          maxCount={maxCount}
          selected={selected}
          onToggle={toggle}
        />
      </section>

      {groupFacets.length > 0 && (
        <section>
          <div style={sectionHeadStyle}>
            <span style={sectionTitleStyle}>Functional group screen</span>
            <span style={sectionHintStyle}>
              {selectedGroups.length > 0
                ? <button onClick={() => setSelectedGroups([])} style={clearBtn}>clear {selectedGroups.length}</button>
                : 'Lupi geometry screen; not OMol25 source bond topology.'}
            </span>
          </div>
          <div style={groupRailStyle}>
            {groupFacets.map((group) => {
              const active = selectedGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-pressed={active}
                  title={`${group.label} - ${group.count.toLocaleString()} structures`}
                  style={groupButtonStyle(active, group.color)}
                >
                  <span style={groupSwatchStyle(group.color)} />
                  <span style={groupButtonLabelStyle}>{group.label}</span>
                  <span style={groupButtonCountStyle(active)}>{group.count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Search + results ─── */}
      <section>
        <div style={searchRowStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Filter by formula — e.g. C6H6, or an element symbol"
            aria-label="Search OMol25 by formula"
            style={searchInputStyle}
          />
        </div>
        <div style={{ fontSize: 11, color: '#64748b', margin: '8px 2px 12px' }}>{resultLabel}</div>

        {hits.length === 0 && !loading ? (
          <div style={emptyStyle}>
            No structures match{activeFilterLabel ? ` ${activeFilterLabel}` : ''}. Try fewer filters or a different formula.
          </div>
        ) : (
          <div style={gridStyle}>
            {hits.map((hit) => {
              const key = `${hit.source}:${hit.id}`;
              const busy = loadingId === key;
              return (
                <button key={key} onClick={() => launch(hit)} disabled={busy} style={cardStyle(busy)}>
                  <span style={cardTitleStyle}>{hit.title}</span>
                  {hit.subtitle && <span style={cardSubtitleStyle}>{hit.subtitle}</span>}
                  {hit.elements && hit.elements.length > 0 && (
                    <span style={elementsRowStyle}>
                      {hit.elements.map((el) => (
                        <span key={el} style={elementPillStyle(selected.includes(el))}>{el}</span>
                      ))}
                    </span>
                  )}
                  {hit.functionalGroups && hit.functionalGroups.length > 0 && (
                    <span style={cardGroupRowStyle}>
                      {hit.functionalGroups.slice(0, 3).map((groupId) => {
                        const group = FUNCTIONAL_GROUP_BY_ID[groupId];
                        if (!group) return null;
                        return (
                          <span key={groupId} style={cardGroupPillStyle(group.color)}>
                            {group.label}
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {busy && <span style={busyStyle}>Loading…</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Periodic table ───
function PeriodicTable({
  countByElement, maxCount, selected, onToggle,
}: {
  countByElement: Map<string, number>;
  maxCount: number;
  selected: string[];
  onToggle: (sym: string) => void;
}) {
  return (
    <div style={tableGridStyle} role="group" aria-label="Periodic table element filter">
      {PERIODIC_TABLE.map((cell) => (
        <PeriodicButton
          key={cell.symbol}
          cell={cell}
          count={countByElement.get(cell.symbol) ?? 0}
          maxCount={maxCount}
          active={selected.includes(cell.symbol)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function PeriodicButton({
  cell, count, maxCount, active, onToggle,
}: {
  cell: PeriodicCell;
  count: number;
  maxCount: number;
  active: boolean;
  onToggle: (sym: string) => void;
}) {
  const present = count > 0;
  // Heat: scale fill opacity by log-share so the steep H/C/O dominance doesn't
  // wash out the long tail (K, Li, Na, Ca, Mg).
  const heat = present ? 0.18 + 0.55 * (Math.log10(count + 1) / Math.log10(maxCount + 1)) : 0;
  const style: CSSProperties = {
    gridColumn: cell.col,
    gridRow: cell.row,
    position: 'relative',
    aspectRatio: '1 / 1',
    minWidth: 0,
    border: `1px solid ${active ? ACCENT : present ? 'rgba(52,211,153,0.4)' : '#161b24'}`,
    borderRadius: 4,
    background: active ? ACCENT : present ? `rgba(52,211,153,${heat})` : '#0b0e14',
    color: active ? '#04140d' : present ? '#e2f7ee' : '#39424f',
    cursor: present ? 'pointer' : 'default',
    padding: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    transition: 'background 120ms, border-color 120ms, transform 80ms',
    fontFamily: 'var(--font-mono, ui-monospace), monospace',
  };
  return (
    <button
      style={style}
      disabled={!present}
      onClick={() => present && onToggle(cell.symbol)}
      title={present ? `${cell.name} — ${count.toLocaleString()} structures` : `${cell.name} — not in this slice`}
      aria-pressed={active}
    >
      <span style={{ fontSize: 10, fontWeight: 820, lineHeight: 1 }}>{cell.symbol}</span>
      {present && (
        <span style={{ fontSize: 7, opacity: 0.86, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
          {count >= 1000 ? `${Math.round(count / 1000)}k` : count}
        </span>
      )}
    </button>
  );
}

function Stat({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <div style={statStyle}>
      <div style={{ fontSize: subtle ? 12 : 19, fontWeight: 820, color: subtle ? '#94a3b8' : '#f1f5f9', lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={statLabelStyle}>{label}</div>
    </div>
  );
}

// ─── Styles ───
const wrapStyle: CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 26 };
const mastheadStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(52,211,153,0.11), rgba(13,17,23,0.52))',
  border: '1px solid rgba(52,211,153,0.28)', borderRadius: 12, padding: '22px 24px',
  display: 'flex', flexDirection: 'column', gap: 12,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 18px 46px rgba(0,0,0,0.22)',
};
const kicker: CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: ACCENT };
const titleStyle: CSSProperties = { margin: 0, fontSize: 28, fontWeight: 820, color: '#f8fafc', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.08, textWrap: 'balance' };
const pill: CSSProperties = { padding: '2px 9px', borderRadius: 100, fontSize: 11, fontWeight: 800, color: ACCENT, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)' };
const leadStyle: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.6, color: '#a3b2c7', maxWidth: '72ch', textWrap: 'pretty' };
const linkStyle: CSSProperties = { color: ACCENT, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' };
const statRowStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: 10, marginTop: 4 };
const statStyle: CSSProperties = {
  minWidth: 0,
  padding: '10px 11px',
  border: '1px solid rgba(148,163,184,0.12)',
  borderRadius: 8,
  background: 'rgba(2,6,23,0.24)',
};
const statLabelStyle: CSSProperties = { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4, lineHeight: 1.2 };
const errorStyle: CSSProperties = { padding: '12px 14px', borderRadius: 8, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#fca5a5', fontSize: 12 };
const sectionHeadStyle: CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' };
const sectionTitleStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.08em' };
const sectionHintStyle: CSSProperties = { fontSize: 11, color: '#718096', lineHeight: 1.35, textWrap: 'pretty' };
const clearBtn: CSSProperties = { marginLeft: 4, padding: '1px 8px', borderRadius: 100, fontSize: 11, color: ACCENT, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)', cursor: 'pointer' };
const groupRailStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const groupButtonStyle = (active: boolean, color: string): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 32, maxWidth: '100%',
  padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
  color: active ? '#07100b' : '#cbd5e1',
  background: active ? `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 82%, #020617))` : 'rgba(255,255,255,0.045)',
  border: `1px solid ${active ? color : 'rgba(148,163,184,0.14)'}`,
  fontSize: 11, fontWeight: 700,
  boxShadow: active ? `0 8px 22px color-mix(in srgb, ${color} 24%, transparent)` : 'inset 0 1px 0 rgba(255,255,255,0.04)',
});
const groupSwatchStyle = (color: string): CSSProperties => ({
  width: 7, height: 7, borderRadius: 999, flex: '0 0 auto', background: color,
});
const groupButtonLabelStyle: CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const groupButtonCountStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--font-mono, ui-monospace), monospace',
  fontSize: 10,
  fontVariantNumeric: 'tabular-nums',
  color: active ? 'rgba(7,16,11,0.7)' : '#64748b',
});
// 18-column periodic grid; cells place themselves via gridColumn/gridRow.
const tableGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(18, minmax(0, 1fr))',
  gap: 3,
  width: '100%',
};
const searchRowStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(148,163,184,0.16)', borderRadius: 100, padding: '10px 18px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' };
const searchInputStyle: CSSProperties = { flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#f8fafc', fontSize: 14 };
const emptyStyle: CSSProperties = { color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', padding: '40px 16px' };
const gridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 };
const cardStyle = (busy: boolean): CSSProperties => ({
  position: 'relative', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 5,
  minHeight: 132,
  padding: '12px 13px', borderRadius: 8, cursor: busy ? 'default' : 'pointer',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.78), rgba(13,17,23,0.92))',
  border: '1px solid rgba(148,163,184,0.14)', opacity: busy ? 0.6 : 1,
  transition: 'border-color 120ms, transform 120ms, background 120ms',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)',
});
const cardTitleStyle: CSSProperties = { color: '#f1f5f9', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono, ui-monospace), monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const cardSubtitleStyle: CSSProperties = { color: '#64748b', fontSize: 11 };
const elementsRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 1 };
const elementPillStyle = (hot: boolean): CSSProperties => ({
  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
  fontFamily: 'var(--font-mono, ui-monospace), monospace',
  color: hot ? '#04140d' : '#94a3b8',
  background: hot ? ACCENT : 'rgba(255,255,255,0.04)',
  border: `1px solid ${hot ? ACCENT : '#1f2937'}`,
});
const cardGroupRowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 1 };
const cardGroupPillStyle = (color: string): CSSProperties => ({
  fontSize: 9,
  fontWeight: 700,
  lineHeight: 1.4,
  padding: '1px 5px',
  borderRadius: 4,
  color: '#dbeafe',
  background: `${color}22`,
  border: `1px solid ${color}55`,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
const busyStyle: CSSProperties = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: ACCENT, fontWeight: 700, background: 'rgba(6,8,13,0.6)', borderRadius: 9 };
