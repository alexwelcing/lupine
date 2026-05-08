// /console — tabular explorer for the full Cloudflare research ledger.
// Each tab fetches one entity from the worker, renders a StatStrip summary,
// and a TableShell with default sort + column-visibility tuned to the
// dominant read intent for that tab.
//
// Cross-tab drill: clicking a hypothesis_id in any cell navigates to
// ?tab=hypotheses&hypothesis={id} which seeds the Hypotheses tab's filter.
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { VisibilityState } from '@tanstack/react-table'
import { PageShell } from '../components/ui/PageShell'
import { TableShell } from '../components/explore/TableShell'
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
  type TabKey,
} from '../components/explore/types'
import {
  hypothesisColumns,
  claimColumns,
  insightColumns,
  paperColumns,
  hitColumns,
  critiqueColumns,
  vignetteColumns,
  deploymentColumns,
  agentColumns,
  DEFAULT_SORT,
  DEFAULT_HIDDEN,
} from '../components/explore/columns'
import {
  StatStrip,
  summarizeHypotheses,
  summarizeClaims,
  summarizeInsights,
  summarizeHits,
  summarizePapers,
  summarizeDeployments,
  summarizeGraphNodes,
  summarizeAgents,
} from '../components/explore/visuals'

interface ConsoleSearch {
  tab?: TabKey
  hypothesis?: string
}

const VALID_TABS: TabKey[] = [
  'hypotheses', 'claims', 'insights', 'papers', 'hits',
  'critiques', 'vignettes', 'deployments', 'agents',
]

export const Route = createFileRoute('/console')({
  component: ConsolePage,
  validateSearch: (search: Record<string, unknown>): ConsoleSearch => ({
    tab: VALID_TABS.includes(search.tab as TabKey) ? (search.tab as TabKey) : undefined,
    hypothesis: typeof search.hypothesis === 'string' ? search.hypothesis : undefined,
  }),
  head: () => ({
    meta: [
      { title: 'Research console — manifest ledger explorer' },
      {
        name: 'description',
        content:
          'Tabular browser for every entity behind the Lupine audit layer: hypotheses, cross-potential claims, insights from the literature pipeline, papers, hits, critiques, deployments, and agent storage. Public D1 ledger, no curation.',
      },
    ],
  }),
})

const TABS: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: 'hypotheses', label: 'Hypotheses', desc: 'Active research questions in the ledger — sorted by confidence' },
  { key: 'claims', label: 'Claims', desc: 'Statistical evidence + LLM-grounded reasoning, with structured projections of element / metric / flag for the dominant claim types' },
  { key: 'insights', label: 'Insights', desc: 'M2.7 paper readings tied to hypotheses — sorted by relevance' },
  { key: 'papers', label: 'Papers', desc: 'Literature cache (arXiv / Semantic Scholar / OpenAlex) — newest first' },
  { key: 'hits', label: 'Hits', desc: 'Actionable findings extracted from reasoning narratives — open work first' },
  { key: 'critiques', label: 'Critiques', desc: 'Peer-review trail + responses — newest first' },
  { key: 'vignettes', label: 'Vignettes', desc: 'Hailuo daily/custom 6s videos — newest first' },
  { key: 'deployments', label: 'Deployments', desc: 'CI/CD telemetry — newest first' },
  { key: 'agents', label: 'Agents', desc: 'DO instances + private SQL row counts — busiest first' },
]

// Tab counts come from /graph.json's stats.by_type (single fetch) + the
// agents endpoint for the Agents tab. Cached for 30s by TanStack Query.
function useTabCounts() {
  const graph = useQuery({
    queryKey: ['graph-snapshot'],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/graph.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const j = await res.json() as { stats: { by_type: Record<string, number> }; nodes: unknown[] }
      return j.stats.by_type ?? {}
    },
    staleTime: 30_000,
  })
  const agents = useQuery({
    queryKey: ['worker', '/graph/agents.json'],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/graph/agents.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const j = await res.json() as { instances: AgentInstance[] }
      return j.instances.length
    },
    staleTime: 30_000,
  })
  const byType = graph.data ?? {}
  const counts: Record<TabKey, number | undefined> = {
    hypotheses: byType.hypothesis,
    claims: byType.claim,
    insights: byType.insight,
    papers: byType.paper,
    hits: byType.hit,
    critiques: byType.critique,
    vignettes: byType.vignette,
    deployments: byType.deployment,
    agents: agents.data,
  }
  return counts
}

function ConsolePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const tab: TabKey = search.tab ?? 'hypotheses'
  const drillHypothesis = search.hypothesis
  const activeMeta = TABS.find(t => t.key === tab)!
  const counts = useTabCounts()

  const onDrillHypothesis = (id: string) => {
    navigate({ search: () => ({ tab: 'hypotheses' as TabKey, hypothesis: id }) })
  }

  const setTab = (next: TabKey) => {
    navigate({
      search: (prev: ConsoleSearch) => ({
        tab: next,
        hypothesis: next === 'hypotheses' ? prev.hypothesis : undefined,
      }),
    })
  }

  const clearDrill = () => navigate({ search: () => ({ tab: 'hypotheses' as TabKey }) })

  return (
    <PageShell
      kicker="RESEARCH CONSOLE · MANIFEST LEDGER"
      title="The audit ledger, in one table"
      subtitle="Every hypothesis, cross-potential claim, insight, paper, hit, critique, vignette, deployment, and agent instance behind the audit layer — structured for at-a-glance reading, sortable, filterable, exportable, and one click from its raw JSON."
      maxWidth="full"
    >
      <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--outline-variant)] pb-4">
        {TABS.map(t => {
          const n = counts[t.key]
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-mono text-[11px] uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                active
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--on-primary)]'
                  : 'border-[var(--outline-variant)] text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:border-[var(--primary)]'
              }`}
            >
              {t.label}
              {typeof n === 'number' && (
                <span className={`ml-1.5 ${active ? 'opacity-80' : 'opacity-60'}`}>
                  · {n}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="mono-label text-[var(--secondary)] mb-1">{activeMeta.label}</p>
          <p className="text-[var(--on-surface-variant)] text-sm">{activeMeta.desc}</p>
        </div>
        {tab === 'hypotheses' && drillHypothesis && (
          <div className="glass-panel px-3 py-1.5 flex items-center gap-3 border-l-2 border-[var(--primary)]">
            <span className="mono-label text-[var(--primary)]">drill:</span>
            <span className="font-mono text-xs text-[var(--on-surface)]">{drillHypothesis}</span>
            <button
              onClick={clearDrill}
              className="font-mono text-[10px] uppercase tracking-widest text-[var(--on-surface-variant)] hover:text-[var(--primary)]"
            >
              clear
            </button>
          </div>
        )}
      </div>

      {tab === 'hypotheses' && <HypothesesTable initialFilter={drillHypothesis ?? ''} />}
      {tab === 'claims' && <ClaimsTable onDrillHypothesis={onDrillHypothesis} />}
      {tab === 'insights' && <InsightsTable onDrillHypothesis={onDrillHypothesis} />}
      {tab === 'papers' && <PapersTable />}
      {tab === 'hits' && <HitsTable onDrillHypothesis={onDrillHypothesis} />}
      {tab === 'critiques' && <CritiquesTable />}
      {tab === 'vignettes' && <VignettesTable />}
      {tab === 'deployments' && <DeploymentsTable />}
      {tab === 'agents' && <AgentsTable />}
    </PageShell>
  )
}

// ─── Per-entity tab components ───

function useWorker<T>(path: string, transform: (j: unknown) => T[]) {
  return useQuery({
    queryKey: ['worker', path],
    queryFn: async () => {
      const res = await fetch(`${WORKER}${path}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const json = await res.json()
      return transform(json)
    },
    staleTime: 30_000,
  })
}

function hideMap(keys: string[]): VisibilityState {
  return Object.fromEntries(keys.map(k => [k, false]))
}

function HypothesesTable({ initialFilter }: { initialFilter: string }) {
  const q = useWorker<Hypothesis>('/hypotheses', j => Array.isArray(j) ? j as Hypothesis[] : [])
  const cols = useMemo(() => hypothesisColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeHypotheses(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search title or id…"
        tabLabel="hypotheses"
        initialGlobalFilter={initialFilter}
        initialSorting={DEFAULT_SORT.hypotheses}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.hypotheses ?? [])}
      />
    </>
  )
}

function ClaimsTable({ onDrillHypothesis }: { onDrillHypothesis: (id: string) => void }) {
  const q = useWorker<Claim>('/claims?limit=300', j => (j as { claims?: Claim[] }).claims ?? [])
  const cols = useMemo(() => claimColumns(onDrillHypothesis), [onDrillHypothesis])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeClaims(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search type, element, description…"
        tabLabel="claims"
        initialSorting={DEFAULT_SORT.claims}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.claims ?? [])}
      />
    </>
  )
}

function InsightsTable({ onDrillHypothesis }: { onDrillHypothesis: (id: string) => void }) {
  const q = useWorker<Insight>('/admin/insights?limit=300', j => (j as { insights?: Insight[] }).insights ?? [])
  const cols = useMemo(() => insightColumns(onDrillHypothesis), [onDrillHypothesis])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeInsights(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search title, finding, hypothesis…"
        tabLabel="insights"
        initialSorting={DEFAULT_SORT.insights}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.insights ?? [])}
      />
    </>
  )
}

function PapersTable() {
  const q = useWorker<Paper>('/literature/papers?limit=500', j => (j as { papers?: Paper[] }).papers ?? [])
  const cols = useMemo(() => paperColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizePapers(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search title or doi…"
        tabLabel="papers"
        initialSorting={DEFAULT_SORT.papers}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.papers ?? [])}
      />
    </>
  )
}

function HitsTable({ onDrillHypothesis }: { onDrillHypothesis: (id: string) => void }) {
  const q = useWorker<Hit>('/research/hits?limit=200', j => (j as { hits?: Hit[] }).hits ?? [])
  const cols = useMemo(() => hitColumns(onDrillHypothesis), [onDrillHypothesis])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeHits(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search summary, kind, action…"
        tabLabel="hits"
        initialSorting={DEFAULT_SORT.hits}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.hits ?? [])}
      />
    </>
  )
}

function useGraphNodesByType(typeFilter: string) {
  return useQuery({
    queryKey: ['graph-snapshot'],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/graph.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const j = await res.json() as { nodes: GraphNode[] }
      return j.nodes
    },
    staleTime: 30_000,
    select: (nodes: GraphNode[]) => nodes.filter(n => n.type === typeFilter),
  })
}

function CritiquesTable() {
  const q = useGraphNodesByType('critique')
  const cols = useMemo(() => critiqueColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeGraphNodes(data, 'critiques')} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search question or source…"
        tabLabel="critiques"
        initialSorting={DEFAULT_SORT.critiques}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.critiques ?? [])}
      />
    </>
  )
}

function VignettesTable() {
  const q = useGraphNodesByType('vignette')
  const cols = useMemo(() => vignetteColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeGraphNodes(data, 'vignettes')} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search vignette…"
        tabLabel="vignettes"
        initialSorting={DEFAULT_SORT.vignettes}
      />
    </>
  )
}

function DeploymentsTable() {
  const q = useWorker<Deployment>('/ops/deployments?limit=200', j => (j as { deployments?: Deployment[] }).deployments ?? [])
  const cols = useMemo(() => deploymentColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeDeployments(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search service, commit, branch…"
        tabLabel="deployments"
        initialPageSize={50}
        initialSorting={DEFAULT_SORT.deployments}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.deployments ?? [])}
      />
    </>
  )
}

function AgentsTable() {
  const q = useQuery({
    queryKey: ['worker', '/graph/agents.json'],
    queryFn: async () => {
      const res = await fetch(`${WORKER}/graph/agents.json`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const j = await res.json() as { instances: AgentInstance[] }
      return j.instances
    },
    staleTime: 30_000,
  })
  const cols = useMemo(() => agentColumns(), [])
  const data = q.data ?? []
  return (
    <>
      <StatStrip facts={summarizeAgents(data)} />
      <TableShell
        data={data}
        columns={cols}
        isLoading={q.isLoading}
        isError={q.isError}
        errorMessage={q.error?.message}
        searchPlaceholder="search class or instance…"
        tabLabel="agents"
        initialPageSize={50}
        initialSorting={DEFAULT_SORT.agents}
        initialColumnVisibility={hideMap(DEFAULT_HIDDEN.agents ?? [])}
      />
    </>
  )
}
