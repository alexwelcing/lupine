import { createFileRoute } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { marked } from 'marked'
import { useQuery } from '@tanstack/react-query'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/live')({
  component: LiveLabComponent,
  head: () => ({
    meta: [
      { title: 'Live Lab — GLIM-THINK Autonomous Swarm' },
      { name: 'description', content: 'Real-time telemetry of the GLIM-THINK autonomous swarm. Continuous experiment design, error manifold discovery, and model falsification.' },
    ],
  }),
})

const FEED_URL = 'https://glim-think-v1.aw-ab5.workers.dev/feed'

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

function LiveLabComponent() {
  const { data } = useQuery({
    queryKey: ['live-telemetry'],
    queryFn: async () => {
      const res = await fetch(FEED_URL)
      if (!res.ok) throw new Error('Network response was not ok')
      return res.json()
    },
    refetchInterval: 10000,
  })

  const provens = data?.provens || []
  const hypotheticals = data?.hypotheticals || []
  const disproven = data?.disproven || []
  const swarm = data?.swarm_status || {}
  const metrics = data?.metrics
  const diary = data?.diary

  return (
    <PageShell
      kicker="LIVE LAB: OPERATIONAL"
      title="The Living Laboratory"
      subtitle="Real-time telemetry of the GLIM-THINK autonomous swarm. This engine runs 24/7, continuously designing LAMMPS experiments, discovering prediction error manifolds, and falsifying physical models."
    >
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Agents" value={Object.values(swarm).filter((a: any) => a.status === 'active').length} total={Object.keys(swarm).length} color="var(--primary)" />
        <StatCard label="Proven" value={provens.length} color="#4ecdc4" />
        <StatCard label="Hypotheticals" value={hypotheticals.length} color="var(--on-surface-variant)" />
        <StatCard label="Falsified" value={disproven.length} color="var(--error)" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Swarm Telemetry Sidebar */}
        <div className="xl:col-span-4 flex flex-col gap-6">
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
          {/* The Living Canon */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between px-8 py-5 border-b border-[var(--outline-variant)]">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[var(--primary)]"></div>
                <h2 className="text-xl">The Living Canon</h2>
              </div>
              <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest mt-2 md:mt-0">Immutable Ledger of Truth</span>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CanonColumn
                  title="HYPOTHETICALS"
                  subtitle="Queued for validation"
                  accent="var(--on-surface-variant)"
                  items={hypotheticals}
                  empty="Queue empty. Awaiting new hypotheses from the theorist agent."
                />
                <CanonColumn
                  title="PROVENS"
                  subtitle="Experimentally validated"
                  accent="var(--primary)"
                  items={provens}
                  empty="Awaiting validation. Run experiments to populate this ledger."
                />
                <CanonColumn
                  title="DISPROVEN"
                  subtitle="Falsified by evidence"
                  accent="var(--error)"
                  items={disproven}
                  empty="No falsifications. All current hypotheses remain viable."
                />
              </div>
            </div>
          </div>

          {/* Research Diary Stream */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--outline-variant)]">
              <div className="flex items-center gap-3">
                <div className="relative w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--secondary)] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--secondary)]"></span>
                </div>
                <h3 className="mono-label text-[var(--secondary)]">RESEARCH DIARY STREAM</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="mono-label text-[var(--on-surface-variant-mid)]">
                  MODEL: <span className="text-[var(--on-surface)]">{diary?.model || 'SYS'}</span>
                </span>
                <span className="mono-label text-[var(--on-surface-variant-mid)]">
                  ID: <span className="text-[var(--on-surface)]">{diary?.articleId?.slice(0, 8) || '--'}</span>
                </span>
              </div>
            </div>

            <div className="p-8">
              {!diary?.narrative ? (
                <div className="flex items-center gap-3 py-8">
                  <div className="w-3 h-3 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
                  <span className="terminal-glow font-mono text-[13px]">&gt; Awaiting first diary entry...</span>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-[var(--outline-variant)]"></div>
                  <div className="pl-6 prose prose-sm prose-p:font-sans prose-p:text-[var(--on-surface-variant)] prose-headings:font-display prose-headings:text-[var(--on-surface)] prose-strong:text-[var(--on-surface)] max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: marked.parse(diary.narrative) }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/* ─── Subcomponents ─── */

function StatCard({ label, value, total, color }: { label: string; value: number; total?: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5 flex flex-col"
    >
      <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--on-surface-variant-mid)] mb-2">{label}</span>
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
