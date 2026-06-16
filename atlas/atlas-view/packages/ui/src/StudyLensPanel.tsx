import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useStore } from './store';
import { buildMoleculeStudyFacts, type ElementStudyFact } from './studyFacts';
import type {
  OchemLearningStep,
  OchemMisconception,
  OchemPracticeCard,
  OchemReactionPriority,
  OchemReasoningStep,
  OchemSpectroscopyCheck,
} from './ochemCourseCompanion';
import type {
  MaterialsCharacterizationCheck,
  MaterialsCurriculumAxis,
  MaterialsPracticeCard,
} from './materialsScienceCompanion';

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
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceRevealed, setPracticeRevealed] = useState(false);

  const facts = useMemo(() => buildMoleculeStudyFacts({
    file,
    frameIndex: frame,
    selectedAtoms,
    lastBondCount,
    showBonds,
    shareUrl: typeof window === 'undefined' ? undefined : window.location.href,
  }), [file, frame, lastBondCount, selectedAtoms, showBonds]);

  if (!facts) return null;
  const practiceCards = facts.ochemCompanion.practiceCards;
  const activePractice = practiceCards.length
    ? practiceCards[practiceIndex % practiceCards.length]
    : null;
  const advancePractice = () => {
    if (!practiceCards.length) return;
    setPracticeIndex(index => (index + 1) % practiceCards.length);
    setPracticeRevealed(false);
  };

  return (
    <aside
      data-testid="study-lens-panel"
      aria-label="Study lens"
      style={{
        ...panelStyle,
        top: compact ? 176 : 180,
        left: compact ? 12 : 18,
        right: compact ? 12 : 'auto',
        width: compact ? 'auto' : 392,
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

      {activePractice && (
        <section style={practiceSectionStyle}>
          <SectionTitle label="Practice check" detail={`${(practiceIndex % practiceCards.length) + 1}/${practiceCards.length}`} />
          <PracticeCheck
            card={activePractice}
            revealed={practiceRevealed}
            onReveal={() => setPracticeRevealed(value => !value)}
            onNext={advancePractice}
          />
        </section>
      )}

      <section style={truthSectionStyle}>
        <SectionTitle label="Data truth" detail="source vs visual" />
        <div style={truthListStyle}>
          <TruthRow label="Bonds" value={facts.dataProvenance.bonds} />
          <TruthRow label="Properties" value={facts.dataProvenance.properties} />
        </div>
      </section>

      <section style={materialsSectionStyle}>
        <SectionTitle label="Materials lens" detail={facts.materialsCompanion.courseUnit} />
        <p style={materialsFrameStyle}>{facts.materialsCompanion.instructorFrame}</p>
        <div style={materialsAxisGridStyle}>
          {facts.materialsCompanion.curriculumAxes.map(axis => (
            <MaterialsAxisCard key={axis.axis} axis={axis} />
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle label="Materials checks" detail="evidence first" />
        <div style={materialsCheckListStyle}>
          {facts.materialsCompanion.characterizationChecks.slice(0, 3).map(check => (
            <MaterialsCheckCard key={check.method} check={check} />
          ))}
          {facts.materialsCompanion.practiceCards.slice(0, 1).map(card => (
            <MaterialsPracticeCardView key={card.prompt} card={card} />
          ))}
        </div>
      </section>

      <section style={courseSectionStyle}>
        <SectionTitle label="Course frame" detail={facts.ochemCompanion.courseUnit} />
        <p style={courseFrameStyle}>{facts.ochemCompanion.instructorFrame}</p>
        <div style={reasoningListStyle}>
          {facts.ochemCompanion.reasoningSteps.map((step, index) => (
            <ReasoningStepRow key={step.label} step={step} index={index} />
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <SectionTitle label="Learning loop" detail="predict -> check -> transfer" />
        <div style={learningPathStyle}>
          {facts.ochemCompanion.learningPath.map(step => (
            <LearningStepCard key={step.phase} step={step} />
          ))}
        </div>
      </section>

      {facts.ochemCompanion.mechanismPriorities.length > 0 && (
        <section style={sectionStyle}>
          <SectionTitle label="Mechanism priorities" detail="professor order" />
          <div style={priorityListStyle}>
            {facts.ochemCompanion.mechanismPriorities.slice(0, 3).map(priority => (
              <PriorityCard key={priority.id} priority={priority} />
            ))}
          </div>
        </section>
      )}

      {facts.ochemCompanion.commonTraps.length > 0 && (
        <section style={sectionStyle}>
          <SectionTitle label="Common traps" detail="debug thinking" />
          <div style={trapListStyle}>
            {facts.ochemCompanion.commonTraps.slice(0, 3).map(trap => (
              <TrapCard key={trap.trap} trap={trap} />
            ))}
          </div>
        </section>
      )}

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

      {facts.ochemCompanion.spectroscopyChecks.length > 0 && (
        <section style={sectionStyle}>
          <SectionTitle label="Spectroscopy checks" detail="first pass" />
          <div style={spectroscopyListStyle}>
            {facts.ochemCompanion.spectroscopyChecks.slice(0, 3).map(check => (
              <SpectroscopyRow key={check.signal} check={check} />
            ))}
          </div>
        </section>
      )}

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
          <p style={mutedCopyStyle}>No source per-atom scalar columns are available in this frame.</p>
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

function TruthRow({ label, value }: { label: string; value: string }) {
  return (
    <article style={truthRowStyle}>
      <strong>{label}</strong>
      <p style={truthCopyStyle}>{value}</p>
    </article>
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

function MaterialsAxisCard({ axis }: { axis: MaterialsCurriculumAxis }) {
  return (
    <article style={materialsAxisStyle}>
      <span style={materialsAxisEyebrowStyle}>{axis.axis}</span>
      <strong style={materialsAxisTitleStyle}>{axis.label}</strong>
      <p style={materialsAxisCopyStyle}>{axis.prompt}</p>
      <em style={materialsAxisNoteStyle}>{axis.mentorNote}</em>
    </article>
  );
}

function MaterialsCheckCard({ check }: { check: MaterialsCharacterizationCheck }) {
  return (
    <article style={materialsCheckStyle}>
      <strong>{check.method}</strong>
      <p style={materialsCardCopyStyle}>{check.readout}</p>
    </article>
  );
}

function MaterialsPracticeCardView({ card }: { card: MaterialsPracticeCard }) {
  return (
    <article style={materialsPracticeStyle}>
      <strong>{card.prompt}</strong>
      <p style={materialsCardCopyStyle}>{card.answer}</p>
      <em style={materialsPracticeWhyStyle}>{card.why}</em>
    </article>
  );
}

function ReasoningStepRow({ step, index }: { step: OchemReasoningStep; index: number }) {
  return (
    <article style={reasoningRowStyle}>
      <span style={reasoningIndexStyle}>{index + 1}</span>
      <div style={{ minWidth: 0 }}>
        <strong style={reasoningTitleStyle}>{step.label}</strong>
        <p style={reasoningCopyStyle}>{step.prompt}</p>
      </div>
    </article>
  );
}

function LearningStepCard({ step }: { step: OchemLearningStep }) {
  return (
    <article style={learningStepStyle}>
      <span style={learningPhaseStyle}>{step.phase}</span>
      <strong style={learningTitleStyle}>{step.label}</strong>
      <p style={learningCopyStyle}>{step.prompt}</p>
      <em style={learningNoteStyle}>{step.mentorNote}</em>
    </article>
  );
}

function PracticeCheck({
  card,
  revealed,
  onReveal,
  onNext,
}: {
  card: OchemPracticeCard;
  revealed: boolean;
  onReveal: () => void;
  onNext: () => void;
}) {
  return (
    <article style={practiceCardStyle}>
      <p style={practicePromptStyle}>{card.prompt}</p>
      {revealed ? (
        <div style={practiceAnswerStyle}>
          <strong>{card.answer}</strong>
          <p>{card.why}</p>
        </div>
      ) : (
        <p style={practiceHiddenStyle}>Make the prediction first, then reveal the professor check.</p>
      )}
      <div style={practiceActionsStyle}>
        <button type="button" onClick={onReveal} style={practiceButtonStyle}>
          {revealed ? 'Hide answer' : 'Reveal check'}
        </button>
        <button type="button" onClick={onNext} style={practiceGhostButtonStyle}>Next</button>
      </div>
    </article>
  );
}

function TrapCard({ trap }: { trap: OchemMisconception }) {
  return (
    <article style={trapCardStyle}>
      <strong>{trap.trap}</strong>
      <p>{trap.correction}</p>
    </article>
  );
}

function PriorityCard({ priority }: { priority: OchemReactionPriority }) {
  return (
    <article style={priorityCardStyle}>
      <strong style={priorityTitleStyle}>{priority.label}</strong>
      <p style={priorityCopyStyle}>{priority.why}</p>
      <p style={priorityMoveStyle}>{priority.typicalMove}</p>
    </article>
  );
}

function SpectroscopyRow({ check }: { check: OchemSpectroscopyCheck }) {
  return (
    <article style={spectroscopyRowStyle}>
      <strong>{check.signal}</strong>
      <p>{check.reason}</p>
    </article>
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
  gap: 14,
  overflowY: 'auto',
  padding: 16,
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
  minHeight: 52,
  padding: '9px 10px',
  border: '1px solid rgba(148,163,184,0.16)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(15,23,42,0.68), rgba(15,23,42,0.48))',
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
  fontVariantNumeric: 'tabular-nums',
};

const sectionStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  minWidth: 0,
};

const truthSectionStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '10px',
  border: '1px solid rgba(251,191,36,0.22)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(53,38,13,0.38), rgba(15,23,42,0.32))',
};

const truthListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const truthRowStyle: CSSProperties = {
  display: 'grid',
  gap: 3,
  padding: '8px 9px',
  border: '1px solid rgba(251,191,36,0.14)',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.44)',
  color: 'rgba(254,243,199,0.86)',
  fontSize: 11,
  lineHeight: 1.38,
};

const truthCopyStyle: CSSProperties = {
  margin: 0,
  textWrap: 'pretty',
};

const materialsSectionStyle: CSSProperties = {
  display: 'grid',
  gap: 9,
  padding: '10px 10px 11px',
  border: '1px solid rgba(45,212,191,0.2)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(5,46,46,0.46), rgba(15,23,42,0.4))',
};

const materialsFrameStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(204,251,241,0.84)',
  fontSize: 12,
  lineHeight: 1.52,
  textWrap: 'pretty',
};

const materialsAxisGridStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const materialsAxisStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(45,212,191,0.16)',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.45)',
};

const materialsAxisEyebrowStyle: CSSProperties = {
  color: '#5eead4',
  fontSize: 10,
  fontWeight: 850,
  letterSpacing: 0,
  textTransform: 'uppercase',
};

const materialsAxisTitleStyle: CSSProperties = {
  color: '#f8fafc',
  fontSize: 12,
  lineHeight: 1.24,
};

const materialsAxisCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.76)',
  fontSize: 12,
  lineHeight: 1.42,
  textWrap: 'pretty',
};

const materialsAxisNoteStyle: CSSProperties = {
  color: 'rgba(153,246,228,0.72)',
  fontSize: 11,
  fontStyle: 'normal',
  lineHeight: 1.36,
};

const materialsCheckListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const materialsCheckStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(94,234,212,0.16)',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.44)',
  color: 'rgba(204,251,241,0.9)',
  fontSize: 12,
  lineHeight: 1.4,
};

const materialsPracticeStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(251,191,36,0.18)',
  borderRadius: 8,
  background: 'rgba(120,53,15,0.16)',
  color: 'rgba(254,243,199,0.9)',
  fontSize: 12,
  lineHeight: 1.4,
};

const materialsCardCopyStyle: CSSProperties = {
  margin: 0,
  textWrap: 'pretty',
};

const materialsPracticeWhyStyle: CSSProperties = {
  color: 'rgba(253,230,138,0.72)',
  fontSize: 11,
  fontStyle: 'normal',
  lineHeight: 1.36,
  textWrap: 'pretty',
};

const courseSectionStyle: CSSProperties = {
  display: 'grid',
  gap: 9,
  padding: '10px 10px 11px',
  border: '1px solid rgba(125,211,252,0.22)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(12,28,42,0.54), rgba(15,23,42,0.42))',
};

const courseFrameStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(226,232,240,0.78)',
  fontSize: 12,
  lineHeight: 1.54,
  textWrap: 'pretty',
};

const reasoningListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const reasoningRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px minmax(0, 1fr)',
  gap: 8,
  alignItems: 'start',
};

const reasoningIndexStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  color: '#06111f',
  background: '#7dd3fc',
  fontSize: 11,
  fontWeight: 850,
  fontVariantNumeric: 'tabular-nums',
};

const reasoningTitleStyle: CSSProperties = {
  display: 'block',
  color: '#f8fafc',
  fontSize: 12,
  lineHeight: 1.25,
};

const reasoningCopyStyle: CSSProperties = {
  margin: '2px 0 0',
  color: 'rgba(203,213,225,0.72)',
  fontSize: 12,
  lineHeight: 1.44,
  textWrap: 'pretty',
};

const learningPathStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const learningStepStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '9px 10px',
  border: '1px solid rgba(125,211,252,0.15)',
  borderRadius: 8,
  background: 'rgba(15,23,42,0.48)',
};

const learningPhaseStyle: CSSProperties = {
  color: '#7dd3fc',
  fontSize: 10,
  fontWeight: 850,
  lineHeight: 1,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const learningTitleStyle: CSSProperties = {
  color: '#f8fafc',
  fontSize: 12,
  lineHeight: 1.25,
};

const learningCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.75)',
  fontSize: 12,
  lineHeight: 1.44,
  textWrap: 'pretty',
};

const learningNoteStyle: CSSProperties = {
  color: 'rgba(186,230,253,0.7)',
  fontSize: 11,
  fontStyle: 'normal',
  lineHeight: 1.38,
};

const practiceSectionStyle: CSSProperties = {
  ...sectionStyle,
  padding: '10px',
  border: '1px solid rgba(94,234,212,0.18)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(12,36,36,0.42), rgba(15,23,42,0.36))',
};

const practiceCardStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const practicePromptStyle: CSSProperties = {
  margin: 0,
  color: '#f8fafc',
  fontSize: 13,
  fontWeight: 760,
  lineHeight: 1.42,
  textWrap: 'pretty',
};

const practiceHiddenStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.68)',
  fontSize: 12,
  lineHeight: 1.4,
};

const practiceAnswerStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(45,212,191,0.22)',
  borderRadius: 8,
  color: 'rgba(204,251,241,0.92)',
  background: 'rgba(13,148,136,0.12)',
  fontSize: 12,
  lineHeight: 1.42,
};

const practiceActionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const practiceButtonStyle: CSSProperties = {
  minHeight: 34,
  border: '1px solid rgba(94,234,212,0.34)',
  borderRadius: 8,
  background: 'linear-gradient(180deg, rgba(20,184,166,0.24), rgba(15,118,110,0.16))',
  color: '#ccfbf1',
  padding: '7px 11px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
};

const practiceGhostButtonStyle: CSSProperties = {
  ...practiceButtonStyle,
  borderColor: 'rgba(148,163,184,0.2)',
  background: 'rgba(148,163,184,0.08)',
  color: 'rgba(226,232,240,0.82)',
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
  minWidth: 0,
  overflow: 'hidden',
  overflowWrap: 'anywhere',
  textAlign: 'right',
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
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

const priorityListStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
};

const priorityCardStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  padding: '9px 10px',
  border: '1px solid rgba(45,212,191,0.18)',
  borderRadius: 8,
  background: 'rgba(13,32,37,0.44)',
};

const priorityTitleStyle: CSSProperties = {
  color: '#ccfbf1',
  fontSize: 13,
  lineHeight: 1.25,
};

const priorityCopyStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(203,213,225,0.72)',
  fontSize: 12,
  lineHeight: 1.46,
  textWrap: 'pretty',
};

const priorityMoveStyle: CSSProperties = {
  margin: 0,
  color: 'rgba(94,234,212,0.76)',
  fontSize: 12,
  lineHeight: 1.45,
  textWrap: 'pretty',
};

const trapListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const trapCardStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '8px 9px',
  border: '1px solid rgba(251,191,36,0.18)',
  borderRadius: 8,
  background: 'rgba(120,53,15,0.13)',
  color: 'rgba(254,243,199,0.86)',
  fontSize: 12,
  lineHeight: 1.42,
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

const spectroscopyListStyle: CSSProperties = {
  display: 'grid',
  gap: 7,
};

const spectroscopyRowStyle: CSSProperties = {
  display: 'grid',
  gap: 3,
  padding: '8px 9px',
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.032)',
  color: 'rgba(226,232,240,0.74)',
  fontSize: 12,
  lineHeight: 1.42,
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
