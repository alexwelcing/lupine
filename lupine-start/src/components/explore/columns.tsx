// Per-entity TanStack Table column definitions for the /console explorer.
// Factories return ColumnDef arrays — let callers memoize.
//
// Design priorities (re-tuned 2026-05-03 for hourly Manifold/Causal runs):
//   1. Structured fields (element, PR, ribbon flag) get their own sortable
//      columns instead of being buried in description prose.
//   2. Confidence + relevance render as visual bars, not raw numbers.
//   3. Timestamps are relative ("8m ago"); full UTC on hover.
//   4. Description is secondary — truncated to 80 chars and hidden by
//      default for time-series tabs (claims, deployments, hits).
//   5. Redundant columns (agent_id when type encodes it) are toggleable
//      but hidden by default to keep the active read clean.
import type { ReactElement } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { createColumnHelper } from '@tanstack/react-table'
import {
  WORKER,
  type Hypothesis,
  type Claim,
  type Insight,
  type Paper,
  type Hit,
  type GraphNode,
  type Deployment,
  type AgentInstance,
} from './types'
import {
  ConfidenceBar,
  RelativeTime,
  FlagBadge,
  projectClaim,
} from './visuals'

// ─── Shared cell helpers ───

export function statusBadge(s: string): ReactElement {
  const tone =
    s === 'refuted' ? 'error'
    : s === 'confirmed' ? 'secondary'
    : s === 'testing' ? 'primary'
    : s === 'open' ? 'primary'
    : s === 'success' || s === 'complete' ? 'secondary'
    : s === 'failed' || s === 'failure' ? 'error'
    : 'muted'
  const cls =
    tone === 'error' ? 'text-[var(--error)] bg-[var(--error-container)]'
    : tone === 'secondary' ? 'text-[var(--secondary)] bg-[var(--secondary-container)]'
    : tone === 'primary' ? 'text-[var(--primary)] bg-[var(--primary-container)]'
    : 'text-[var(--on-surface-variant)] bg-[var(--surface-container-high)]'
  return (
    <span className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider ${cls}`}>
      {s}
    </span>
  )
}

export function ext(url: string, label: string): ReactElement {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-[var(--primary)] hover:underline"
      onClick={e => e.stopPropagation()}
    >
      {label}
    </a>
  )
}

function hypothesisIdCell(
  id: string,
  onDrillHypothesis?: (id: string) => void,
): ReactElement {
  if (!id) return <span className="font-mono text-[10px] text-[var(--secondary)]">—</span>
  if (onDrillHypothesis) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDrillHypothesis(id) }}
        className="font-mono text-[10px] text-[var(--secondary)] hover:underline cursor-pointer bg-transparent border-0 p-0"
      >
        {id}
      </button>
    )
  }
  return <span className="font-mono text-[10px] text-[var(--secondary)]">{id}</span>
}

// Map each tab's column factory to the columns that should be hidden
// by default. The TableShell's column-visibility menu can toggle them on.
export const DEFAULT_HIDDEN: Record<string, string[]> = {
  hypotheses: ['agent_id', 'evidence_ids'],
  claims: ['agent_id', 'description'],
  insights: ['paper_doi'],
  papers: ['arxiv_id'],
  hits: ['proposed_action'],
  critiques: ['source'],
  deployments: ['branch', 'run_id'],
  agents: ['error'],
}

// ─── Hypotheses ───

export function hypothesisColumns(): ColumnDef<Hypothesis, unknown>[] {
  const ch = createColumnHelper<Hypothesis>()
  return [
    ch.accessor('id', {
      header: 'id',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue()}</span>,
    }),
    ch.accessor('title', {
      header: 'title',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string).slice(0, 200)}</span>,
    }),
    ch.accessor('status', {
      header: 'status',
      cell: ({ getValue }) => statusBadge(getValue()),
    }),
    ch.accessor('confidence', {
      header: 'confidence',
      cell: ({ getValue }) => <ConfidenceBar value={getValue() as number | null} />,
    }),
    ch.accessor('agent_id', {
      header: 'agent',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string | null) ?? '—'}
        </span>
      ),
    }),
    ch.accessor('created_at', {
      header: 'created',
      cell: ({ getValue }) => <RelativeTime value={getValue() as string} />,
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => ext(`${WORKER}/hypotheses/${encodeURIComponent(row.original.id)}`, 'json'),
    }),
  ] as ColumnDef<Hypothesis, unknown>[]
}

// ─── Claims ───
//
// Re-shaped 2026-05-03: ManifoldAnalysis + CausalScreen are now the dominant
// claim_types (hourly fleet → 15 + 3). Their structured fields project into
// element / metric / flag / n columns so the table is sortable + filterable
// across the dominant population. Description is hidden by default.

export function claimColumns(
  onDrillHypothesis?: (id: string) => void,
): ColumnDef<Claim, unknown>[] {
  const ch = createColumnHelper<Claim>()
  return [
    ch.accessor('claim_type', {
      header: 'type',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--primary)] whitespace-nowrap">
          {getValue()}
        </span>
      ),
    }),
    ch.accessor(
      (row) => projectClaim(row).element ?? '',
      {
        id: 'element',
        header: 'element',
        cell: ({ getValue }) => {
          const v = getValue() as string
          if (!v) return <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
          return <span className="font-mono text-xs text-[var(--on-surface)]">{v}</span>
        },
      },
    ),
    ch.accessor(
      (row) => {
        const m = projectClaim(row).metric
        return m === null ? Number.NEGATIVE_INFINITY : m
      },
      {
        id: 'metric',
        header: 'metric',
        cell: ({ row }) => {
          const p = projectClaim(row.original)
          if (!p.metricFmt && !p.metricLabel) {
            return <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
          }
          return (
            <span className="inline-flex flex-col">
              <span className="font-mono text-xs text-[var(--on-surface)]">{p.metricFmt}</span>
              {p.metricLabel && (
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
                  {p.metricLabel}
                </span>
              )}
            </span>
          )
        },
      },
    ),
    ch.accessor(
      (row) => projectClaim(row).flagLabel ?? '',
      {
        id: 'flag',
        header: 'flag',
        cell: ({ row }) => {
          const p = projectClaim(row.original)
          return <FlagBadge flag={p.flag} label={p.flagLabel} />
        },
      },
    ),
    ch.accessor(
      (row) => projectClaim(row).n ?? 0,
      {
        id: 'n',
        header: 'n',
        cell: ({ getValue }) => {
          const v = getValue() as number
          return v ? <span className="font-mono text-xs">{v}</span>
            : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
        },
      },
    ),
    ch.accessor('confidence', {
      header: 'confidence',
      cell: ({ getValue }) => <ConfidenceBar value={getValue() as number} />,
    }),
    ch.accessor('description', {
      header: 'description',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--on-surface-variant)]">{(getValue() as string).slice(0, 80)}</span>
      ),
    }),
    ch.accessor('agent_id', {
      header: 'agent',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string) ?? '—'}
        </span>
      ),
    }),
    ch.accessor('created_at', {
      header: 'created',
      cell: ({ getValue }) => <RelativeTime value={getValue() as string} />,
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => ext(`${WORKER}/claims/${encodeURIComponent(row.original.claim_id)}`, 'json'),
    }),
    // Note: onDrillHypothesis is wired through projectClaim's element field
    // when the claim is an AutoHypothesisEvaluation — the element value is
    // the hypothesis_id in that case. Future: parse claim_data.evidence_ids
    // and wrap them in clickable drills.
    ...(onDrillHypothesis ? [] : []),
  ] as ColumnDef<Claim, unknown>[]
}

// ─── Insights ───

export function insightColumns(
  onDrillHypothesis?: (id: string) => void,
): ColumnDef<Insight, unknown>[] {
  const ch = createColumnHelper<Insight>()
  return [
    ch.accessor('relevance_score', {
      header: 'relevance',
      cell: ({ getValue }) => <ConfidenceBar value={getValue() as number | null} />,
    }),
    ch.accessor('agrees_or_refutes', {
      header: 'verdict',
      cell: ({ getValue }) => {
        const v = (getValue() as string) ?? ''
        if (!v) return <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
        const cls =
          v === 'agrees' || v === 'support' ? 'text-[var(--secondary)]'
          : v === 'refutes' || v === 'refute' ? 'text-[var(--error)]'
          : v === 'context' ? 'text-[var(--primary)]'
          : 'text-[var(--on-surface-variant)]'
        return <span className={`font-mono text-[10px] uppercase tracking-wider ${cls}`}>{v}</span>
      },
    }),
    ch.accessor('hypothesis_id', {
      header: 'hypothesis',
      cell: ({ getValue }) => hypothesisIdCell(getValue() as string, onDrillHypothesis),
    }),
    ch.accessor('paper_title', {
      header: 'paper',
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.paper_title ?? row.original.paper_doi}
          {row.original.paper_year ? (
            <span className="text-[var(--on-surface-variant)]"> ({row.original.paper_year})</span>
          ) : null}
        </span>
      ),
    }),
    ch.accessor('paper_doi', {
      header: 'doi',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string) ?? '—'}
        </span>
      ),
    }),
    ch.accessor('key_finding', {
      header: 'key finding',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--on-surface-variant)]">
          {(getValue() as string).slice(0, 180)}
        </span>
      ),
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => {
        const doi = row.original.paper_doi
        const url = doi.startsWith('arxiv:') ? `https://arxiv.org/abs/${doi.slice(6).replace(/v\d+$/,'')}`
          : doi.startsWith('10.') ? `https://doi.org/${doi}` : ''
        return url ? ext(url, 'paper') : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
      },
    }),
  ] as ColumnDef<Insight, unknown>[]
}

// ─── Papers ───

export function paperColumns(): ColumnDef<Paper, unknown>[] {
  const ch = createColumnHelper<Paper>()
  return [
    ch.accessor('source', {
      header: 'src',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--primary)]">{getValue() as string}</span>
      ),
    }),
    ch.accessor('year', {
      header: 'year',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{(getValue() as number) ?? '—'}</span>
      ),
    }),
    ch.accessor('title', {
      header: 'title',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string).slice(0, 240)}</span>,
    }),
    ch.accessor('doi', {
      header: 'doi',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">{getValue() as string}</span>
      ),
    }),
    ch.accessor('arxiv_id', {
      header: 'arxiv',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string) ?? '—'}
        </span>
      ),
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => {
        const doi = row.original.doi
        const url = doi.startsWith('arxiv:') ? `https://arxiv.org/abs/${doi.slice(6).replace(/v\d+$/,'')}`
          : doi.startsWith('10.') ? `https://doi.org/${doi}` : ''
        return url ? ext(url, 'paper') : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
      },
    }),
  ] as ColumnDef<Paper, unknown>[]
}

// ─── Hits ───

export function hitColumns(
  onDrillHypothesis?: (id: string) => void,
): ColumnDef<Hit, unknown>[] {
  const ch = createColumnHelper<Hit>()
  return [
    ch.accessor('kind', {
      header: 'kind',
      cell: ({ getValue }) => {
        const k = getValue() as string
        const cls =
          k === 'missing_experiment' ? 'text-[var(--primary)] bg-[var(--primary-container)]'
          : k === 'contradiction' ? 'text-[var(--error)] bg-[var(--error-container)]'
          : k === 'reinforcement' ? 'text-[var(--secondary)] bg-[var(--secondary-container)]'
          : 'text-[var(--on-surface-variant)] bg-[var(--surface-container-high)]'
        return <span className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider whitespace-nowrap ${cls}`}>{k}</span>
      },
    }),
    ch.accessor('status', {
      header: 'status',
      cell: ({ getValue }) => statusBadge(getValue() as string),
    }),
    ch.accessor('summary', {
      header: 'summary',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string).slice(0, 220)}</span>,
    }),
    ch.accessor('hypothesis_id', {
      header: 'hypothesis',
      cell: ({ getValue }) => hypothesisIdCell(getValue() as string, onDrillHypothesis),
    }),
    ch.accessor('age_hours', {
      header: 'age',
      cell: ({ getValue, row }) => {
        // Prefer relative-time from created_at (more precise) when present.
        return row.original.created_at
          ? <RelativeTime value={row.original.created_at} />
          : <span className="font-mono text-xs">{(getValue() as number) ?? '—'}h</span>
      },
    }),
    ch.accessor('proposed_action', {
      header: 'action',
      cell: ({ getValue }) => (
        <span className="text-xs text-[var(--on-surface-variant)]">
          {((getValue() as string) ?? '—').slice(0, 150)}
        </span>
      ),
    }),
  ] as ColumnDef<Hit, unknown>[]
}

// ─── Critiques (graph nodes) ───

export function critiqueColumns(): ColumnDef<GraphNode, unknown>[] {
  const ch = createColumnHelper<GraphNode>()
  return [
    ch.accessor('id', {
      header: 'id',
      cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string).slice(0, 40)}</span>,
    }),
    ch.accessor('source', {
      header: 'source',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string) ?? '—'}
        </span>
      ),
    }),
    ch.accessor('status', {
      header: 'status',
      cell: ({ getValue }) => statusBadge((getValue() as string) ?? 'unknown'),
    }),
    ch.accessor('label', {
      header: 'question',
      cell: ({ getValue }) => <span className="text-sm">{(getValue() as string).slice(0, 240)}</span>,
    }),
    ch.accessor('created_at', {
      header: 'created',
      cell: ({ getValue }) => <RelativeTime value={getValue() as string} />,
    }),
  ] as ColumnDef<GraphNode, unknown>[]
}

// ─── Vignettes (graph nodes) ───

export function vignetteColumns(): ColumnDef<GraphNode, unknown>[] {
  const ch = createColumnHelper<GraphNode>()
  return [
    ch.accessor('id', {
      header: 'id',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    }),
    ch.accessor('label', {
      header: 'label',
      cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
    }),
    ch.accessor('status', {
      header: 'status',
      cell: ({ getValue }) => statusBadge((getValue() as string) ?? 'unknown'),
    }),
    ch.accessor('created_at', {
      header: 'created',
      cell: ({ getValue }) => <RelativeTime value={getValue() as string} />,
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => {
        const idStr = row.original.id
        const dateMatch = idStr.match(/vignette-([\d-]+)/)
        const datePart = dateMatch ? dateMatch[1] : ''
        const url = `${WORKER}/artifacts/vignettes/${datePart}.mp4`
        return ext(url, 'mp4')
      },
    }),
  ] as ColumnDef<GraphNode, unknown>[]
}

// ─── Deployments ───

export function deploymentColumns(): ColumnDef<Deployment, unknown>[] {
  const ch = createColumnHelper<Deployment>()
  return [
    ch.accessor('service', {
      header: 'service',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    }),
    ch.accessor('status', {
      header: 'status',
      cell: ({ getValue }) => statusBadge(getValue() as string),
    }),
    ch.accessor('branch', {
      header: 'branch',
      cell: ({ getValue }) => <span className="font-mono text-[10px]">{getValue() as string}</span>,
    }),
    ch.accessor('commit_sha', {
      header: 'commit',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px]">{(getValue() as string)?.slice(0, 7) ?? '—'}</span>
      ),
    }),
    ch.accessor('completed_at', {
      header: 'completed',
      cell: ({ getValue }) => <RelativeTime value={getValue() as string | null} />,
    }),
    ch.display({
      id: 'open',
      header: '',
      cell: ({ row }) => row.original.run_url
        ? ext(row.original.run_url, 'github')
        : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>,
    }),
  ] as ColumnDef<Deployment, unknown>[]
}

// ─── Agents ───

export function agentColumns(): ColumnDef<AgentInstance, unknown>[] {
  const ch = createColumnHelper<AgentInstance>()
  return [
    ch.accessor('do_class', {
      header: 'class',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-[var(--primary)]">{getValue() as string}</span>
      ),
    }),
    ch.accessor('instance_name', {
      header: 'instance',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    }),
    ch.accessor('total_rows', {
      header: 'rows',
      cell: ({ getValue }) => {
        const v = getValue() as number
        const cls =
          v >= 10 ? 'text-[var(--secondary)]'
          : v > 0 ? 'text-[var(--primary)]'
          : 'text-[var(--on-surface-variant)]'
        return <span className={`font-mono text-xs ${cls}`}>{v}</span>
      },
    }),
    ch.accessor((row) => Object.entries(row.tables).map(([t, n]) => `${t}:${n}`).join(', '), {
      id: 'tables',
      header: 'tables',
      cell: ({ getValue }) => (
        <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">
          {(getValue() as string) || '—'}
        </span>
      ),
    }),
    ch.accessor('error', {
      header: 'error',
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined
        return v
          ? <span className="font-mono text-[10px] text-[var(--error)]">{v.slice(0, 80)}</span>
          : <span className="text-[10px] text-[var(--on-surface-variant)]">—</span>
      },
    }),
  ] as ColumnDef<AgentInstance, unknown>[]
}

// ─── Default sort by tab ───
//
// Each tab gets a sensible default that matches its dominant read intent.
// These are passed as `initialSorting` to TableShell.
export const DEFAULT_SORT: Record<string, Array<{ id: string; desc: boolean }>> = {
  hypotheses: [{ id: 'confidence', desc: true }],
  claims: [{ id: 'created_at', desc: true }],
  insights: [{ id: 'relevance_score', desc: true }],
  papers: [{ id: 'year', desc: true }],
  hits: [{ id: 'age_hours', desc: false }],
  critiques: [{ id: 'created_at', desc: true }],
  vignettes: [{ id: 'created_at', desc: true }],
  deployments: [{ id: 'completed_at', desc: true }],
  agents: [{ id: 'total_rows', desc: true }],
}
