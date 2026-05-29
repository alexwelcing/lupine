import { useEffect, useMemo, useState } from 'react';
import { MlipLongRunWorkbench } from './MlipLongRunWorkbench';

const CLOUD_RESULT_SUMMARY_URL = '/mlip/mptrj-three-lane-full-summary.json';

interface ThreeLaneSummary {
  generated_at: string;
  campaign_id: string;
  scope: string;
  profile: string;
  summary: {
    cells_completed: number;
    cells_total: number;
    cells_failed: number;
    cells_missing: number;
    pairs_improved: number;
    pairs_regressed: number;
    pairs_unchanged: number;
    triplets_kart_wins: number;
    triplets_accuracy_wins: number;
    triplets_accelerate_accuracy_regressed: number;
  };
  pairs: Array<{
    row_id: string;
    row_label: string;
    mlip_id: string;
    baseline_error: number | null;
    distill_error: number | null;
    lift_fraction: number | null;
    verdict: string;
  }>;
  triplets: Array<{
    row_id: string;
    row_label: string;
    mlip_id: string;
    accuracy_lift_fraction: number | null;
    accelerate_lift_fraction: number | null;
    speedup_accelerate_vs_accuracy: number | null;
    verdict: string;
  }>;
}

const lanes = [
  { label: 'Control', value: 'Baseline', color: '#94a3b8' },
  { label: 'Guarded', value: 'Accuracy', color: '#34d399' },
  { label: 'Efficient', value: 'Accuracy + speed', color: '#60a5fa' },
];

const rowOrder = [
  { id: 'energy_volume', label: 'Energy-volume' },
  { id: 'forces', label: 'Forces' },
  { id: 'stress', label: 'Stress' },
  { id: 'elastic_constants', label: 'Elastic' },
  { id: 'relaxation_stability', label: 'Relaxation' },
];

const mlipOrder = [
  { id: 'mace-mp-0', label: 'MACE' },
  { id: 'chgnet', label: 'CHGNet' },
  { id: 'orb-v3', label: 'ORB' },
  { id: 'sevennet', label: 'SevenNet' },
];

const proofChips = ['Sealed fixture', 'Shared checkpoints', 'GCP L4 runner', 'Zero failed cells'];

export function MlipFlywheelPage() {
  const [summary, setSummary] = useState<ThreeLaneSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${CLOUD_RESULT_SUMMARY_URL}?v=${Date.now()}`)
      .then((response) => {
        if (!response.ok) throw new Error(`summary fetch failed: ${response.status}`);
        return response.json() as Promise<ThreeLaneSummary>;
      })
      .then((payload) => {
        if (cancelled) return;
        setSummary(payload);
        setSummaryError(null);
      })
      .catch((err) => {
        if (!cancelled) setSummaryError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tripletsByCell = useMemo(() => {
    const byCell = new Map<string, ThreeLaneSummary['triplets'][number]>();
    for (const triplet of summary?.triplets ?? []) {
      byCell.set(`${triplet.row_id}:${triplet.mlip_id}`, triplet);
    }
    return byCell;
  }, [summary]);

  const threeLaneWins = useMemo(
    () => summary?.triplets.filter((triplet) => triplet.verdict === 'kart_win') ?? [],
    [summary],
  );

  return (
    <div style={{ minHeight: '100vh', background: '#020204', color: '#f8fafc', paddingTop: 56 }}>
      <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '30px 0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 26, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <div>
              <div style={{ color: '#8dd3ff', fontSize: 12, fontWeight: 760, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 18 }}>
                LUPI Live Lab
              </div>
              <h1 style={{ margin: 0, fontSize: 58, lineHeight: 0.94, letterSpacing: 0, fontWeight: 860, maxWidth: 620 }}>
                MLIP three-lane benchmark
              </h1>
              <p style={{ margin: '16px 0 0', maxWidth: 590, color: 'rgba(226,232,240,0.72)', fontSize: 18, lineHeight: 1.38 }}>
                Same fixture. Same MLIP. Measure baseline, guarded accuracy, then guarded efficiency.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {proofChips.map((chip) => (
                <span key={chip} style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  padding: '7px 10px',
                  color: 'rgba(226,232,240,0.78)',
                  background: 'rgba(255,255,255,0.045)',
                  fontSize: 12,
                  fontWeight: 680,
                }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.84), rgba(3,7,18,0.94))',
            padding: 18,
            boxShadow: '0 26px 80px rgba(0,0,0,0.34)',
          }}>
            {summary ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: 10, marginBottom: 14 }}>
                <MetricTile label="Cells" value={`${summary.summary.cells_completed}/${summary.summary.cells_total}`} tone="neutral" />
                <MetricTile label="Accuracy wins" value={summary.summary.pairs_improved} tone="good" />
                <MetricTile label="Three-lane wins" value={summary.summary.triplets_kart_wins} tone="good" />
                <MetricTile label="Regressions" value={summary.summary.pairs_regressed} tone="quiet" />
              </div>
            ) : (
              <div style={{ color: 'rgba(203,213,225,0.72)', fontSize: 14, marginBottom: 14 }}>Loading cloud evidence...</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
              {lanes.map((lane, index) => (
                <div key={lane.label} style={{
                  minHeight: 114,
                  border: `1px solid ${index === 1 ? 'rgba(52,211,153,0.34)' : index === 2 ? 'rgba(96,165,250,0.34)' : 'rgba(148,163,184,0.22)'}`,
                  borderRadius: 8,
                  background: index === 1 ? 'rgba(5,150,105,0.15)' : index === 2 ? 'rgba(37,99,235,0.16)' : 'rgba(30,41,59,0.42)',
                  padding: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ height: 8, borderRadius: 99, background: lane.color, opacity: 0.9 }} />
                  <div>
                    <div style={{ color: 'rgba(226,232,240,0.62)', fontSize: 12, fontWeight: 780, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {lane.label}
                    </div>
                    <div style={{ marginTop: 4, color: '#f8fafc', fontSize: 18, lineHeight: 1.1, fontWeight: 820 }}>
                      {lane.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {summary && (
        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '18px 0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', marginBottom: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#86efac', fontSize: 12, fontWeight: 780, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Cloud result
              </div>
              <h2 style={{ margin: '5px 0 0', fontSize: 28, lineHeight: 1.1, letterSpacing: 0 }}>
                5 rows x 4 MLIPs x 3 lanes
              </h2>
            </div>
            <div style={{ color: 'rgba(203,213,225,0.72)', fontSize: 13 }}>
              Green = accuracy lift preserved in efficient lane
            </div>
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
            <div style={{ minWidth: 760, display: 'grid', gridTemplateColumns: '150px repeat(4, minmax(130px, 1fr))', gap: 8 }}>
              <div />
              {mlipOrder.map((mlip) => (
                <div key={mlip.id} style={{ color: 'rgba(226,232,240,0.74)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 2px' }}>
                  {mlip.label}
                </div>
              ))}
              {rowOrder.map((row) => (
                <>
                  <div key={`${row.id}:label`} style={{
                    minHeight: 82,
                    display: 'flex',
                    alignItems: 'center',
                    color: 'rgba(226,232,240,0.84)',
                    fontSize: 14,
                    fontWeight: 760,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {row.label}
                  </div>
                  {mlipOrder.map((mlip) => (
                    <ResultCell key={`${row.id}:${mlip.id}`} result={tripletsByCell.get(`${row.id}:${mlip.id}`)} />
                  ))}
                </>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 14 }}>
            {threeLaneWins.slice(0, 6).map((win) => (
              <div key={`${win.mlip_id}:${win.row_id}:win`} style={{
                borderLeft: '3px solid #34d399',
                background: 'rgba(15,23,42,0.56)',
                borderRadius: 6,
                padding: '10px 12px',
              }}>
                <div style={{ color: '#f8fafc', fontWeight: 820, fontSize: 14 }}>
                  {labelForMlip(win.mlip_id)} / {win.row_label}
                </div>
                <div style={{ color: 'rgba(203,213,225,0.72)', fontSize: 12, marginTop: 4 }}>
                  {formatPercent(win.accuracy_lift_fraction)} lift, {formatSpeedup(win.speedup_accelerate_vs_accuracy)} efficient-lane throughput
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: '14px 0 0', color: 'rgba(203,213,225,0.58)', fontSize: 12, lineHeight: 1.42 }}>
            Efficient-lane throughput is measured on checkpoint-consuming guarded execution. Accuracy deltas are sealed-row results.
          </p>
        </section>
      )}

      {summaryError && (
        <section style={{ width: 'min(1180px, calc(100% - 32px))', margin: '0 auto', padding: '0 0 28px' }}>
          <div style={{ border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: 16, color: '#fecaca' }}>
            Cloud evidence summary unavailable: {summaryError}
          </div>
        </section>
      )}

      <MlipLongRunWorkbench embedded />
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'good' | 'neutral' | 'quiet';
}) {
  const color = tone === 'good' ? '#86efac' : tone === 'quiet' ? '#cbd5e1' : '#bfdbfe';
  return (
    <div style={{
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      background: 'rgba(2,6,23,0.58)',
      minHeight: 82,
      padding: '12px 13px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{ color: 'rgba(203,213,225,0.68)', fontSize: 12, fontWeight: 760 }}>{label}</div>
      <div style={{ color, fontSize: 29, lineHeight: 1, fontWeight: 860 }}>{value}</div>
    </div>
  );
}

function ResultCell({ result }: { result?: ThreeLaneSummary['triplets'][number] }) {
  const isWin = result?.verdict === 'kart_win';
  const isUnchanged = result?.verdict === 'accuracy_unchanged';
  const isPending = !result;
  const background = isWin
    ? 'linear-gradient(180deg, rgba(5,150,105,0.36), rgba(6,78,59,0.24))'
    : isUnchanged
      ? 'rgba(30,41,59,0.54)'
      : isPending
        ? 'rgba(15,23,42,0.4)'
        : 'rgba(127,29,29,0.34)';
  const border = isWin
    ? '1px solid rgba(52,211,153,0.44)'
    : isUnchanged
      ? '1px solid rgba(148,163,184,0.16)'
      : '1px solid rgba(248,113,113,0.28)';
  return (
    <div style={{
      minHeight: 82,
      border,
      borderRadius: 8,
      background,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: isWin ? '#34d399' : isUnchanged ? '#94a3b8' : '#f87171',
          flexShrink: 0,
        }} />
        <span style={{ color: 'rgba(226,232,240,0.74)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {isWin ? 'Lift' : isUnchanged ? 'Held' : 'Check'}
        </span>
      </div>
      <div>
        <div style={{ color: '#f8fafc', fontSize: 20, fontWeight: 860, lineHeight: 1 }}>
          {isWin ? formatPercent(result.accuracy_lift_fraction) : isUnchanged ? 'Flat' : 'Pending'}
        </div>
        <div style={{ color: 'rgba(203,213,225,0.68)', fontSize: 12, marginTop: 5 }}>
          {isWin || isUnchanged ? formatSpeedup(result?.speedup_accelerate_vs_accuracy ?? null) : ''}
        </div>
      </div>
    </div>
  );
}

function labelForMlip(mlipId: string) {
  return mlipOrder.find((mlip) => mlip.id === mlipId)?.label ?? mlipId;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'pending';
  return `${(value * 100).toFixed(1)}%`;
}

function formatSpeedup(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'pending';
  return `${value.toFixed(1)}x`;
}
