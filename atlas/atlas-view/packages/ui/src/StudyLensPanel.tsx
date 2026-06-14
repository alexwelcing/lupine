import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useStore } from './store';
import { buildMoleculeStudyFacts, type ElementStudyFact, type MoleculeStudyFacts } from './studyFacts';

export function StudyLensPanel({
  compact = false,
  onClose,
}: {
  compact?: boolean;
  onClose: () => void;
}) {
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const selectedAtoms = useStore(s => s.selectedAtoms);
  const lastBondCount = useStore(s => s.lastBondCount);
  const showBonds = useStore(s => s.showBonds);

  const facts = useMemo(() => buildMoleculeStudyFacts({
    file,
    frameIndex: frame,
    selectedAtoms,
    lastBondCount,
    showBonds,
    shareUrl: typeof window === 'undefined' ? undefined : window.location.href,
  }), [file, frame, lastBondCount, selectedAtoms, showBonds]);

  if (!facts) return null;

  return (
    <aside
      data-testid="study-lens-panel"
      aria-label="Study lens"
      style={{
        ...panelStyle,
        top: compact ? 176 : 180,
        left: compact ? 12 : 18,
        right: compact ? 12 : 'auto',
        width: compact ? 'auto' : 376,
        maxHeight: compact ? '58vh' : 'calc(100vh - 200px)',
      }}
    >
      <header style={headerStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrowStyle}>Study Lens</div>
          <h2 style={titleStyle}>{facts.title}</h2>
          <p style={cueStyle}>{facts.studyCue}</p>
        </div>
        <button
          type="button"
          aria-label="Close study lens"
          title="Close study lens"
          onClick={onClose}
          style={closeButtonStyle}
        >
          <IconClose />
        </button>
      </header>

      <section style={summaryGridStyle} aria-label="Molecule summary">
        <Metric label="Formula" value={facts.formula || 'Unknown'} />
        <Metric label="Atoms" value={facts.atomCount.toLocaleString()} />
        <Metric label="Frame" value={`${facts.frameIndex + 1}/${facts.frameCount}`} />
        <Metric label="Bonds" value={facts.bondSummary} />
      </section>

      <section style={sectionStyle}>
        <SectionTitle label="Composition" detail={facts.sourceLabel} />
        <div style={compositionStyle}>
          {facts.composition.slice(0, 8).map(item => (
            <CompositionRow key={item.atomicNumber} item={item} />
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle
          label="Functional groups"
          detail={facts.functionalGroups.length ? `${facts.functionalGroups.length} found` : 'not mapped'}
        />
        {facts.functionalGroups.length ? (
          <div style={groupListStyle}>
            {facts.functionalGroups.slice(0, 5).map(group => (
              <article
                key={group.id}
                style={{
                  ...groupStyle,
                  borderColor: `color-mix(in srgb, ${group.color} 42%, rgba(148,163,184,0.28))`,
                  borderLeftColor: group.color,
                }}
              >
                <strong style={groupTitleStyle}>{group.label}</strong>
                <p style={groupCopyStyle}>{group.recognize}</p>
                <dl style={miniDlStyle}>
                  <div>
                    <dt style={miniDtStyle}>Reactivity</dt>
                    <dd style={miniDdStyle}>{group.reactivity}</dd>
                  </div>
                  <div>
                    <dt style={miniDtStyle}>Self-check</dt>
                    <dd style={miniDdStyle}>{group.studyPrompt}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p style={mutedCopyStyle}>No curated ochem mapping is attached to this structure yet. Use composition and selected atoms as the first read.</p>
        )}
      </section>

      <section style={sectionStyle}>
        <SectionTitle
          label="Selected atom"
          detail={facts.selectedAtoms.length ? `${facts.selectedAtoms.length} pinned` : 'none'}
        />
        {facts.selectedAtoms.length ? (
          <div style={atomListStyle}>
            {facts.selectedAtoms.map(atom => (
              <article key={atom.index} style={atomStyle}>
                <div style={atomHeadStyle}>
                  <strong>{atom.symbol}</strong>
                  <span>#{atom.index} / id {atom.id}</span>
                </div>
                <p style={atomCopyStyle}>{atom.name} at {atom.xyz.map(value => value.toFixed(2)).join(', ')} Angstrom</p>
                {atom.properties.length > 0 && (
                  <p style={atomPropStyle}>
                    {atom.properties.slice(0, 3).map(prop => `${prop.name} ${formatValue(prop.value)}`).join(' / ')}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p style={mutedCopyStyle}>No atom is selected. Selection details will appear here when an atom is pinned.</p>
        )}
      </section>

      <section style={sectionStyle}>
        <SectionTitle label="Frame notes" detail={`${formatSpan(facts.bounds.x)} x ${formatSpan(facts.bounds.y)} x ${formatSpan(facts.bounds.z)} Angstrom`} />
        {facts.propertyStats.length > 0 ? (
          <div style={propertyListStyle}>
            {facts.propertyStats.slice(0, 4).map(prop => (
              <div key={prop.name} style={propertyRowStyle}>
                <span>{prop.name}</span>
                <strong>{formatValue(prop.mean)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p style={mutedCopyStyle}>No per-atom scalar properties are available in this frame.</p>
        )}
      </section>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
  );
}

function SectionTitle({ label, detail }: { label: string; detail?: string }) {
  return (
    <div style={sectionTitleStyle}>
      <h3 style={sectionHeadingStyle}>{label}</h3>
      {detail && <span style={sectionDetailStyle}>{detail}</span>}
    </div>
  );
}

function CompositionRow({ item }: { item: ElementStudyFact }) {
  return (
    <div style={compositionRowStyle}>
      <i style={{ ...compositionDotStyle, background: item.color, boxShadow: `0 0 14px ${item.color}66` }} />
      <span>{item.symbol}</span>
      <strong>{item.count.toLocaleString()}</strong>
      <em>{item.percent.toFixed(1)}%</em>
    </div>
  );
}

function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  const abs = Math.abs(value);
  if (abs === 0) return '0';
  if (abs < 0.001 || abs >= 100000) return value.toExponential(2);
  if (abs < 1) return value.toFixed(4);
  return value.toFixed(3);
}

function formatSpan(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

const panelStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 155,
  display: 'grid',
  gap: 13,
  overflowY: 'auto',
  padding: 14,
  color: 'rgba(235,245,255,0.94)',
  background: 'linear-gradient(180deg, rgba(9,14,24,0.94), rgba(5,8,15,0.9))',
  border: '1px solid rgba(125,211,252,0.2)',
  borderRadius: 8,
  boxShadow: '0 24px 70px rgba(0,0,0,0.48), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
};

const headerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 28px',
  gap: 10,
  alignItems: 'start',
};

const eyebrowStyle: CSSProperties = {
  color: '#7dd3fc',
  fontSize: 10,
  fontWeight: 820,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const titleStyle: CSSProperties = {
  margin: '3px 0 0',
  color: '#f8fafc',
  fontSize: 18,
  lineHeight: 1.16,
  letterSpacing: 0,
  textWrap: 'balance',
};

const cueStyle: CSSProperties = {
  margin: '7px 0 0',
  color: 'rgba(203,213,225,0.72)',
  fontSize: 12,
  lineHeight: 1.55,
  textWrap: 'pretty',
};

const closeButtonStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  border: '1px solid rgba(148,163,184,0.22)',
  borderRadius: 8,
  color: 'rgba(226,232,240,0.76)',
  background: 'rgba(255,255,255,0.04)',
  cursor: 'pointer',
};

const summaryGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
};

const metricStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  padding: '8px 9px',
  border: '1px solid rgba(148,163,184,0.16)',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.58)',
};

const metricLabelStyle: CSSProperties = {
  color: 'rgba(148,163,184,0.74)',
  fontSize: 10,
  fontWeight: 780,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const metricValueStyle: CSSProperties = {
  color: '#f8fafc',
  fontSize: 14,
  lineHeight: 1.2,
  overflowWrap: 'anywhere',
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: 10,
};

const sectionHeadingStyle: CSSProperties = {
  margin: 0,
  color: '#f8fafc',
  fontSize: 13,
  lineHeight: 1.25,
  letterSpacing: 0,
};

const sectionDetailStyle: CSSProperties = {
  color: 'rgba(148,163,184,0.72)',
  fontSize: 11,
  lineHeight: 1.25,
  whiteSpace: 'nowrap',
};

const compositionStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
};

const compositionRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '12px 36px minmax(0, 1fr) 52px',
  alignItems: 'center',
  gap: 7,
  color: 'rgba(226,232,240,0.78)',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

const compositionDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
};

const groupListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const groupStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  padding: '9px 10px',
  border: '1px solid rgba(148,163,184,0.22)',
  borderLeft: '3px solid #7dd3fc',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.52)',
};

const groupTitleStyle: CSSProperties = {
  color: '#f8fafc',
  fontSize: 13,
  lineHeight: 1.25,
};

const groupCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.74)',
  fontSize: 12,
  lineHeight: 1.48,
  textWrap: 'pretty',
};

const miniDlStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  margin: 0,
};

const miniDtStyle: CSSProperties = {
  color: 'rgba(125,211,252,0.78)',
  fontSize: 10,
  fontWeight: 780,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const miniDdStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.72)',
  fontSize: 12,
  lineHeight: 1.48,
  textWrap: 'pretty',
};

const atomListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const atomStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(148,163,184,0.16)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.035)',
};

const atomHeadStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  color: '#f8fafc',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

const atomCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.72)',
  fontSize: 12,
  lineHeight: 1.45,
};

const atomPropStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(125,211,252,0.72)',
  fontSize: 11,
  lineHeight: 1.4,
  fontFamily: 'var(--font-mono), ui-monospace, monospace',
};

const propertyListStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
};

const propertyRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  color: 'rgba(226,232,240,0.74)',
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
};

const mutedCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.62)',
  fontSize: 12,
  lineHeight: 1.52,
  textWrap: 'pretty',
};
