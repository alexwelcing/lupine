import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PageShell } from '../components/ui/PageShell'
import {
  fetchHypotheses,
  fetchPendingCritiques,
  fetchRecentCompletedCritiques,
  fetchResearchQuestions,
  fetchRecentLiterature,
  statusColor,
  type Critique,
  type FetchResult,
  type Hypothesis,
  type LiteraturePaper,
  type ResearchQuestion,
} from '../lib/research'

export const Route = createFileRoute('/lab')({
  component: LabPage,
})

const REFETCH_MS = 30_000

function LabPage() {
  const hypotheses = useQuery({ queryKey: ['lab', 'hypotheses'], queryFn: fetchHypotheses, refetchInterval: REFETCH_MS })
  const pending = useQuery({ queryKey: ['lab', 'critiques-pending'], queryFn: fetchPendingCritiques, refetchInterval: REFETCH_MS })
  const completed = useQuery({ queryKey: ['lab', 'critiques-completed'], queryFn: fetchRecentCompletedCritiques, refetchInterval: REFETCH_MS })
  const questions = useQuery({ queryKey: ['lab', 'questions'], queryFn: fetchResearchQuestions, refetchInterval: REFETCH_MS })
  const literature = useQuery({ queryKey: ['lab', 'literature'], queryFn: fetchRecentLiterature, refetchInterval: REFETCH_MS })

  return (
    <PageShell
      kicker="LAB DASHBOARD: PERSISTED STATE"
      title="Research Lab"
      subtitle="Hypothesis tracker, critique queue, lab-notebook questions, and recent literature ingested by the autonomous swarm. State is persisted in the glim-think D1 ledger; sections show empty states for endpoints that have not yet been deployed."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Section title="HYPOTHESIS TRACKER" subtitle="Live from /hypotheses (unit 1)">
            <SectionContent
              query={hypotheses}
              empty="No hypotheses tracked yet."
              renderData={(data) => <HypothesesTable rows={data} />}
            />
          </Section>

          <Section title="CRITIQUE QUEUE" subtitle="Pending peer-review critiques (unit 2)">
            <SectionContent
              query={pending}
              empty="No pending critiques. The weekly cron will dispatch when new ones arrive."
              renderData={(data) => <CritiqueCards rows={data} />}
            />
          </Section>

          {completed.data?.ok && completed.data.data.length > 0 && (
            <Section title="RECENT COMPLETIONS" subtitle="Last 5 critiques drained">
              <CritiqueCards rows={completed.data.data} variant="completed" />
            </Section>
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <Section title="LAB NOTEBOOK" subtitle="Free-text questions (unit 3)">
            <SectionContent
              query={questions}
              empty="Ask a question via `glim ask \"...\"`."
              renderData={(data) => <QuestionList rows={data} />}
            />
          </Section>

          <Section title="LITERATURE" subtitle="Recently fetched papers (unit 4)">
            <SectionContent
              query={literature}
              empty="No papers cached yet. Run `glim literature search \"<query>\"`."
              renderData={(data) => <LiteratureList rows={data} />}
            />
          </Section>
        </div>
      </div>
    </PageShell>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-panel p-6"
    >
      <div className="mb-6 pb-3 border-b border-[var(--outline-variant)]">
        <h2 className="mono-label text-[var(--secondary)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--on-surface-variant)] mt-1">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  )
}

interface QueryShape<T> {
  data?: FetchResult<T[]>
  isLoading: boolean
  error: unknown
}

function SectionContent<T>({
  query,
  empty,
  renderData,
}: {
  query: QueryShape<T>
  empty: string
  renderData: (data: T[]) => React.ReactNode
}) {
  if (query.isLoading) return <p className="font-mono text-xs text-[var(--on-surface-variant)]">Loading…</p>
  if (query.error) return <p className="font-mono text-xs text-[var(--error)]">Error: {String(query.error)}</p>
  const result = query.data
  if (!result) return <p className="font-mono text-xs text-[var(--on-surface-variant)]">No data.</p>
  if (!result.ok) {
    if (result.reason === 'not_deployed') {
      return (
        <p className="font-mono text-xs text-[var(--on-surface-variant)] italic">
          Endpoint not yet deployed (sibling PR pending).
        </p>
      )
    }
    return (
      <p className="font-mono text-xs text-[var(--error)]">
        {result.reason === 'network_error'
          ? `Network error${result.statusCode ? ` (${result.statusCode})` : ''}`
          : result.reason}
      </p>
    )
  }
  if (result.data.length === 0) {
    return <p className="font-mono text-xs text-[var(--on-surface-variant)] italic">{empty}</p>
  }
  return <>{renderData(result.data)}</>
}

function HypothesesTable({ rows }: { rows: Hypothesis[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="evidence-table w-full">
        <thead>
          <tr>
            <th>id</th>
            <th>title</th>
            <th>status</th>
            <th>confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id}>
              <td className="font-mono text-xs">{h.id}</td>
              <td>{h.title}</td>
              <td>
                <span
                  className="font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider border"
                  style={{ color: statusColor(h.status), borderColor: statusColor(h.status) }}
                >
                  {h.status}
                </span>
              </td>
              <td className="font-mono text-xs">{h.confidence ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CritiqueCards({ rows, variant = 'pending' }: { rows: Critique[]; variant?: 'pending' | 'completed' }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map((c) => (
        <div key={c.id} className="glass-panel-elevated p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">
              {c.source}
            </span>
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 uppercase tracking-wider border"
              style={{ color: statusColor(c.status), borderColor: statusColor(c.status) }}
            >
              {c.status}
            </span>
          </div>
          <p className="text-sm text-[var(--on-surface)] leading-snug mb-3">{c.question}</p>
          {c.target_hypothesis_id && (
            <div className="font-mono text-[10px] text-[var(--secondary)] uppercase tracking-widest">
              targets: {c.target_hypothesis_id}
            </div>
          )}
          {variant === 'completed' && c.response_artifact_key && (
            <div className="font-mono text-[10px] text-[var(--on-surface-variant)] mt-2">
              R2: {c.response_artifact_key}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function QuestionList({ rows }: { rows: ResearchQuestion[] }) {
  return (
    <div className="space-y-3">
      {rows.map((q) => (
        <div key={q.id} className="border-l-2 pl-3" style={{ borderColor: statusColor(q.status) }}>
          <p className="text-sm text-[var(--on-surface)] leading-snug">{q.question}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: statusColor(q.status) }}>
              {q.status}
            </span>
            {q.asked_by && (
              <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">— {q.asked_by}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function LiteratureList({ rows }: { rows: LiteraturePaper[] }) {
  return (
    <div className="space-y-3">
      {rows.map((p) => (
        <div key={p.doi || p.arxiv_id || p.title} className="border-l-2 border-[var(--outline-variant)] pl-3">
          <p className="text-sm text-[var(--on-surface)] leading-snug">{p.title}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest">
              {p.source}
            </span>
            {p.year && (
              <span className="font-mono text-[10px] text-[var(--on-surface-variant)]">{p.year}</span>
            )}
            {p.venue && (
              <span className="font-mono text-[10px] text-[var(--on-surface-variant)] truncate">{p.venue}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
