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
  return `${Math.floor(diff / 3600)}h ago`
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

  return (
    <PageShell
      kicker="LIVE LAB: OPERATIONAL"
      title="The Living Laboratory"
      subtitle="Real-time telemetry of the GLIM-THINK autonomous swarm. This engine runs 24/7, continuously designing LAMMPS experiments, discovering prediction error manifolds, and falsifying physical models."
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Swarm Telemetry Sidebar */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          <div className="glass-panel p-6">
            <h3 className="mono-label text-[var(--secondary)] mb-6 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              SWARM TELEMETRY
            </h3>
            <div className="space-y-5">
              {!data?.swarm_status ? (
                <p className="mono-label text-[var(--on-surface-variant)]">Establishing uplink...</p>
              ) : (
                Object.entries(data.swarm_status).map(([agentName, info]: any) => (
                  <div key={agentName} className="flex flex-col">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-display text-[13px] font-bold tracking-wide text-[var(--on-surface)] uppercase">{agentName}</span>
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-none uppercase tracking-wider ${
                        info.status === 'active' 
                          ? 'bg-[var(--primary-container)] text-[var(--primary)] border border-[var(--primary)]/20' 
                          : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border border-[var(--outline-variant)]'
                      }`}>
                        {info.status}
                      </span>
                    </div>
                    <div className="font-sans text-[13px] text-[var(--on-surface-variant)] leading-snug">{info.task}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="mono-label text-[var(--secondary)] mb-6">GLOBAL METRICS</h3>
            <div className="space-y-4">
              {!data?.metrics?.manifold ? (
                <p className="mono-label text-[var(--on-surface-variant)]">Awaiting reduction...</p>
              ) : (
                <>
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">Part. Ratio</span>
                    <span className={`font-display text-lg leading-none ${data.metrics.manifold.hyperRibbon ? 'text-[var(--primary)] glow-primary' : 'text-[var(--on-surface)]'}`}>
                      {data.metrics.manifold.participationRatio?.toFixed(2) || '--'}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">Topology</span>
                    <span className="font-display text-[13px] uppercase">
                      {data.metrics.manifold.hyperRibbon ? 'Hyper-Ribbon' : 'Diffuse'}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">Paradox</span>
                    <span className={`font-display text-[13px] uppercase ${data.metrics.causal?.paradoxDetected ? 'text-[var(--error)]' : 'text-[var(--secondary)]'}`}>
                      {data.metrics.causal?.paradoxDetected ? 'DETECTED' : 'CLEAR'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* The Living Canon Main Area */}
        <div className="xl:col-span-9 flex flex-col gap-6">
          <div className="glass-panel p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-[var(--outline-variant)]">
              <h2 className="text-2xl">The Living Canon</h2>
              <span className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest mt-2 md:mt-0">Immutable Ledger of Truth</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CanonColumn title="HYPOTHETICALS" color="var(--on-surface)" items={data?.hypotheticals} empty="Queue empty." />
              <CanonColumn title="PROVENS" color="var(--primary)" items={data?.provens} empty="Awaiting validation." />
              <CanonColumn title="DISPROVEN" color="var(--error)" items={data?.disproven} empty="No falsifications." />
            </div>
          </div>

          {/* Auto-Diary Narrative */}
          <div className="glass-panel p-8 relative overflow-hidden">
            <h3 className="mono-label text-[var(--secondary)] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--secondary)] rounded-none"></span>
              RESEARCH DIARY STREAM
            </h3>
            <div className="prose prose-sm prose-p:font-sans prose-p:text-[var(--on-surface-variant)] prose-headings:font-display prose-headings:text-[var(--on-surface)] prose-strong:text-[var(--on-surface)] max-w-none">
              {!data?.diary?.narrative ? (
                <p className="terminal-glow font-mono text-[13px]">&gt;&nbsp;Tail -f /var/log/glim-think/observations...</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: marked.parse(data.diary.narrative) }} />
              )}
            </div>
            <div className="mt-8 pt-4 border-t border-[var(--outline-variant)] flex justify-between items-center">
              <span className="mono-label text-[var(--on-surface-variant)]">MODEL: <span className="text-[var(--on-surface)]">{data?.diary?.model || 'SYS'}</span></span>
              <span className="mono-label text-[var(--on-surface-variant)]">ID: <span className="text-[var(--on-surface)]">{data?.diary?.articleId || '--'}</span></span>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function CanonColumn({ title, color, items, empty }: { title: string, color: string, items: any[], empty: string }) {
  return (
    <div>
      <h4 className="mono-label mb-4 flex items-center gap-2" style={{ color }}>
        {title}
      </h4>
      <div className="space-y-3">
        {!items || items.length === 0 ? (
          <p className="font-mono text-[11px] text-[var(--on-surface-variant)] italic">{empty}</p>
        ) : (
          <AnimatePresence>
            {items.map((e: any) => (
              <motion.div 
                key={e.id || e.created_at}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel-elevated p-4"
              >
                <div className="font-display font-bold text-[14px] text-[var(--on-surface)] mb-1">
                  {e.element}
                </div>
                <div className="font-sans text-[12px] text-[var(--on-surface-variant)] mb-3">
                  via {e.potential_label || e.pair_style || 'Auto'}
                  <br/>
                  <span className="opacity-70 text-[11px]">{e.discriminative_property || 'Elastic Constants'}</span>
                </div>
                <div className="font-mono text-[9px] text-[var(--primary)] uppercase tracking-widest">
                  {timeAgo(e.created_at)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
