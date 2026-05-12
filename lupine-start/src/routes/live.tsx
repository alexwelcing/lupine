import { createFileRoute } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import { useQuery } from '@tanstack/react-query'
import { Activity, Atom, CheckCircle2, Clock3, FlaskConical, Radio, Sparkles, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/live')({
  component: LiveLabComponent,
  head: () => ({
    meta: [
      { title: 'Live Lab — harden-stage telemetry' },
      { name: 'description', content: 'Real-time telemetry of the harden stage behind Lupine\'s audit layer: hypotheses being tested, manifest entries being added, refutations being recorded. Public D1 ledger, no curation.' },
    ],
  }),
})

const WORKER_BASE = import.meta.env.VITE_GLIM_THINK_URL ?? 'https://glim-think-v1.aw-ab5.workers.dev'
const FEED_SWARM_URL = `${WORKER_BASE}/feed/swarm`
const FEED_EXPERIMENTS_URL = `${WORKER_BASE}/feed/experiments`
const FEED_METRICS_URL = `${WORKER_BASE}/feed/metrics`
const FEED_BROADCAST_URL = `${WORKER_BASE}/feed/broadcast`
const FEED_HYPOTHESES_URL = `${WORKER_BASE}/feed/hypotheses`
const FEED_RECENT_CLAIMS_URL = `${WORKER_BASE}/feed/recent-claims`
const FEED_VIGNETTE_URL = `${WORKER_BASE}/feed/vignette`
const FEED_BEATS_URL = `${WORKER_BASE}/feed/beats?limit=20`
const BROADCASTS_URL = `${WORKER_BASE}/broadcasts?limit=10`

function timeAgo(dateString: string) {
  if (!dateString) return ''
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const AGENT_ICONS: Record<string, string> = {
  orchestrator: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z',
  manifold: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  causal: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  theorist: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  experiment: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
}

const AGENT_COLORS: Record<string, string> = {
  orchestrator: '#00fbfb',
  manifold: '#ebb2ff',
  causal: '#d4a843',
  theorist: '#7b8ae0',
  experiment: '#4ecdc4',
}

const ELEMENT_COLORS: Record<string, string> = {
  Al: '#00fbfb',
  Cu: '#d4a843',
  Ni: '#ebb2ff',
  Fe: '#e8834a',
  Si: '#4ecdc4',
  Ti: '#7b8ae0',
}

async function fetchJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} returned ${res.status}`)
  return res.json()
}

type Hypothesis = {
  id: string
  title: string
  status: string
  confidence: number | null
  updated_at: string
}

type RecentClaim = {
  claim_id: string
  agent_id: string
  claim_type: string
  description: string
  confidence: number | null
  created_at: string
  is_minimax: boolean
  image_url: string | null
  audio_url: string | null
}

type Vignette = {
  vignette_id: string
  date_key: string
  status: string
  r2_url: string | null
  claim_ids: string[]
  created_at: string
  completed_at: string | null
}

type Beat = {
  beat_id: string
  agent: string
  summary: string
  metrics: Record<string, unknown> | null
  ts: number
}

function LiveLabComponent() {
  const swarmQuery = useQuery({
    queryKey: ['feed-swarm'],
    queryFn: () => fetchJson(FEED_SWARM_URL),
    refetchInterval: 5_000,
  })
  const experimentsQuery = useQuery({
    queryKey: ['feed-experiments'],
    queryFn: () => fetchJson(FEED_EXPERIMENTS_URL),
    refetchInterval: 30_000,
  })
  const metricsQuery = useQuery({
    queryKey: ['feed-metrics'],
    queryFn: () => fetchJson(FEED_METRICS_URL),
    refetchInterval: 60_000,
  })
  const latestBroadcastQuery = useQuery({
    queryKey: ['feed-broadcast'],
    queryFn: () => fetchJson(FEED_BROADCAST_URL),
    refetchInterval: 30_000,
  })
  const hypothesesQuery = useQuery<Hypothesis[]>({
    queryKey: ['feed-hypotheses'],
    queryFn: () => fetchJson(FEED_HYPOTHESES_URL),
    refetchInterval: 30_000,
  })
  const recentClaimsQuery = useQuery<RecentClaim[]>({
    queryKey: ['feed-recent-claims'],
    queryFn: () => fetchJson(FEED_RECENT_CLAIMS_URL),
    refetchInterval: 30_000,
  })
  const vignetteQuery = useQuery<Vignette | null>({
    queryKey: ['feed-vignette'],
    queryFn: () => fetchJson(FEED_VIGNETTE_URL),
    refetchInterval: 60_000,
  })
  const beatsQuery = useQuery<{ beats: Beat[]; count: number }>({
    queryKey: ['feed-beats'],
    queryFn: () => fetchJson(FEED_BEATS_URL),
    refetchInterval: 5_000,
  })
  const { data: broadcastData } = useQuery({
    queryKey: ['lab-broadcasts'],
    queryFn: () => fetchJson(BROADCASTS_URL),
    refetchInterval: 60_000,
  })

  const swarm = swarmQuery.data || {}
  const experiments = experimentsQuery.data
  const pendingExperiments = experiments?.hypotheticals || []
  const metrics = metricsQuery.data
  const hypotheses = (hypothesesQuery.data || []) as Hypothesis[]
  const recentClaims = (recentClaimsQuery.data || []) as RecentClaim[]
  const refutedHypotheses = hypotheses.filter(h => h.status === 'refuted')
  const activeHypotheses = hypotheses.filter(h => h.status === 'testing' || h.status === 'proposed')
  const claimCount = recentClaims.length
  const vignette = vignetteQuery.data
  const beats = beatsQuery.data?.beats ?? []
  const latestBroadcast = latestBroadcastQuery.data || broadcastData?.broadcasts?.[0]
  const broadcasts = broadcastData?.broadcasts || (latestBroadcast ? [latestBroadcast] : [])

  const failedSections = [
    swarmQuery.error && 'swarm',
    experimentsQuery.error && 'experiments',
    metricsQuery.error && 'metrics',
    latestBroadcastQuery.error && 'broadcast',
    hypothesesQuery.error && 'hypotheses',
    recentClaimsQuery.error && 'claims',
  ].filter(Boolean) as string[]
  const broadcastMetrics = latestBroadcast?.metrics
  const data: { swarm_status?: Record<string, unknown> } = { swarm_status: swarm }

  return (
    <PageShell
      kicker="LIVE LAB"
      title="The lab at work"
      subtitle="An autonomous research swarm running on Cloudflare Workers + MiniMax-M2.7. Hypotheses generated, evaluated, and refuted in public, every hour."
    >
      {failedSections.length > 0 && (
        <div className="mb-6 border border-[var(--error)] bg-[var(--error)]/10 px-4 py-3 text-sm">
          <span className="mono-label text-[var(--error)] mr-2">DEGRADED</span>
          <span className="text-[var(--on-surface-variant)]">
            Backend is degraded — failed sections: {failedSections.join(', ')}. Showing last-known values where available.
          </span>
        </div>
      )}
      {vignette?.r2_url && vignette.status === 'complete' && (
        <section className="mb-8 overflow-hidden border border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)]">
            <div className="flex items-center gap-3">
              <span className="mono-label text-[var(--secondary)]">TODAY IN THE LAB</span>
              <span className="mono-label text-[var(--on-surface-variant-mid)]">{vignette.date_key}</span>
            </div>
            <span className="mono-label text-[var(--on-surface-variant-mid)]">Hailuo-2.3 · MiniMax</span>
          </div>
          <video
            src={vignette.r2_url}
            className="block w-full h-auto"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
          />
        </section>
      )}
      <section className="mb-8 overflow-hidden border border-[var(--outline-variant)] bg-[linear-gradient(135deg,rgba(0,251,251,0.10),rgba(235,178,255,0.06)_44%,rgba(212,168,67,0.10))]">
        <div className="grid grid-cols-1 xl:grid-cols-12">
          <div className="xl:col-span-8 p-6 md:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3 mb-7">
              <span className="inline-flex h-9 w-9 items-center justify-center border border-[var(--primary)]/35 bg-[var(--primary-container)] text-[var(--primary)]">
                <Radio size={18} />
              </span>
              <span className="mono-label text-[var(--primary)]">NEXT REPORT WINDOW: TOP OF THE HOUR</span>
              <span className="mono-label text-[var(--on-surface-variant-mid)]">
                {latestBroadcast?.created_at ? timeAgo(latestBroadcast.created_at) : 'awaiting first broadcast'}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl mb-5 max-w-4xl">
              {latestBroadcast?.title || 'The hourly lab broadcast is standing by.'}
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-[var(--on-surface-variant)] max-w-4xl">
              {latestBroadcast?.summary || 'GLIM-THINK will publish a concise progress signal here after the scheduled worker writes the first broadcast artifact.'}
            </p>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
              <BroadcastMetric label="Records" value={broadcastMetrics?.totalRecords ?? '--'} icon={<Atom size={16} />} />
              <BroadcastMetric label="Claims" value={broadcastMetrics?.totalClaims ?? '--'} icon={<Sparkles size={16} />} />
              <BroadcastMetric label="Pending" value={broadcastMetrics?.pendingHypotheses ?? '--'} icon={<Clock3 size={16} />} />
              <BroadcastMetric label="Validated" value={broadcastMetrics?.completedExperiments ?? '--'} icon={<CheckCircle2 size={16} />} />
            </div>
          </div>
          <div className="xl:col-span-4 border-t xl:border-t-0 xl:border-l border-[var(--outline-variant)] bg-[var(--surface-container-low)]/80 p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="mono-label text-[var(--secondary)]">BROADCAST HISTORY</h3>
              <Activity size={16} className="text-[var(--secondary)]" />
            </div>
            <div className="space-y-3">
              {broadcasts.length === 0 ? (
                <div className="border border-dashed border-[var(--outline-variant)] p-5 text-sm text-[var(--on-surface-variant)]">
                  No broadcast artifacts have been published yet.
                </div>
              ) : (
                broadcasts.slice(0, 5).map((broadcast: any) => (
                  <div key={broadcast.broadcast_id} className="border border-[var(--outline-variant)] bg-[var(--surface-container)] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-display text-sm font-semibold text-[var(--on-surface)]">{broadcast.title}</span>
                      <span className="mono-label text-[var(--primary)]">{broadcast.cadence}</span>
                    </div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-[var(--on-surface-variant)]">{broadcast.summary}</p>
                    <div className="mt-3 font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant-mid)]">
                      {timeAgo(broadcast.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Top Stats Bar — counts straight from hypotheses + claims tables */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active agents" value={Object.values(swarm).filter((a: any) => a.status === 'active').length} total={Object.keys(swarm).length} color="var(--primary)" icon={<Activity size={18} />} />
        <StatCard label="Hypotheses" value={activeHypotheses.length} color="#4ecdc4" icon={<FlaskConical size={18} />} />
        <StatCard label="Claims" value={claimCount} color="var(--secondary)" icon={<CheckCircle2 size={18} />} />
        <StatCard label="Refuted" value={refutedHypotheses.length} color="var(--error)" icon={<XCircle size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Swarm Telemetry Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          {/* Producer-heartbeat ticker (atlas-distill emit-beat -> /feed/beats). */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)]">
              <h3 className="mono-label text-[var(--secondary)] flex items-center gap-2">
                <Radio size={14} />
                PRODUCER HEARTBEATS
              </h3>
              <span className="font-mono text-[9px] text-[var(--on-surface-variant)] uppercase tracking-widest">
                {beats.length}/20
              </span>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {beats.length === 0 ? (
                <div className="px-2 py-6 text-center font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">
                  Awaiting first beat
                </div>
              ) : (
                beats.map((beat) => (
                  <div
                    key={beat.beat_id}
                    className="border-l-2 border-[var(--primary)] pl-3 py-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--primary)]">
                        {beat.agent}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--on-surface-variant)]">
                        {timeAgo(new Date(beat.ts * 1000).toISOString())}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--on-surface)] mt-0.5 line-clamp-2">
                      {beat.summary}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--outline-variant)]">
              <h3 className="mono-label text-[var(--secondary)] flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                SWARM TELEMETRY
              </h3>
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]"></span>
                </span>
                <span className="font-mono text-[9px] text-[var(--primary)] uppercase tracking-widest">LIVE</span>
              </span>
            </div>
            <div className="p-6 space-y-4">
              {!data?.swarm_status ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded bg-[var(--surface-container-low)] animate-pulse">
                      <div className="w-8 h-8 rounded bg-[var(--surface-container-high)]"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-20 bg-[var(--surface-container-high)] rounded"></div>
                        <div className="h-2 w-32 bg-[var(--surface-container-high)] rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                Object.entries(data.swarm_status).map(([agentName, info]: any, idx) => (
                  <motion.div
                    key={agentName}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`group flex items-start gap-3 p-3 rounded border transition-colors ${
                      info.status === 'active'
                        ? 'border-[var(--primary)]/20 bg-[var(--primary)]/[0.03]'
                        : 'border-transparent bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)]'
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-[var(--surface-container)] border border-[var(--outline-variant)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AGENT_COLORS[agentName] || 'var(--on-surface-variant)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={AGENT_ICONS[agentName] || AGENT_ICONS.orchestrator} />
                      </svg>
                      {info.status === 'active' && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-60"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--primary)]"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-display text-[12px] font-bold tracking-wide text-[var(--on-surface)] uppercase truncate">{agentName}</span>
                        <span className={`flex-shrink-0 font-mono text-[8px] px-1.5 py-0.5 rounded-none uppercase tracking-wider border ${
                          info.status === 'active'
                            ? 'bg-[var(--primary-container)] text-[var(--primary)] border-[var(--primary)]/30'
                            : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border-[var(--outline-variant)]'
                        }`}>
                          {info.status}
                        </span>
                      </div>
                      <div className="font-sans text-[11px] text-[var(--on-surface-variant)] leading-snug truncate">
                        {info.task}
                      </div>
                      <div className="font-mono text-[9px] text-[var(--on-surface-variant-mid)] mt-1">
                        {timeAgo(info.last_seen)}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Global Metrics */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--outline-variant)]">
              <h3 className="mono-label text-[var(--secondary)]">GLOBAL METRICS</h3>
            </div>
            <div className="p-6">
              {!metrics?.manifold ? (
                <div className="space-y-5">
                  <MetricSkeleton label="Participation Ratio" />
                  <MetricSkeleton label="Manifold Topology" />
                  <MetricSkeleton label="Causal Paradox" />
                </div>
              ) : (
                <div className="space-y-5">
                  <MetricRow
                    label="Participation Ratio"
                    value={metrics.manifold.participationRatio?.toFixed(2) || '--'}
                    highlight={metrics.manifold.hyperRibbon}
                    activeColor="var(--primary)"
                  />
                  <MetricRow
                    label="Manifold Topology"
                    value={metrics.manifold.hyperRibbon ? 'Hyper-Ribbon' : 'Diffuse'}
                    highlight={metrics.manifold.hyperRibbon}
                    activeColor="var(--secondary)"
                  />
                  <MetricRow
                    label="Causal Paradox"
                    value={metrics.causal?.paradoxDetected ? 'DETECTED' : 'CLEAR'}
                    highlight={metrics.causal?.paradoxDetected}
                    activeColor="var(--error)"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Active hypotheses — the actual research portfolio */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--outline-variant)]">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[var(--primary)]"></div>
                <h2 className="text-xl">Active hypotheses</h2>
              </div>
              <span className="mono-label text-[var(--on-surface-variant)]">{activeHypotheses.length} testing · {refutedHypotheses.length} refuted</span>
            </div>
            <div className="p-6 space-y-3">
              {activeHypotheses.length === 0 ? (
                <p className="font-mono text-[13px] text-[var(--on-surface-variant)]">No active hypotheses.</p>
              ) : (
                activeHypotheses.map(h => (
                  <HypothesisRow key={h.id} h={h} />
                ))
              )}
              {refutedHypotheses.length > 0 && (
                <>
                  <div className="pt-4 mt-4 border-t border-[var(--outline-variant)] mono-label text-[var(--error)]">
                    Refuted
                  </div>
                  {refutedHypotheses.map(h => (
                    <HypothesisRow key={h.id} h={h} />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Recent claims — the cron-driven M2.7 narratives */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--outline-variant)]">
              <div className="flex items-center gap-3">
                <div className="relative w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--secondary)] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--secondary)]"></span>
                </div>
                <h3 className="mono-label text-[var(--secondary)]">Recent claims</h3>
              </div>
              <span className="mono-label text-[var(--on-surface-variant-mid)]">MiniMax-M2.7 + auto-evaluator</span>
            </div>
            <div className="divide-y divide-[var(--outline-variant)]">
              {recentClaims.length === 0 ? (
                <div className="p-8 font-mono text-[13px] text-[var(--on-surface-variant)]">
                  &gt; No claims yet. The hourly orchestrator will write one within the hour.
                </div>
              ) : (
                recentClaims.map(c => (
                  <ClaimRow key={c.claim_id} c={c} />
                ))
              )}
            </div>
          </div>

          {/* Pending experiments (was Hypotheticals — renamed since the
              underlying table is `pending_experiments`, distinct from hypotheses) */}
          {pendingExperiments.length > 0 && (
            <div className="glass-panel p-0 overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--outline-variant)]">
                <h3 className="mono-label text-[var(--on-surface-variant)]">Pending experiments · {pendingExperiments.length}</h3>
              </div>
              <div className="p-6">
                <CanonColumn
                  title=""
                  subtitle=""
                  accent="var(--on-surface-variant)"
                  items={pendingExperiments}
                  empty=""
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

function HypothesisRow({ h }: { h: { id: string; title: string; status: string; confidence: number | null; updated_at: string } }) {
  const conf = typeof h.confidence === 'number' ? `${(h.confidence * 100).toFixed(0)}%` : '—'
  const statusColor =
    h.status === 'refuted' ? 'var(--error)' :
    h.status === 'confirmed' ? 'var(--primary)' :
    h.status === 'testing' ? 'var(--secondary)' : 'var(--on-surface-variant)'
  return (
    <div className="border border-[var(--outline-variant)] p-4 hover:border-[var(--primary)]/40 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <span className="mono-label" style={{ color: statusColor }}>{h.status}</span>
        <span className="mono-label text-[var(--on-surface-variant-mid)]">conf {conf}</span>
        <span className="mono-label text-[var(--on-surface-variant-mid)] ml-auto">{timeAgo(h.updated_at)}</span>
      </div>
      <p className="font-sans text-[13px] leading-relaxed text-[var(--on-surface)]">{h.title}</p>
    </div>
  )
}

function FigureExplainer({ imageUrl }: { imageUrl: string }) {
  const [opened, setOpened] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function explain() {
    setOpened(true)
    if (text || loading) return
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('https://glim-think-v1.aw-ab5.workers.dev/api/explain-figure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      })
      const data = await res.json()
      if (data.ok) setText(data.text)
      else setErr(data.error ?? 'unknown error')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t border-[var(--outline-variant)]">
      <button
        type="button"
        onClick={explain}
        className="w-full px-3 py-2 text-left mono-label text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors flex items-center gap-2"
      >
        <span>{opened ? '▾' : '▸'}</span>
        <span>{loading ? 'reading figure…' : opened && text ? 'figure description' : 'explain this figure'}</span>
        <span className="ml-auto text-[var(--on-surface-variant-mid)]">llava-1.5</span>
      </button>
      {opened && text && (
        <p className="px-4 pb-3 text-[12px] leading-relaxed text-[var(--on-surface-variant)]">
          {text}
        </p>
      )}
      {opened && err && (
        <p className="px-4 pb-3 text-[12px] text-[var(--error)]">explain failed: {err}</p>
      )}
    </div>
  )
}

function ClaimRow({ c }: { c: RecentClaim }) {
  const conf = typeof c.confidence === 'number' ? `${(c.confidence * 100).toFixed(0)}%` : ''
  return (
    <div className="px-8 py-5">
      <div className="flex items-center gap-3 mb-3">
        <span
          className={`mono-label px-2 py-0.5 ${c.is_minimax ? 'bg-[var(--secondary)]/15 text-[var(--secondary)]' : 'text-[var(--on-surface-variant)]'}`}
        >
          {c.is_minimax ? 'M2.7' : c.agent_id.split(':').pop() || c.agent_id}
        </span>
        {conf && <span className="mono-label text-[var(--on-surface-variant-mid)]">{conf}</span>}
        <span className="mono-label text-[var(--on-surface-variant-mid)] ml-auto">{timeAgo(c.created_at)}</span>
      </div>
      {c.image_url && (
        <div className="mb-3 overflow-hidden border border-[var(--outline-variant)]">
          <img
            src={c.image_url}
            alt=""
            loading="lazy"
            className="block w-full h-auto aspect-video object-cover"
          />
          <div className="px-3 py-1.5 mono-label text-[var(--on-surface-variant-mid)] bg-[var(--surface-container-low)]/60 flex items-center gap-2">
            <span>image-01 · MiniMax</span>
            {c.audio_url && (
              <>
                <span className="text-[var(--on-surface-variant-mid)]">·</span>
                <audio src={c.audio_url} controls preload="none" className="h-6" />
              </>
            )}
          </div>
          <FigureExplainer imageUrl={c.image_url} />
        </div>
      )}
      {!c.image_url && c.audio_url && (
        <div className="mb-3">
          <audio src={c.audio_url} controls preload="none" className="w-full h-8" />
        </div>
      )}
      <p className="font-sans text-[13px] leading-relaxed text-[var(--on-surface-variant)] line-clamp-3">
        {c.description}
      </p>
    </div>
  )
}

/* ─── Subcomponents ─── */

function BroadcastMetric({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="border border-[var(--outline-variant)] bg-[var(--surface-container-low)]/70 p-4">
      <div className="mb-3 flex items-center justify-between text-[var(--on-surface-variant-mid)]">
        <span className="mono-label">{label}</span>
        <span className="text-[var(--primary)]">{icon}</span>
      </div>
      <div className="font-display text-2xl font-bold text-[var(--on-surface)]">{value}</div>
    </div>
  )
}

function StatCard({ label, value, total, color, icon }: { label: string; value: number; total?: number; color: string; icon: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 flex flex-col"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant-mid)]">{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <motion.span
          key={value}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-3xl font-bold"
          style={{ color }}
        >
          {value}
        </motion.span>
        {total !== undefined && (
          <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">/ {total}</span>
        )}
      </div>
      <div className="mt-3 h-1 w-full bg-[var(--surface-container-high)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${total ? (value / total) * 100 : Math.min(value * 10, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  )
}

function MetricSkeleton({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[9px] text-[var(--on-surface-variant-mid)] uppercase tracking-widest">{label}</span>
      <div className="h-4 w-16 bg-[var(--surface-container-high)] rounded animate-pulse"></div>
    </div>
  )
}

function MetricRow({ label, value, highlight, activeColor }: { label: string; value: string; highlight?: boolean; activeColor: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="font-mono text-[9px] text-[var(--on-surface-variant-mid)] uppercase tracking-widest">{label}</span>
      <span
        className="font-display text-[13px] font-semibold uppercase"
        style={{ color: highlight ? activeColor : 'var(--on-surface)' }}
      >
        {highlight && <span className="inline-block w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: activeColor }}></span>}
        {value}
      </span>
    </div>
  )
}

function CanonColumn({ title, subtitle, accent, items, empty }: {
  title: string
  subtitle: string
  accent: string
  items: any[]
  empty: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="mono-label flex items-center gap-2" style={{ color: accent }}>
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: accent }}></span>
            {title}
          </h4>
          <span className="font-mono text-[9px] text-[var(--on-surface-variant-mid)] uppercase tracking-wider ml-4">{subtitle}</span>
        </div>
        <span className="font-display text-lg font-bold" style={{ color: accent, opacity: 0.4 }}>
          {items?.length || 0}
        </span>
      </div>

      <div className="space-y-3 min-h-[120px]">
        <AnimatePresence mode="popLayout">
          {!items || items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-[var(--outline-variant)] rounded bg-[var(--surface-container-low)]/50"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--on-surface-variant-mid)" strokeWidth="1" className="mb-2 opacity-50">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
              <p className="font-mono text-[10px] text-[var(--on-surface-variant-mid)] text-center leading-relaxed">{empty}</p>
            </motion.div>
          ) : (
            items.slice(0, 6).map((e: any, idx: number) => (
              <motion.div
                key={e.id || e.experiment_id || `${e.element}-${idx}`}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                className="group relative overflow-hidden"
              >
                {/* Left accent border */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: accent }}></div>

                <div className="glass-panel-elevated pl-5 pr-4 py-4 transition-colors group-hover:bg-[var(--surface-container-high)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        {/* Element badge */}
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 font-display text-[10px] font-bold rounded border"
                          style={{
                            backgroundColor: `${ELEMENT_COLORS[e.element] || accent}15`,
                            borderColor: `${ELEMENT_COLORS[e.element] || accent}40`,
                            color: ELEMENT_COLORS[e.element] || accent,
                          }}
                        >
                          {e.element}
                        </span>
                        <span className="font-display text-[13px] font-bold text-[var(--on-surface)] truncate">
                          {e.potential_label || e.pair_style || 'Auto'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Chip label={e.discriminative_property || 'Elastic Constants'} />
                        {e.status && <Chip label={e.status} variant="status" />}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[var(--primary)] uppercase tracking-widest">
                          {timeAgo(e.created_at)}
                        </span>
                        {e.experiment_id && (
                          <span className="font-mono text-[8px] text-[var(--on-surface-variant-mid)] truncate">
                            {e.experiment_id.slice(0, 20)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {items && items.length > 6 && (
          <div className="text-center pt-2">
            <span className="font-mono text-[9px] text-[var(--on-surface-variant-mid)] uppercase tracking-wider">
              + {items.length - 6} more
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function Chip({ label, variant = 'default' }: { label: string; variant?: 'default' | 'status' }) {
  const isStatus = variant === 'status'
  return (
    <span className={`inline-flex items-center font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-none border ${
      isStatus
        ? 'bg-[var(--primary-container)] text-[var(--primary)] border-[var(--primary)]/20'
        : 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] border-[var(--outline-variant)]'
    }`}>
      {label}
    </span>
  )
}
