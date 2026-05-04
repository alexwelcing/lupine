// Shared visual components + claim-data parsers for the /console tables.
// These components are designed for at-a-glance reading: a confidence value
// becomes a visual bar; a UTC timestamp becomes "8 min ago" with full date
// on hover; the rich claim_data JSON gets parsed into element / metric /
// flag triples so the dominant claim types (ManifoldAnalysis, CausalScreen)
// project cleanly into sortable, filterable columns.
import type { ReactElement } from 'react'
import type { Hypothesis, Claim, Insight, Hit, Paper, Deployment, GraphNode } from './types'

// ─── Confidence / relevance / progress bar ───

interface BarProps {
  value: number | null | undefined
  // 0..1 range; the bar fills proportionally.
  // Tone determines the fill color tier.
  tone?: 'auto' | 'primary' | 'secondary' | 'error' | 'muted'
  // Show the numeric value alongside the bar (default true).
  showValue?: boolean
}

export function ConfidenceBar({ value, tone = 'auto', showValue = true }: BarProps): ReactElement {
  const v = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : null
  if (v === null) {
    return <span className="font-mono text-xs text-[var(--on-surface-variant)]">—</span>
  }
  const computed: BarProps['tone'] =
    tone === 'auto'
      ? v >= 0.85 ? 'secondary'
      : v >= 0.6 ? 'primary'
      : v >= 0.3 ? 'muted'
      : 'error'
      : tone
  const fillVar =
    computed === 'secondary' ? 'var(--secondary)'
    : computed === 'primary' ? 'var(--primary)'
    : computed === 'error' ? 'var(--error)'
    : 'var(--on-surface-variant)'
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block relative"
        style={{ width: 56, height: 6, background: 'var(--surface-container-high)', borderRadius: 2 }}
      >
        <span
          className="absolute left-0 top-0 h-full"
          style={{ width: `${v * 100}%`, background: fillVar, borderRadius: 2 }}
        />
      </span>
      {showValue && <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">{v.toFixed(2)}</span>}
    </span>
  )
}

// ─── Relative time ───

export function relativeTime(s: string | null | undefined): string {
  if (!s) return '—'
  const t = new Date(s).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Date(s).toISOString().slice(0, 10)
}

export function RelativeTime({ value }: { value: string | null | undefined }): ReactElement {
  if (!value) return <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">—</span>
  return (
    <span
      className="font-mono text-[10px] text-[var(--on-surface-variant)] cursor-help"
      title={value}
    >
      {relativeTime(value)}
    </span>
  )
}

// ─── claim_data → structured projection ───

export interface ClaimProjection {
  element: string | null
  metric: number | null
  metricLabel: string | null
  metricFmt: string | null
  flag: 'positive' | 'negative' | 'warn' | null
  flagLabel: string | null
  n: number | null
}

const EMPTY: ClaimProjection = {
  element: null, metric: null, metricLabel: null, metricFmt: null,
  flag: null, flagLabel: null, n: null,
}

/**
 * Project a Claim row's claim_data JSON into standard {element, metric, flag, n}
 * cells based on its claim_type. Lets the Claims table show comparable columns
 * across heterogeneous claim_types without forcing every row to fill every cell.
 */
export function projectClaim(claim: Pick<Claim, 'claim_type' | 'claim_data'>): ClaimProjection {
  if (!claim.claim_data) return EMPTY
  let d: Record<string, unknown>
  try { d = JSON.parse(claim.claim_data) as Record<string, unknown> } catch { return EMPTY }

  if (claim.claim_type === 'ManifoldAnalysis') {
    const pr = typeof d.pr === 'number' ? d.pr : null
    const ribbon = d.hyper_ribbon === true
    return {
      element: typeof d.element === 'string' ? d.element : null,
      metric: pr,
      metricLabel: 'PR',
      metricFmt: pr !== null ? pr.toFixed(3) : null,
      flag: pr === null ? null : ribbon ? 'positive' : 'warn',
      flagLabel: ribbon ? 'ribbon' : 'no ribbon',
      n: typeof d.potential_count === 'number' ? d.potential_count : null,
    }
  }
  if (claim.claim_type === 'CausalScreen') {
    const pooled = typeof d.pooled_r === 'number' ? d.pooled_r : null
    const within = typeof d.mean_within_r === 'number' ? d.mean_within_r : null
    const reversal = d.reversal === true
    // Attenuation magnitude: how much the pooled r differs from within r.
    const attenuation = pooled !== null && within !== null ? Math.abs(within - pooled) : null
    return {
      element: typeof d.grouping === 'string' ? d.grouping : null,
      metric: pooled,
      metricLabel: 'pooled r',
      metricFmt: pooled !== null && within !== null
        ? `${pooled.toFixed(3)} → ${within.toFixed(3)}`
        : pooled !== null ? pooled.toFixed(3) : null,
      flag: reversal ? 'negative' : (attenuation !== null && attenuation > 0.4) ? 'warn' : null,
      flagLabel: reversal ? "Simpson's reversal" : (attenuation !== null && attenuation > 0.4) ? 'attenuated' : null,
      n: typeof d.total_records === 'number' ? d.total_records : null,
    }
  }
  if (claim.claim_type === 'AutoHypothesisEvaluation') {
    const verdict = typeof d.verdict === 'string' ? d.verdict : null
    return {
      element: typeof d.element === 'string' ? d.element : null,
      metric: typeof d.confidence === 'number' ? d.confidence : null,
      metricLabel: 'verdict',
      metricFmt: verdict,
      flag: verdict === 'support' ? 'positive' : verdict === 'refute' ? 'negative' : null,
      flagLabel: verdict,
      n: null,
    }
  }
  if (claim.claim_type === 'LiteratureGroundedReasoning') {
    const verdict = typeof d.verdict === 'string' ? d.verdict : null
    return {
      element: typeof d.hypothesis_id === 'string' ? d.hypothesis_id : null,
      metric: typeof d.confidence === 'number' ? d.confidence : null,
      metricLabel: verdict,
      metricFmt: verdict,
      flag: null, flagLabel: null,
      n: typeof d.high_relevance_count === 'number' ? d.high_relevance_count : null,
    }
  }
  return EMPTY
}

// ─── Flag badge ───

export function FlagBadge({ flag, label }: { flag: ClaimProjection['flag']; label: string | null }): ReactElement {
  if (!flag || !label) return <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
  const cls =
    flag === 'positive' ? 'text-[var(--secondary)] bg-[var(--secondary-container)]'
    : flag === 'negative' ? 'text-[var(--error)] bg-[var(--error-container)]'
    : 'text-[var(--primary)] bg-[var(--primary-container)]'
  const sym = flag === 'positive' ? '✓' : flag === 'negative' ? '⚠' : '~'
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider ${cls}`}>
      {sym} {label}
    </span>
  )
}

// ─── Per-tab summary stats ───

export interface SummaryFact {
  label: string
  value: string
  tone?: 'primary' | 'secondary' | 'error' | 'muted'
}

export function summarizeHypotheses(rows: Hypothesis[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const byStatus: Record<string, number> = {}
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  const withConf = rows.filter(r => r.confidence !== null) as Hypothesis[]
  const top = withConf.length > 0
    ? withConf.reduce((a, b) => (a.confidence ?? 0) > (b.confidence ?? 0) ? a : b)
    : null
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    ...Object.entries(byStatus).map(([k, n]) => ({
      label: k,
      value: String(n),
      tone: k === 'refuted' ? 'error' as const : k === 'confirmed' ? 'secondary' as const : 'muted' as const,
    })),
    ...(top ? [{ label: 'top conf', value: `${top.id} (${(top.confidence ?? 0).toFixed(2)})`, tone: 'secondary' as const }] : []),
  ]
}

export function summarizeClaims(rows: Claim[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const byType: Record<string, number> = {}
  for (const r of rows) byType[r.claim_type] = (byType[r.claim_type] ?? 0) + 1
  // Manifold-specific: how many ribbon vs not?
  const manifolds = rows.filter(r => r.claim_type === 'ManifoldAnalysis')
  let ribbonRatio: string | null = null
  if (manifolds.length > 0) {
    let ribbon = 0
    for (const m of manifolds) {
      try { if (JSON.parse(m.claim_data ?? '{}').hyper_ribbon === true) ribbon++ } catch {}
    }
    ribbonRatio = `${ribbon}/${manifolds.length} ribbon`
  }
  // Latest claim recency
  const latest = rows.reduce((a, b) =>
    new Date(a.created_at).getTime() > new Date(b.created_at).getTime() ? a : b)
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    ...Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, n]) => ({ label: k, value: String(n), tone: 'muted' as const })),
    ...(ribbonRatio ? [{ label: 'manifolds', value: ribbonRatio, tone: 'secondary' as const }] : []),
    { label: 'latest', value: relativeTime(latest.created_at), tone: 'muted' as const },
  ]
}

export function summarizeInsights(rows: Insight[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const high = rows.filter(r => (r.relevance_score ?? 0) >= 0.6).length
  const med = rows.filter(r => (r.relevance_score ?? 0) >= 0.4 && (r.relevance_score ?? 0) < 0.6).length
  const low = rows.length - high - med
  // Most-cited hypothesis
  const counts: Record<string, number> = {}
  for (const r of rows) counts[r.hypothesis_id] = (counts[r.hypothesis_id] ?? 0) + 1
  const topPair = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    { label: 'high (≥0.6)', value: String(high), tone: 'secondary' },
    { label: 'medium (0.4-0.6)', value: String(med), tone: 'primary' },
    { label: 'low (<0.4)', value: String(low), tone: 'muted' },
    ...(topPair ? [{ label: 'most-cited', value: `${topPair[0]} (${topPair[1]})`, tone: 'muted' as const }] : []),
  ]
}

export function summarizeHits(rows: Hit[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const byKind: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    byKind[r.kind] = (byKind[r.kind] ?? 0) + 1
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
  }
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    ...Object.entries(byKind).map(([k, n]) => ({
      label: k.replace('_', ' '), value: String(n),
      tone: k === 'missing_experiment' ? 'primary' as const
        : k === 'contradiction' ? 'error' as const
        : k === 'reinforcement' ? 'secondary' as const : 'muted' as const,
    })),
    ...Object.entries(byStatus).filter(([k]) => k === 'open').map(([k, n]) => ({
      label: k, value: String(n), tone: 'primary' as const,
    })),
  ]
}

export function summarizePapers(rows: Paper[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const bySrc: Record<string, number> = {}
  for (const r of rows) bySrc[r.source] = (bySrc[r.source] ?? 0) + 1
  const years = rows.map(r => r.year ?? 0).filter(y => y > 0)
  const range = years.length > 0 ? `${Math.min(...years)}-${Math.max(...years)}` : '—'
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    ...Object.entries(bySrc).map(([k, n]) => ({ label: k, value: String(n), tone: 'muted' as const })),
    { label: 'years', value: range, tone: 'muted' as const },
  ]
}

export function summarizeDeployments(rows: Deployment[]): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const success = rows.filter(r => r.status?.toLowerCase() === 'success').length
  const failure = rows.filter(r => r.status?.toLowerCase() === 'failure').length
  const successRate = rows.length > 0 ? Math.round((success / rows.length) * 100) : 0
  const latest = rows.find(r => r.completed_at) ?? rows[0]
  return [
    { label: 'total', value: String(rows.length), tone: 'primary' },
    { label: 'success', value: `${successRate}%`, tone: 'secondary' },
    { label: 'failures', value: String(failure), tone: failure > 0 ? 'error' : 'muted' },
    { label: 'latest', value: relativeTime(latest?.completed_at ?? latest?.started_at), tone: 'muted' },
  ]
}

export function summarizeGraphNodes(rows: GraphNode[], type: string): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'total', value: '0' }]
  const byStatus: Record<string, number> = {}
  for (const r of rows) {
    const s = r.status ?? 'unknown'
    byStatus[s] = (byStatus[s] ?? 0) + 1
  }
  const latest = rows
    .filter(r => r.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0]
  return [
    { label: type, value: String(rows.length), tone: 'primary' },
    ...Object.entries(byStatus).map(([k, n]) => ({ label: k, value: String(n), tone: 'muted' as const })),
    ...(latest ? [{ label: 'latest', value: relativeTime(latest.created_at), tone: 'muted' as const }] : []),
  ]
}

export function summarizeAgents(rows: Array<{ do_class: string; total_rows: number }>): SummaryFact[] {
  if (rows.length === 0) return [{ label: 'instances', value: '0' }]
  const totalRows = rows.reduce((s, r) => s + (r.total_rows ?? 0), 0)
  const populated = rows.filter(r => r.total_rows > 0).length
  return [
    { label: 'instances', value: String(rows.length), tone: 'primary' },
    { label: 'populated', value: String(populated), tone: 'secondary' },
    { label: 'DO-local rows', value: totalRows.toLocaleString(), tone: 'muted' },
  ]
}

// ─── StatStrip — renders SummaryFact[] as a horizontal chip row ───

export function StatStrip({ facts }: { facts: SummaryFact[] }): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4 px-4 py-3 bg-[var(--surface-container-high)]/30 border border-[var(--outline-variant)] rounded">
      {facts.map((f, i) => {
        const cls =
          f.tone === 'primary' ? 'text-[var(--primary)]'
          : f.tone === 'secondary' ? 'text-[var(--secondary)]'
          : f.tone === 'error' ? 'text-[var(--error)]'
          : 'text-[var(--on-surface)]'
        return (
          <span key={i} className="inline-flex items-baseline gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)]">
              {f.label}
            </span>
            <span className={`font-mono text-sm font-semibold ${cls}`}>{f.value}</span>
          </span>
        )
      })}
    </div>
  )
}
