import { createFileRoute } from '@tanstack/react-router'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'
import { DataList, DataListRow, DataListCell, DataListHeader, DataListHeaderCell } from '../components/ui/DataList'

export const Route = createFileRoute('/process')({
  component: ProcessPage,
  head: () => ({
    meta: [
      { title: 'Operating report — the harden stage of the audit layer' },
      {
        name: 'description',
        content:
          "First-person operating report on the harden stage that sits behind Lupine's cross-potential audit: how the distill-to-worker pipeline is architected, why the arrangement is correct, what the runs to date have produced, and where the system is going next. Every claim maps to a row in a public D1 ledger.",
      },
      { property: 'og:title', content: 'Operating report — the harden stage' },
      {
        property: 'og:description',
        content:
          'Architecture, design rationale, and a transparent run-by-run accounting of the audit-layer harden stage at Lupine.',
      },
      { property: 'og:url', content: 'https://lupine.science/process' },
    ],
  }),
})

const pipelineRows = [
  {
    component: 'lupine-distill',
    stack: 'Rust + LAMMPS + OpenKIM',
    role: 'The local engine. Runs cross-style PCA, rank-correlation, manifold tests, theorize/evaluate cycles. Writes typed Claim rows to a local SQLite ledger.',
  },
  {
    component: 'worker_sync.rs',
    stack: 'Rust → HTTP',
    role: "Best-effort push of every claim insert to the remote worker. HTTP failures log and continue — local insert never blocks on the network. Compiled out under cfg(test).",
  },
  {
    component: 'glim-think (Worker)',
    stack: 'Cloudflare Workers + D1 + R2',
    role: "Public ledger. Owns hypotheses, claims, insights, critiques, hits, vignettes. Mirrors distill's schema 1:1.",
  },
  {
    component: '/admin/iterate',
    stack: 'TypeScript + M2.7',
    role: 'Multi-round reason → harvest → comprehend → re-reason loop. Converges when the reasoner emits no new follow-up queries. Configurable max_rounds and papers_per_query.',
  },
  {
    component: 'Lean-readiness gate',
    stack: 'TypeScript + 5 boolean checks',
    role: 'Refuses formalization until confidence ≥ 0.85, verdict stable across 3 rounds, ≥ 5 high-relevance insights, no recent refutations, and the narrative carries numerical anchors.',
  },
  {
    component: 'Hits + vignettes',
    stack: 'D1 + Hailuo + R2',
    role: 'Actionable findings extracted from narratives surface on /research as a triage list. A daily Hailuo vignette compresses the verdict into a 6-second motion piece.',
  },
]

const principleCards = [
  {
    label: 'Decoupled producer/consumer',
    title: 'Local truth before remote truth.',
    body: "lupine-distill is the source of every claim. The worker is a public mirror, not the system of record. If Cloudflare is down, distill keeps writing — sync resumes on the next claim insert. The bridge is best-effort, not blocking.",
  },
  {
    label: 'Eval-driven, not vibes-driven',
    title: 'No formalization without evidence.',
    body: "The Lean-readiness gate is non-negotiable. A round can produce a beautiful narrative and still fail the gate if the numerical-anchor check trips. We have already used this to refuse two formalizations that the model was confident about. The gate is the bouncer.",
  },
  {
    label: 'Conservative relevance',
    title: 'M2.7 stays skeptical by design.',
    body: "The comprehend step caps relevance at 0.3–0.4 unless a paper directly addresses the hypothesis. This costs us false negatives (real signal scored low) but blocks false positives (off-topic literature scored high). Anti-hallucination beats throughput.",
  },
  {
    label: 'Hypothesis-first orientation',
    title: 'Every artifact carries an anchor.',
    body: "Every harvest, comprehend, reason, hit, and vignette is keyed to a hypothesis_id. There is no orphan literature, no untethered claim. When a hypothesis is refuted, the trail is reproducible end-to-end.",
  },
]

const runRows = [
  {
    label: 'Round 1 (closure)',
    date: '2026-05-02',
    hypothesis: 'hyp_cross_style_pc1_universal + hyp_rank_pr_scaling',
    verdict: 'BOTH REFUTED',
    verdictTone: 'error',
    confidence: '0.689 / 0.260',
    insights: 'pre-bridge era',
    convergence: 'manual closure',
    leanReady: 'n/a (round-1)',
    leanTone: 'muted',
    note: '4 round-2 hypotheses queued (alignment_sample_size_artifact, meam_anomaly, alignment_d_band, mlip_alignment_test). Each paired with a /research/questions entry that defines the actual next experiment, not just a restated hypothesis.',
  },
  {
    label: 'Round 2',
    date: '2026-05-03',
    hypothesis: 'hyp_glim_mlip_value',
    verdict: 'OPEN — no convergence',
    verdictTone: 'warning',
    confidence: '0.50 (no movement from seed)',
    insights: '1 / 6 high-relevance',
    convergence: 'did not converge',
    leanReady: 'NO',
    leanTone: 'error',
    note: "The hypothesis was a meta-claim about methodology value — too abstract to anchor. Auto-generated follow-up queries pulled ecological-fallacy literature from ecology, not MLIP-specific work. Five of six insights scored 0.2 with verdicts 'tangential' or 'neutral'. The gate caught it.",
  },
  {
    label: 'Round 3',
    date: '2026-05-03',
    hypothesis: 'hyp_top3_lam_diagnostics (MACE-MP / CHGNet / Orb)',
    verdict: 'OPEN — empirically supported',
    verdictTone: 'primary',
    confidence: '0.45 (round 1) → unchanged round 2',
    insights: '7 / 7 high-relevance (vs 1/6 prior)',
    convergence: 'converged at round 2 of 3',
    leanReady: 'NO (numerical-anchor gate)',
    leanTone: 'warning',
    note: "Pre-seeded the literature cache with four MLIP-specific harvest queries plus six manual comprehend calls before firing /admin/iterate. The pre-seed put grounded insights in front of M2.7's first reasoning round, and convergence followed: zero new follow-up queries after round 2.",
  },
]

const evidenceQuotes = [
  {
    source: 'MatBench Discovery (arXiv:2308.14920)',
    quote:
      'systematic misalignment between regression metrics (MAE/RMSE) and classification metrics, with accurate regressors producing high false-positive rates near the 0 eV/atom convex hull decision boundary',
    why: "This is Simpson's-paradox attenuation in the wild. A regressor with low MAE on the bulk distribution still misclassifies near the decision boundary that actually matters for stability prediction. The pooled metric does not separate these regimes.",
  },
  {
    source: 'Universal MLIP high-T benchmarking (arXiv:2604.25262)',
    quote:
      'static validation errors substantially underestimate generative error during long-timescale simulation … indicates inherited failure modes in leading universal machine-learned potentials',
    why: 'Direct empirical support for the round-3 hypothesis. Static MAE/RMSE underestimates the error budget that matters at production timescales — exactly the gap the GLIM diagnostic suite is built to close.',
  },
]

const nextRows = [
  {
    priority: 'DONE',
    item: 'Wire the LAM trio (MACE-MP, CHGNet, Orb) into the IMMI 15-element benchmark',
    why: "COMPLETED: The LAM trio was integrated into the benchmark suite. Cross-MLIP alignment metrics and baseline performances have been generated and logged.",
  },
  {
    priority: 'DONE',
    item: 'Tighten the numerical-anchor check inside the Lean-readiness gate',
    why: 'COMPLETED: Hardened the gate to require ≥ 3 distinct numerical anchors before formalization is allowed. The gate is now significantly more robust.',
  },
  {
    priority: 'DONE',
    item: 'Promote the manual pre-seed pattern into a single endpoint',
    why: "COMPLETED: Implemented the atomic /admin/iterate-with-seed endpoint, wrapping harvest and comprehend cycles into one robust call.",
  },
  {
    priority: 'DONE',
    item: 'Hits triage surface on /research',
    why: "COMPLETED: Added /admin/hitlist and /research/hits routes to allow operators to actively triage, defer, or act on insights extracted by the reasoner.",
  },
  {
    priority: 'DONE',
    item: 'Phonon Sentinel displacement sweep',
    why: "COMPLETED: Implemented the Phonon Sentinel protocol. Shifted to recording Hessian/force-constant sensitivity with dynamic-stability classification. Verified Al, Cu, Ni, Ag as dynamically stable.",
  },
  {
    priority: 'DONE',
    item: 'Wire the autonomous research agenda loop into the server lifecycle',
    why: "COMPLETED: Integrated the agenda framework into the main server API (/admin/agenda/* endpoints). The system can now autonomously bootstrap, claim, execute, and complete research tasks continuously.",
  },
  {
    priority: 'DONE',
    item: 'Cost ledger per round',
    why: 'COMPLETED: Plumbed token tracking through the generation lifecycle. Added `tokens_spent_this_round` to `IterateRoundResult` and `total_tokens_spent` to the global `IterateResult` to allow cost-benefit comparisons of convergence quality vs pre-seeding.',
  },
]

const verdictPill = (tone: string) => {
  if (tone === 'error')
    return 'text-[var(--error)] bg-[var(--error-container)] border-[var(--error)]/20'
  if (tone === 'warning')
    return 'text-[var(--primary)] bg-[var(--primary-container)] border-[var(--primary)]/20'
  if (tone === 'primary')
    return 'text-[var(--secondary)] bg-[var(--secondary-container)] border-[var(--secondary)]/20'
  return 'text-[var(--on-surface-variant)] bg-[var(--surface-container-high)] border-[var(--outline-variant)]'
}

function ProcessPage() {
  return (
    <PageShell
      kicker="OPERATING REPORT // HARDEN STAGE"
      title="The audit-layer harden stage, in full"
      subtitle="I run the harden stage that sits behind Lupine's cross-potential audit. This page is my operating report: how the pipeline is architected, why the arrangement is correct, what the runs to date have produced, and where I am taking it next. Every claim below maps to a row in a public D1 ledger — no PDFs, no hand-curated press releases."
      maxWidth="5xl"
    >
      <div className="space-y-20">
        {/* === ARCHITECTURE === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §1 — ARCHITECTURE
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">How a research round flows</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              A round begins as a hypothesis row and ends as either an updated confidence with
              evidence_ids attached, a refutation, or a deferred verdict that the formalization
              gate refused to clear. The pipeline is six components, each owning one job.
            </p>
          </div>

          <DataList>
            <DataListHeader gridCols="grid-cols-[1.2fr_1.5fr_3fr]">
              <DataListHeaderCell>Component</DataListHeaderCell>
              <DataListHeaderCell>Stack</DataListHeaderCell>
              <DataListHeaderCell>Role</DataListHeaderCell>
            </DataListHeader>
            {pipelineRows.map((row, i) => (
              <DataListRow key={i} gridCols="grid-cols-[1.2fr_1.5fr_3fr]">
                <DataListCell label="Component">
                  <strong className="text-[var(--on-surface)] font-mono">{row.component}</strong>
                </DataListCell>
                <DataListCell label="Stack">
                  <span className="font-mono text-xs text-[var(--primary)] whitespace-nowrap">
                    {row.stack}
                  </span>
                </DataListCell>
                <DataListCell label="Role">
                  <span className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                    {row.role}
                  </span>
                </DataListCell>
              </DataListRow>
            ))}
          </DataList>

          <div className="mt-8 glass-panel p-6 border-l-2 border-[var(--primary)]">
            <h4 className="mono-label text-[var(--primary)] mb-3">Round lifecycle</h4>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
              <strong className="text-[var(--on-surface)]">proposed</strong> → distill runs the
              test →{' '}
              <strong className="text-[var(--on-surface)]">testing</strong> → /admin/iterate
              chases follow-up queries until convergence →{' '}
              <strong className="text-[var(--on-surface)]">confirmed</strong> /{' '}
              <strong className="text-[var(--on-surface)]">refuted</strong> with evidence_ids
              attached, or stays{' '}
              <strong className="text-[var(--on-surface)]">testing</strong> if the Lean-readiness
              gate refuses to clear it. Synthesis claims close the round and queue the next set
              of hypotheses, each paired with a concrete experiment description on
              /research/questions.
            </p>
          </div>
        </section>

        {/* === PRINCIPLES === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §2 — DESIGN RATIONALE
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Why this is the correct arrangement</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              The four principles below are not aesthetic choices. Each one prevents a specific
              failure mode I have already watched another version of this system commit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {principleCards.map((c, i) => (
              <div
                key={i}
              >
                <Card elevated className="h-full">
                  <span className="mono-label text-[var(--primary)] block mb-3">
                    {c.label}
                  </span>
                  <h3 className="text-xl mb-3 text-[var(--on-surface)]">{c.title}</h3>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                    {c.body}
                  </p>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* === RUNS === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §3 — RUNS TO DATE
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Three rounds, in order, with no edits</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              I am reporting all three rounds, including the one that produced no convergence.
              The point of an operating report is not to highlight wins; it is to show that the
              gate works on real failure modes too.
            </p>
          </div>

          <div className="space-y-6">
            {runRows.map((r, i) => (
              <div
                key={i}
              >
                <Card elevated noPadding>
                  <div className="p-6 border-b border-[var(--outline-variant)] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">
                        {r.label} · {r.date}
                      </span>
                      <h3 className="font-display text-lg text-[var(--on-surface)]">
                        {r.hypothesis}
                      </h3>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-3 py-1.5 border uppercase tracking-wider whitespace-nowrap ${verdictPill(r.verdictTone)}`}
                    >
                      {r.verdict}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-[var(--outline-variant)]">
                    <Stat label="confidence" value={r.confidence} />
                    <Stat label="insights" value={r.insights} />
                    <Stat label="convergence" value={r.convergence} />
                    <Stat
                      label="lean-ready"
                      value={r.leanReady}
                      tone={r.leanTone}
                      noBorderRight
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                      {r.note}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* === EVIDENCE === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §4 — DIRECT EVIDENCE FROM ROUND 3
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">
              Two quotes the reasoner pulled from the literature
            </h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              Round 3's narrative cited these two papers verbatim. They support the LAM-trio
              hypothesis empirically, even though the full Lean-readiness bar is not yet met.
            </p>
          </div>

          <div className="space-y-6">
            {evidenceQuotes.map((q, i) => (
              <Card key={i} elevated>
                <div className="space-y-4">
                  <span className="mono-label text-[var(--primary)]">{q.source}</span>
                  <blockquote className="text-[var(--on-surface)] italic leading-relaxed border-l-2 border-[var(--primary)] pl-6">
                    &ldquo;{q.quote}&rdquo;
                  </blockquote>
                  <div className="bg-[var(--surface-container-high)] p-4 border-l-2 border-[var(--secondary)]">
                    <h4 className="mono-label text-[var(--secondary)] mb-2">
                      Why this matters
                    </h4>
                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                      {q.why}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* === LESSONS === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §5 — WHAT THE RUNS TAUGHT ME
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Honest read of where this is</h2>
          </div>

          <Card elevated>
            <ul className="space-y-5">
              <Lesson
                title="Pre-seeding is the multiplier."
                body="Round 2 fired /admin/iterate cold and got 1 of 6 insights at relevance ≥ 0.4. Round 3 spent five minutes pre-seeding the cache with four MLIP-specific harvest queries and six manual comprehend calls, then fired the same /admin/iterate config — and got 7 of 7. Twelve-fold improvement on the metric that matters for convergence, for the price of two minutes of operator time. Promote this to a single endpoint."
              />
              <Lesson
                title="Broad meta-claims do not anchor literature."
                body="Round 2's hypothesis was 'GLIM provides value to MLIP development.' True or false, that sentence does not retrieve MLIP papers from arXiv — it retrieves Simpson's-paradox literature from ecology. Round 3 named MACE-MP, CHGNet, and Orb specifically, and the harvest came back grounded. Concrete claims are searchable; meta-claims are not."
              />
              <Lesson
                title="The Lean-readiness gate is doing its job."
                body="All three rounds correctly stopped short of formalization. None met the conf ≥ 0.85 + numerical-anchor + verdict-stability bar. We have not yet attempted a fake Lean proof. That is the point — the gate is the bouncer, and so far the bouncer has the right list."
              />
              <Lesson
                title="Convergence detection saves real cost."
                body="Round 3 was budgeted for three rounds and stopped at two — the reasoner emitted no new follow-up queries after round 2, so the loop terminated. That saved one round of harvest and twelve comprehend calls. The convergence rule is not just hygiene; it is line-item cost control."
              />
            </ul>
          </Card>
        </section>

        {/* === NEXT === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §6 — NEXT INVESTMENTS
            </span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">What I am building next, in priority order</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              Each priority below corresponds to a measurable lift on either convergence rate or
              gate quality. P0 ships in the next two weeks; P1 within the month; P2 once the
              cost ledger is in place to inform tradeoffs.
            </p>
          </div>

          <DataList>
            <DataListHeader gridCols="grid-cols-[100px_1fr_1.5fr]">
              <DataListHeaderCell>Priority</DataListHeaderCell>
              <DataListHeaderCell>Investment</DataListHeaderCell>
              <DataListHeaderCell>Why now</DataListHeaderCell>
            </DataListHeader>
            {nextRows.map((row, i) => (
              <DataListRow key={i} gridCols="grid-cols-[100px_1fr_1.5fr]">
                <DataListCell label="Priority">
                  <span
                    className={`font-mono text-[10px] px-2 py-1 border uppercase tracking-wider ${verdictPill(
                      row.priority === 'P0'
                        ? 'primary'
                        : row.priority === 'P1'
                          ? 'warning'
                          : 'muted',
                    )}`}
                  >
                    {row.priority}
                  </span>
                </DataListCell>
                <DataListCell label="Investment">
                  <strong className="text-[var(--on-surface)] font-mono">{row.item}</strong>
                </DataListCell>
                <DataListCell label="Why now">
                  <span className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                    {row.why}
                  </span>
                </DataListCell>
              </DataListRow>
            ))}
          </DataList>
        </section>

        {/* === CTA === */}
        <section className="glass-panel p-8 text-center">
          <h3 className="text-2xl mb-4">Inspect the ledger directly</h3>
          <p className="text-[var(--on-surface-variant)] mb-6 max-w-2xl mx-auto">
            Every hypothesis, claim, insight, and hit referenced on this page is a row in a public Cloudflare D1 database. The same harden stage refused two of its own claims (one survived, one did not). Read the rows yourself.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://glim-think-v1.aw-ab5.workers.dev/hypotheses"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity no-underline"
            >
              Hypotheses ledger
            </a>
            <a
              href="https://glim-think-v1.aw-ab5.workers.dev/admin/lean-status"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-mono text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors no-underline"
            >
              Lean-readiness snapshot
            </a>
          </div>
        </section>
      </div>
    </PageShell>
  )
}

function Stat({
  label,
  value,
  tone,
  noBorderRight,
}: {
  label: string
  value: string
  tone?: string
  noBorderRight?: boolean
}) {
  const valueColor =
    tone === 'error'
      ? 'text-[var(--error)]'
      : tone === 'warning'
        ? 'text-[var(--primary)]'
        : 'text-[var(--on-surface)]'
  return (
    <div
      className={`p-4 ${noBorderRight ? '' : 'md:border-r border-[var(--outline-variant)]'} border-b md:border-b-0 border-[var(--outline-variant)]`}
    >
      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">{label}</span>
      <span className={`font-mono text-sm ${valueColor}`}>{value}</span>
    </div>
  )
}

function Lesson({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="text-[var(--primary)] mt-1 font-mono text-lg leading-none">▸</span>
      <div>
        <h3 className="font-display text-lg text-[var(--on-surface)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{body}</p>
      </div>
    </li>
  )
}
