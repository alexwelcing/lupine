import { useEffect, useMemo, useState, type CSSProperties } from 'react';

interface AxisItem {
  id: string;
  label: string;
}

interface MlipVariant extends AxisItem {}

interface MlipCampaignArtifact {
  schema: string;
  generated_at: string;
  title: string;
  axes: {
    rows: AxisItem[];
    mlips: AxisItem[];
    variants: MlipVariant[];
  };
  summary: {
    cells_total: number;
    cells_measured: number;
    cells_planned: number;
    triplets_total: number;
    triplets_measured: number;
    local_root: string;
    cuda_devices: string[];
    fixture_manifest_hashes: string[];
    acceptance_thresholds: {
      accuracy_accelerate_max_normalized_accuracy_loss: number;
      accuracy_accelerate_min_speedup: number;
    };
  };
  day_one_read: string[];
  cells: MlipCell[];
  triplets: MlipTriplet[];
}

interface MlipCell {
  cell_id: string;
  variant_id: string;
  row_id: string;
  mlip_id: string;
  status: 'measured' | 'planned';
  source_kind: string;
  source_path?: string;
  run_id?: string;
  artifact_uri?: string;
  accuracy: {
    error: number | null;
    score: number | null;
    unit: string | null;
    error_unit: string | null;
    primary_metric: string | null;
    score_tolerance?: number | null;
  };
  speed: {
    score: number | null;
    unit: string | null;
    warm_inference_seconds?: number | null;
    cold_total_seconds?: number | null;
    model_load_seconds?: number | null;
  };
  distill: {
    enabled: boolean;
    profile?: string | null;
    policy_engine?: string | null;
    ribbon_version?: string | null;
    support_manifest_hash?: string | null;
    leakage_passed?: boolean | null;
    intervention_count?: number | null;
    refusal_count?: number | null;
    intervention_actions?: string[];
  };
  theorem_hooks?: {
    bridge?: string | null;
    kappa1_hat?: number | null;
    layerwise_exact?: boolean | null;
    p2_status?: string | null;
  };
  versions?: Record<string, unknown>;
}

interface MlipTriplet {
  triplet_id: string;
  row_id: string;
  mlip_id: string;
  verdict: 'pending' | 'win' | 'mixed' | 'regression' | 'invalid' | 'needs_hill_climb';
  explanation: string;
  accuracy_delta_distill: number | null;
  accuracy_delta_accelerate: number | null;
  speed_ratio_accelerate: number | null;
}

const CAMPAIGN_URL = '/mlip/first_day_5x5x3.json';

export function MlipCampaignMatrix({ embedded = false }: { embedded?: boolean }) {
  const [artifact, setArtifact] = useState<MlipCampaignArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTripletId, setSelectedTripletId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(CAMPAIGN_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`campaign artifact ${res.status}`);
        return res.json() as Promise<MlipCampaignArtifact>;
      })
      .then((data) => {
        if (cancelled) return;
        setArtifact(data);
        setSelectedTripletId((current) => current ?? preferredTripletId(data));
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cellsByKey = useMemo(() => {
    const map = new Map<string, MlipCell>();
    artifact?.cells.forEach((cell) => map.set(cellKey(cell.variant_id, cell.row_id, cell.mlip_id), cell));
    return map;
  }, [artifact]);

  const selectedTriplet = useMemo(() => {
    if (!artifact) return null;
    return artifact.triplets.find((triplet) => triplet.triplet_id === selectedTripletId)
      ?? artifact.triplets[0]
      ?? null;
  }, [artifact, selectedTripletId]);

  if (error) {
    return (
      <div style={embedded ? sEmbeddedShell : sPanelShell}>
        <div style={sError}>MLIP campaign artifact unavailable: {error}</div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div style={embedded ? sEmbeddedShell : sPanelShell}>
        <div style={sMuted}>Loading MLIP 5x5x3 campaign...</div>
      </div>
    );
  }

  return (
    <div style={embedded ? sEmbeddedShell : sPanelShell}>
      <div style={sHeader}>
        <div>
          <div style={sKicker}>LUPI Distill campaign</div>
          <h2 style={sTitle}>MLIP 5x5x3 grid</h2>
        </div>
        <div style={sGenerated}>Generated {formatDate(artifact.generated_at)}</div>
      </div>

      <div style={sSummaryGrid}>
        <Metric label="Cells measured" value={`${artifact.summary.cells_measured}/${artifact.summary.cells_total}`} />
        <Metric label="Triplets measured" value={`${artifact.summary.triplets_measured}/${artifact.summary.triplets_total}`} />
        <Metric label="GPU lane" value={artifact.summary.cuda_devices[0] ?? 'pending'} />
        <Metric label="Speed gate" value={`${artifact.summary.acceptance_thresholds.accuracy_accelerate_min_speedup.toFixed(2)}x`} />
      </div>

      <div style={sReadBand}>
        {artifact.day_one_read.map((item) => (
          <div key={item} style={sReadItem}>{item}</div>
        ))}
      </div>

      <div style={sMatrixDeck}>
        {artifact.axes.variants.map((variant) => (
          <VariantMatrix
            key={variant.id}
            artifact={artifact}
            variant={variant}
            cellsByKey={cellsByKey}
            selectedTripletId={selectedTriplet?.triplet_id ?? null}
            onSelect={setSelectedTripletId}
          />
        ))}
      </div>

      {selectedTriplet && (
        <TripletInspector
          artifact={artifact}
          triplet={selectedTriplet}
          cellsByKey={cellsByKey}
        />
      )}
    </div>
  );
}

function VariantMatrix({
  artifact,
  variant,
  cellsByKey,
  selectedTripletId,
  onSelect,
}: {
  artifact: MlipCampaignArtifact;
  variant: MlipVariant;
  cellsByKey: Map<string, MlipCell>;
  selectedTripletId: string | null;
  onSelect: (tripletId: string) => void;
}) {
  const measured = artifact.cells
    .filter((cell) => cell.variant_id === variant.id && cell.status === 'measured')
    .length;
  return (
    <section style={sVariantPanel}>
      <div style={sVariantHeader}>
        <div>
          <div style={sVariantTitle}>{variant.label}</div>
          <div style={sVariantCount}>{measured}/25 measured</div>
        </div>
      </div>
      <div style={sGrid}>
        <div />
        {artifact.axes.mlips.map((mlip) => (
          <div key={mlip.id} style={sColumnHead}>{mlip.label}</div>
        ))}
        {artifact.axes.rows.map((row) => (
          <RowCells
            key={row.id}
            artifact={artifact}
            variant={variant}
            row={row}
            cellsByKey={cellsByKey}
            selectedTripletId={selectedTripletId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function RowCells({
  artifact,
  variant,
  row,
  cellsByKey,
  selectedTripletId,
  onSelect,
}: {
  artifact: MlipCampaignArtifact;
  variant: MlipVariant;
  row: AxisItem;
  cellsByKey: Map<string, MlipCell>;
  selectedTripletId: string | null;
  onSelect: (tripletId: string) => void;
}) {
  return (
    <>
      <div style={sRowHead}>{row.label}</div>
      {artifact.axes.mlips.map((mlip) => {
        const cell = cellsByKey.get(cellKey(variant.id, row.id, mlip.id));
        const tripletId = `${row.id}:${mlip.id}`;
        return (
          <button
            key={tripletId}
            type="button"
            style={sCell(cell, selectedTripletId === tripletId)}
            onClick={() => onSelect(tripletId)}
          >
            <span style={sCellStatus(cell)}>{cell?.status ?? 'planned'}</span>
            <span style={sCellMetric}>{formatError(cell)}</span>
            <span style={sCellSubmetric}>{formatSpeed(cell)}</span>
          </button>
        );
      })}
    </>
  );
}

function TripletInspector({
  artifact,
  triplet,
  cellsByKey,
}: {
  artifact: MlipCampaignArtifact;
  triplet: MlipTriplet;
  cellsByKey: Map<string, MlipCell>;
}) {
  const row = artifact.axes.rows.find((item) => item.id === triplet.row_id);
  const mlip = artifact.axes.mlips.find((item) => item.id === triplet.mlip_id);
  const cells = artifact.axes.variants.map((variant) => ({
    variant,
    cell: cellsByKey.get(cellKey(variant.id, triplet.row_id, triplet.mlip_id)) ?? null,
  }));
  return (
    <section style={sInspector}>
      <div style={sInspectorHeader}>
        <div>
          <div style={sKicker}>Triplet inspector</div>
          <h3 style={sInspectorTitle}>{row?.label ?? triplet.row_id} / {mlip?.label ?? triplet.mlip_id}</h3>
        </div>
        <div style={sVerdict(triplet.verdict)}>{labelVerdict(triplet.verdict)}</div>
      </div>
      <p style={sExplanation}>{triplet.explanation}</p>

      <div style={sComparison}>
        {cells.map(({ variant, cell }) => (
          <div key={variant.id} style={sVariantCard}>
            <div style={sVariantTitle}>{variant.label}</div>
            <Metric label="Error" value={formatError(cell)} compact />
            <Metric label="Speed" value={formatSpeed(cell)} compact />
            <Metric label="Runtime" value={formatRuntime(cell)} compact />
            <Metric label="Interventions" value={formatInterventions(cell)} compact />
          </div>
        ))}
      </div>

      <div style={sDeltaGrid}>
        <Metric label="Distill error delta" value={formatSigned(triplet.accuracy_delta_distill)} />
        <Metric label="Accelerate error delta" value={formatSigned(triplet.accuracy_delta_accelerate)} />
        <Metric label="Accelerate speed ratio" value={formatRatio(triplet.speed_ratio_accelerate)} />
        <Metric label="Fixture hash" value={artifact.summary.fixture_manifest_hashes[0]?.slice(0, 18) ?? 'pending'} />
      </div>

      <div style={sEvidenceList}>
        {cells.map(({ variant, cell }) => (
          <div key={variant.id} style={sEvidenceRow}>
            <span style={sEvidenceVariant}>{variant.label}</span>
            <span style={sEvidenceValue}>{cell?.artifact_uri ?? 'not run yet'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div style={compact ? sMetricCompact : sMetric}>
      <div style={sMetricLabel}>{label}</div>
      <div style={compact ? sMetricValueCompact : sMetricValue}>{value}</div>
    </div>
  );
}

function preferredTripletId(artifact: MlipCampaignArtifact) {
  return artifact.triplets.find((triplet) => triplet.verdict !== 'pending')?.triplet_id
    ?? artifact.triplets[0]?.triplet_id
    ?? null;
}

function cellKey(variantId: string, rowId: string, mlipId: string) {
  return `${variantId}:${rowId}:${mlipId}`;
}

function labelVerdict(verdict: MlipTriplet['verdict']) {
  return verdict.replace(/_/g, ' ');
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatError(cell: MlipCell | null | undefined) {
  const value = cell?.accuracy.error;
  if (typeof value !== 'number') return 'pending';
  if (value < 0.001) return value.toExponential(2);
  return value.toFixed(value < 0.1 ? 4 : 3);
}

function formatSpeed(cell: MlipCell | null | undefined) {
  const value = cell?.speed.score;
  if (typeof value !== 'number') return 'not run';
  return `${value.toFixed(2)}/s`;
}

function formatRuntime(cell: MlipCell | null | undefined) {
  const value = cell?.speed.warm_inference_seconds;
  if (typeof value !== 'number') return 'pending';
  return `${value.toFixed(3)}s`;
}

function formatInterventions(cell: MlipCell | null | undefined) {
  if (!cell || cell.status !== 'measured') return 'pending';
  const count = cell.distill.intervention_count;
  if (typeof count !== 'number') return cell.distill.enabled ? 'active' : 'off';
  return `${count}`;
}

function formatSigned(value: number | null) {
  if (typeof value !== 'number') return 'pending';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(Math.abs(value) < 0.001 ? 6 : 4)}`;
}

function formatRatio(value: number | null) {
  if (typeof value !== 'number') return 'pending';
  return `${value.toFixed(2)}x`;
}

function quality(cell: MlipCell | null | undefined) {
  if (!cell || cell.status !== 'measured') return 'planned';
  const error = cell.accuracy.error;
  const tolerance = cell.accuracy.score_tolerance ?? null;
  if (typeof error !== 'number' || typeof tolerance !== 'number') return 'measured';
  if (error <= tolerance) return 'good';
  if (error <= tolerance * 1.2) return 'near';
  return 'bad';
}

function sCell(cell: MlipCell | null | undefined, selected: boolean): CSSProperties {
  const q = quality(cell);
  const palette = {
    planned: { border: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.025)', fg: 'rgba(255,255,255,0.48)' },
    measured: { border: 'rgba(148,163,184,0.48)', bg: 'rgba(148,163,184,0.11)', fg: '#f8fafc' },
    good: { border: 'rgba(16,185,129,0.72)', bg: 'rgba(16,185,129,0.14)', fg: '#d1fae5' },
    near: { border: 'rgba(245,158,11,0.72)', bg: 'rgba(245,158,11,0.13)', fg: '#fef3c7' },
    bad: { border: 'rgba(244,63,94,0.72)', bg: 'rgba(244,63,94,0.12)', fg: '#ffe4e6' },
  }[q];
  return {
    minHeight: 72,
    padding: '8px',
    border: `1px solid ${selected ? '#1edce0' : palette.border}`,
    background: selected ? 'rgba(30,220,224,0.14)' : palette.bg,
    color: palette.fg,
    display: 'grid',
    alignContent: 'space-between',
    gap: 4,
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0,
  };
}

function sCellStatus(cell: MlipCell | null | undefined): CSSProperties {
  const measured = cell?.status === 'measured';
  return {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: measured ? '#7dd3fc' : 'rgba(255,255,255,0.38)',
  };
}

function sVerdict(verdict: MlipTriplet['verdict']): CSSProperties {
  const colors: Record<MlipTriplet['verdict'], string> = {
    pending: '#94a3b8',
    win: '#10b981',
    mixed: '#f59e0b',
    regression: '#f43f5e',
    invalid: '#f43f5e',
    needs_hill_climb: '#38bdf8',
  };
  return {
    border: `1px solid ${colors[verdict]}`,
    color: '#f8fafc',
    background: `${colors[verdict]}22`,
    padding: '8px 10px',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };
}

const sEmbeddedShell: CSSProperties = {
  maxWidth: 1320,
  margin: '0 auto',
  padding: '24px',
  color: '#f8fafc',
};

const sPanelShell: CSSProperties = {
  padding: 18,
  color: '#f8fafc',
};

const sHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
};

const sKicker: CSSProperties = {
  color: '#1edce0',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const sTitle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 28,
  lineHeight: 1.05,
};

const sGenerated: CSSProperties = {
  color: 'rgba(255,255,255,0.54)',
  fontSize: 12,
  textAlign: 'right',
};

const sSummaryGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
  marginBottom: 14,
};

const sReadBand: CSSProperties = {
  display: 'grid',
  gap: 8,
  marginBottom: 18,
};

const sReadItem: CSSProperties = {
  borderLeft: '2px solid #1edce0',
  background: 'rgba(30,220,224,0.08)',
  padding: '9px 12px',
  color: 'rgba(248,250,252,0.82)',
  fontSize: 13,
  lineHeight: 1.45,
};

const sMatrixDeck: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(360px, 1fr))',
  gap: 14,
  overflowX: 'auto',
  paddingBottom: 4,
};

const sVariantPanel: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(2,6,23,0.58)',
  minWidth: 360,
};

const sVariantHeader: CSSProperties = {
  padding: '12px 12px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
};

const sVariantTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: '#f8fafc',
};

const sVariantCount: CSSProperties = {
  marginTop: 3,
  fontSize: 11,
  color: 'rgba(255,255,255,0.54)',
};

const sGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px repeat(5, minmax(46px, 1fr))',
  gap: 6,
  padding: 10,
};

const sColumnHead: CSSProperties = {
  minHeight: 32,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.58)',
  fontSize: 10,
  textAlign: 'center',
};

const sRowHead: CSSProperties = {
  minHeight: 72,
  display: 'flex',
  alignItems: 'center',
  color: 'rgba(255,255,255,0.62)',
  fontSize: 11,
  lineHeight: 1.2,
};

const sCellMetric: CSSProperties = {
  display: 'block',
  fontSize: 17,
  fontWeight: 800,
  lineHeight: 1,
};

const sCellSubmetric: CSSProperties = {
  display: 'block',
  color: 'rgba(255,255,255,0.52)',
  fontSize: 11,
};

const sInspector: CSSProperties = {
  marginTop: 16,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.26)',
  padding: 16,
};

const sInspectorHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
};

const sInspectorTitle: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 20,
  lineHeight: 1.1,
};

const sExplanation: CSSProperties = {
  margin: '12px 0 14px',
  color: 'rgba(248,250,252,0.78)',
  fontSize: 13,
  lineHeight: 1.45,
};

const sComparison: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
};

const sVariantCard: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.035)',
  padding: 12,
  display: 'grid',
  gap: 8,
};

const sDeltaGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 10,
  marginTop: 12,
};

const sEvidenceList: CSSProperties = {
  display: 'grid',
  gap: 6,
  marginTop: 12,
};

const sEvidenceRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '180px minmax(0, 1fr)',
  gap: 10,
  alignItems: 'center',
  color: 'rgba(255,255,255,0.62)',
  fontSize: 11,
};

const sEvidenceVariant: CSSProperties = {
  color: '#bae6fd',
};

const sEvidenceValue: CSSProperties = {
  overflowWrap: 'anywhere',
  fontFamily: 'var(--font-mono)',
};

const sMetric: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  padding: '10px',
  background: 'rgba(0,0,0,0.22)',
  minWidth: 0,
};

const sMetricCompact: CSSProperties = {
  minWidth: 0,
};

const sMetricLabel: CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.50)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const sMetricValue: CSSProperties = {
  marginTop: 4,
  color: '#f8fafc',
  fontSize: 16,
  fontWeight: 800,
  overflowWrap: 'anywhere',
};

const sMetricValueCompact: CSSProperties = {
  marginTop: 3,
  color: '#f8fafc',
  fontSize: 14,
  fontWeight: 750,
  overflowWrap: 'anywhere',
};

const sMuted: CSSProperties = {
  color: 'rgba(255,255,255,0.56)',
  fontSize: 13,
};

const sError: CSSProperties = {
  padding: 10,
  border: '1px solid rgba(255,84,114,0.5)',
  color: '#ff5472',
};
