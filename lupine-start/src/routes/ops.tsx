import { createFileRoute } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/ops')({
  component: OpsDashboard,
})

const OPS_URL = 'https://glim-think-v1.aw-ab5.workers.dev/ops/deployments'

function timeAgo(dateString: string) {
  if (!dateString) return ''
  const diff = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'success': return 'text-[var(--secondary)] bg-[var(--secondary-container)] border-[var(--secondary)]/20'
    case 'failure': return 'text-[var(--error)] bg-[var(--error-container)] border-[var(--error)]/20'
    case 'cancelled': return 'text-[var(--on-surface-variant)] bg-[var(--surface-container-high)] border-[var(--outline-variant)]'
    default: return 'text-[var(--primary)] bg-[var(--primary-container)] border-[var(--primary)]/20'
  }
}

function OpsDashboard() {
  const { data } = useQuery({
    queryKey: ['ops-deployments'],
    queryFn: async () => {
      const res = await fetch(OPS_URL + '?limit=20')
      if (!res.ok) throw new Error('Network response was not ok')
      return res.json()
    },
    refetchInterval: 30000,
  })

  const deployments = data?.deployments || []

  return (
    <main className="min-h-screen pt-[var(--section-pad-y)] pb-12">
      <div className="container mx-auto">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="status-pulse"></span>
            <span className="mono-label text-[var(--primary)] glow-primary">OPS: MONITORING ACTIVE</span>
          </div>
          <h1 className="text-5xl lg:text-6xl mb-6">Deployment Telemetry</h1>
          <p className="text-[var(--on-surface-variant)] text-lg max-w-3xl leading-relaxed">
            Real-time observability into GitHub Actions deploy pipelines. Every push to main is tracked from trigger to completion.
          </p>
        </div>

        <div className="glass-panel p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-[var(--outline-variant)]">
            <h2 className="text-2xl">Recent Deployments</h2>
            <span className="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase tracking-widest mt-2 md:mt-0">
              {deployments.length} runs tracked
            </span>
          </div>

          {deployments.length === 0 ? (
            <div className="text-center py-16">
              <p className="mono-label text-[var(--on-surface-variant)] mb-2">NO DEPLOYMENTS LOGGED</p>
              <p className="font-sans text-[13px] text-[var(--on-surface-variant)]">
                Workflows will report here on their next run.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]">
                    <th className="text-left py-3 px-4 mono-label text-[var(--on-surface-variant)]">Service</th>
                    <th className="text-left py-3 px-4 mono-label text-[var(--on-surface-variant)]">Status</th>
                    <th className="text-left py-3 px-4 mono-label text-[var(--on-surface-variant)]">Branch</th>
                    <th className="text-left py-3 px-4 mono-label text-[var(--on-surface-variant)]">Commit</th>
                    <th className="text-left py-3 px-4 mono-label text-[var(--on-surface-variant)]">When</th>
                    <th className="text-right py-3 px-4 mono-label text-[var(--on-surface-variant)]">Link</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {deployments.map((d: any, i: number) => (
                      <motion.tr
                        key={d.id || i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-[var(--outline-variant)]/50 hover:bg-[var(--surface-container-high)]/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <span className="font-display text-[14px] font-bold text-[var(--on-surface)] uppercase">
                            {d.service}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-mono text-[10px] px-2 py-1 border uppercase tracking-wider ${statusColor(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-[12px] text-[var(--on-surface-variant)]">
                            {d.branch}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">
                            {d.commit_sha ? d.commit_sha.slice(0, 7) : '--'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-mono text-[11px] text-[var(--primary)]">
                            {timeAgo(d.completed_at)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {d.run_url ? (
                            <a
                              href={d.run_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-[var(--secondary)] hover:underline"
                            >
                              View →
                            </a>
                          ) : (
                            <span className="font-mono text-[11px] text-[var(--on-surface-variant)]">--</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
