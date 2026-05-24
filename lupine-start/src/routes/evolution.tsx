import { createFileRoute } from '@tanstack/react-router'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'
import { DataList, DataListHeader, DataListHeaderCell, DataListRow, DataListCell } from '../components/ui/DataList'

export const Route = createFileRoute('/evolution')({
  component: EvolutionPage,
  head: () => ({
    meta: [
      { title: 'The loop that caught itself — Lupine evolution report' },
      {
        name: 'description',
        content:
          'How the harden stage of the Lupine audit layer organizes the manifest, hardens logic against statistical artifacts, and evaluates cross-potential claims — and how it has demonstrated self-correction by refuting two of its own hypotheses (one survived, one did not) using the same matched-n bootstrap method.',
      },
      { property: 'og:title', content: 'The loop that caught itself — Lupine evolution report' },
      {
        property: 'og:description',
        content:
          'A three-stage cycle (organize → harden → evaluate) sitting behind the audit layer. Demonstrated at small scale, mapped to a 10⁷-record version under BigQuery.',
      },
      { property: 'og:url', content: 'https://lupine.science/evolution' },
    ],
  }),
})

const stageCards = [
  {
    label: '§1 — ORGANIZE',
    title: 'Information enters the system as typed claims.',
    body: 'Every record — a literature harvest, a LAMMPS benchmark, a foundation-MLIP elastic-constant sweep, a critique reply — is keyed to a hypothesis_id and lands as a row in either the local distill SQLite ledger or the public Cloudflare D1 mirror. As of this report, the corpus spans 953 classical potentials, 18 functional-form families, three foundation MLIPs (MACE-MP-0, CHGNet, Orb-v3), 15 elements, 7,940 benchmark records, and 25 active hypotheses across proposed/testing/confirmed/refuted status.',
    artifacts: [
      { name: '/ingest/batch', detail: 'POST endpoint for bulk records — 45 records per MLIP × 3 MLIPs landed today' },
      { name: '/admin/harvest + /admin/comprehend', detail: 'Literature pipeline against arXiv + OpenAlex' },
      { name: '/admin/manifold-recompute', detail: 'Force re-PCA across all 15 elements after new ingest' },
      { name: 'lupine-distill::worker_sync', detail: 'Best-effort auto-push of every local claim to the worker' },
    ],
  },
  {
    label: '§2 — HARDEN',
    title: 'Logic gets hardened against artifacts before claims are advanced.',
    body: 'Every quantitative claim runs through deterministic statistical tests with no LLM in the loop: bootstrap CIs (10,000 iterations), permutation tests (5,000 shuffles), matched-n controls, and Spearman/Mann-Whitney pairings via the Causal Durable Object. The job at this stage is not to find effects — it is to kill artifacts. The matched-n bootstrap is the load-bearing tool; below, you will see the same method used twice in two days to refute two independent hypotheses, both turning out to be sample-size confounders rather than physical phenomena.',
    artifacts: [
      { name: '/admin/d-band-analysis', detail: 'Causal-DO RPC: Spearman + permutation + bootstrap on cross-style PC1 alignment' },
      { name: 'meam_bootstrap.py', detail: '10,000 matched-n subsamples on MEAM error vectors against tersoff baseline' },
      { name: 'cross_mlip_alignment.py', detail: 'Pairwise cosines on unit error vectors across MACE/CHGNet/Orb' },
      { name: 'AutoHypothesisEvaluation', detail: 'Theorist auto-eval claims now fenced from PR-based hypotheses (see Au reconciliation)' },
    ],
  },
  {
    label: '§3 — EVALUATE',
    title: 'Ideas move only when the evidence chain warrants it.',
    body: 'Hypotheses traverse a strict lifecycle: proposed → testing → confirmed | refuted, with status changes requiring evidence_ids attached and a Lean-readiness gate that refuses formalization until five boolean checks pass (confidence ≥ 0.85, verdict stable across 3 rounds, ≥ 5 high-relevance insights, no recent refutations, narrative carries numerical anchors). Synthesis claims close every round and queue the next set of hypotheses, each paired with a concrete experiment description. The /admin/iterate loop chases follow-up queries until the M2.7 reasoner emits no new ones — convergence detection saves real cost.',
    artifacts: [
      { name: 'PATCH /hypotheses/{id}', detail: 'Confidence + evidence_ids + status atomically updated' },
      { name: '/admin/lean-status', detail: 'Five-check formalization gate per hypothesis' },
      { name: 'Synthesis claims', detail: 'Round-closure rows with tested_hypotheses[] + verdicts{} + newly_proposed[]' },
      { name: '/admin/iterate', detail: 'M2.7 reason→harvest→comprehend→re-reason loop with convergence termination' },
    ],
  },
]

const ideaEvolutionRows = [
  {
    round: 'R1',
    date: '2026-05-02',
    claim: 'hyp_cross_style_pc1_universal',
    framing: 'LLM counter-claim: PC1 invariant to functional form across all elements',
    movement: 'pooled cosine 0.689 < threshold 0.7',
    verdict: 'REFUTED',
    verdictTone: 'error',
    spinoff: 'But element-level dichotomy emerged → hyp_pc1_element_form_dichotomy',
  },
  {
    round: 'R1.5',
    date: '2026-05-02',
    claim: 'hyp_rank_pr_scaling',
    framing: 'Many-body rank → PR scaling',
    movement: 'Spearman ρ = -0.26, p = 0.42',
    verdict: 'REFUTED',
    verdictTone: 'error',
    spinoff: 'MEAM-as-outlier observed at full n → hyp_meam_anomaly proposed',
  },
  {
    round: 'R2',
    date: '2026-05-03',
    claim: 'hyp_glim_mlip_value',
    framing: 'Meta-claim: GLIM provides value for MLIP development',
    movement: '1/6 high-relevance — adjacent literature, no anchor',
    verdict: 'GATE BLOCKED',
    verdictTone: 'warning',
    spinoff: 'Pre-seeding lesson promoted to feedback memory; concrete claims search, meta-claims do not',
  },
  {
    round: 'R3',
    date: '2026-05-03',
    claim: 'hyp_top3_lam_diagnostics',
    framing: 'MACE-MP, CHGNet, Orb inherit hyper-ribbon; GLIM diagnostics catch MLIP failure modes',
    movement: '7/7 high-relevance after pre-seed → 0.45 → 0.90 across rounds',
    verdict: 'CONFIRMED',
    verdictTone: 'good',
    spinoff: 'Empirical experiment unblocked: actually run the trio on the IMMI corpus',
  },
  {
    round: 'R3-closure',
    date: '2026-05-04',
    claim: 'hyp_alignment_d_band',
    framing: 'Cross-style PC1 dichotomy explained by d-band fullness',
    movement: 'ρ(d_count, alignment) = -0.02 on full sample (refuted); ρ(n_pairs, alignment) = -0.50 → -0.66 on subset (confounder)',
    verdict: 'REFUTED + CONFOUNDER FOUND',
    verdictTone: 'primary',
    spinoff: 'hyp_alignment_sample_size_artifact confirmed at 0.90; matched-n method established',
  },
  {
    round: 'R4',
    date: '2026-05-04',
    claim: 'h4_mlip_invariance + hyp_top3_lam_diagnostics',
    framing: 'Hyper-ribbon survives MLIP additions',
    movement: '14/15 elements still PR < 2.0 across MACE, CHGNet, Orb (Fe lone outlier)',
    verdict: 'CONFIRMED',
    verdictTone: 'good',
    spinoff: 'Au escape, Pt orthogonality, Fe persistent outlier → 4 new hypotheses queued',
  },
  {
    round: 'R5',
    date: '2026-05-05',
    claim: 'hyp_au_specific_mlip_escape (Au reconciliation)',
    framing: 'PR-based escape vs rank-correlation auto-eval — apparent contradiction',
    movement: 'Both stand: PR measures dimensional spread, rank-r measures monotonicity. Pearson r at n=3 ill-posed for escape detection.',
    verdict: 'METHODOLOGY HARDENED',
    verdictTone: 'primary',
    spinoff: 'Auto-eval framework now fenced from PR-based hypotheses; n ≥ 9 threshold required',
  },
  {
    round: 'R5',
    date: '2026-05-05',
    claim: 'hyp_mlip_alignment_test',
    framing: 'Element-form dichotomy extends to foundation MLIPs',
    movement: 'Spearman ρ = 0.19, p = 0.51 vs classical PC1 alignment',
    verdict: 'REFUTED (expected)',
    verdictTone: 'error',
    spinoff: 'Noble-vs-refractory MLIP split discovered (group means 0.90 vs 0.22) → 2 new hypotheses',
  },
  {
    round: 'R5',
    date: '2026-05-05',
    claim: 'hyp_meam_anomaly',
    framing: 'MEAM PR=2.24 vs tersoff PR=1.01 at same rank — angular term mechanism',
    movement: 'At matched n=7, MEAM median PR=1.36, p05=1.04 — overlaps tersoff. Sample-size confounder, same flavor as d-band.',
    verdict: 'REFUTED + CONFOUNDER FOUND',
    verdictTone: 'primary',
    spinoff: 'hyp_meam_intrinsically_2d (full-n CI [1.58, 2.39]) preserves the narrower defensible claim',
  },
]

const convergenceRows = [
  {
    case: 'd-band closure',
    date: '2026-05-04',
    apparent: 'Closed-shell d10 → high cross-style alignment (ρ predicted ~+0.7 from theory)',
    matchedN: 'Restrict to n_pairs ≥ 3, controlling for sampling depth',
    revealed: 'On full sample, ρ(d_count, alignment) = -0.02 (null). The dichotomy is dominated by sample-size, not d-band.',
    residual: 'On controlled subset, residual d-band signal recovers at ρ = +0.52, p = 0.087',
  },
  {
    case: 'MEAM bootstrap',
    date: '2026-05-05',
    apparent: 'MEAM PR=2.24 vs tersoff PR=1.01 at the same many-body rank — angular term proposed as mechanism',
    matchedN: '10,000 subsamples of MEAM at n=7 (matched to tersoff)',
    revealed: 'MEAM at n=7 median PR=1.36, p05=1.04. Tersoff observed sits at MEAM-at-n=7 5th percentile — barely distinguishable.',
    residual: 'MEAM full-n PR=2.07, bootstrap CI [1.58, 2.39] — the narrower "MEAM is sloppy in 2D at full n" claim survives.',
  },
]

const projectionRows = [
  {
    axis: 'X — corpus scale',
    today: '953 classical potentials × 18 families × 15 elements × 3 properties = 7,940 records. Three foundation MLIPs added in May 2026.',
    grandFinale: 'Full Materials Project corpus (>150k materials), all 600+ KIM/NIST potentials, the broader LAM landscape (M3GNet, SevenNet, GNoME, DPA-3, EquiformerV2), beyond elastics into phonons, defect energies, surface energies, vacancy formation. Order of magnitude: 10⁷–10⁸ records.',
    enabler: 'BigQuery as the structured ledger; Cloud Storage for artifacts; Pub/Sub for streaming ingest events from a fleet of MD runners.',
  },
  {
    axis: 'Y — iteration scale',
    today: 'Five rounds across three days. Three closures landed in a single session (2026-05-05). Two methodological lessons (sample-size, n-threshold) promoted to feedback memory.',
    grandFinale: 'Thousands of rounds running concurrently via Cloud Run worker fleet. Each new MLIP architecture (or new data corpus, or new property class) becomes a round. Hypothesis half-life measured rather than visually inspected.',
    enabler: 'Cloud Run + Cloud Tasks for the iterate worker pool; Vertex AI for the M2.7 reasoner backend; Looker dashboards on BigQuery for round throughput and convergence metrics.',
  },
  {
    axis: 'Self-correction rate',
    today: 'Two independent confounders caught with the same matched-n method, two days apart. Multiple LLM counter-claims refuted by the deterministic harden stage. The Lean-readiness gate has refused every formalization attempt so far.',
    grandFinale: 'Self-correction rate becomes a measurable property. Per 1,000 hypotheses, what fraction get refuted? Per 100 confounders, what fraction are caught before formalization? These become KPIs of the autonomous research system itself.',
    enabler: 'Cloud Logging + BigQuery analytical views; the existing /admin/lean-status overview becomes a SQL query against persistent state.',
  },
]

const verdictPill = (tone: string) => {
  if (tone === 'error')
    return 'text-[var(--error)] bg-[var(--error-container)] border-[var(--error)]/20'
  if (tone === 'warning')
    return 'text-[var(--primary)] bg-[var(--primary-container)] border-[var(--primary)]/20'
  if (tone === 'primary')
    return 'text-[var(--secondary)] bg-[var(--secondary-container)] border-[var(--secondary)]/20'
  if (tone === 'good')
    return 'text-[var(--tertiary)] bg-[var(--tertiary-container)] border-[var(--tertiary)]/20'
  return 'text-[var(--on-surface-variant)] bg-[var(--surface-container-high)] border-[var(--outline-variant)]'
}

function EvolutionPage() {
  return (
    <PageShell
      kicker="HARDEN STAGE EVOLUTION // 2026-05-02 → 2026-05-05"
      title="The loop that caught itself."
      subtitle="The harden stage of Lupine's audit layer — organize the manifest, harden the logic, evaluate the claim — demonstrated at small scale, with the system refuting two of its own hypotheses using the same method (one survived, one did not). This page tells the story of how the canonical claims moved, why the matched-n bootstrap is now load-bearing, and what the 10⁷-record version under BigQuery looks like."
      maxWidth="5xl"
    >
      <div className="space-y-20">
        {/* === FRAME === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §0 — FRAME
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">The cycle, in one sentence</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Every round of work in this project is a loop:{' '}
              <strong className="text-[var(--on-surface)]">organize information</strong> into a typed
              corpus,{' '}
              <strong className="text-[var(--on-surface)]">harden the logic</strong> against
              statistical artifacts, then{' '}
              <strong className="text-[var(--on-surface)]">evaluate ideas</strong> by moving them
              through a strict hypothesis lifecycle. Each stage owns one job. The interesting
              behaviour — the system catching its own mistakes — emerges from the <em>composition</em>{' '}
              of the three.
            </p>
          </div>
        </section>

        {/* === STAGES === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §1 — THE THREE STAGES
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">What each stage owns</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {stageCards.map((c, i) => (
              <div
                key={i}
              >
                <Card elevated className="h-full">
                  <span className="mono-label text-[var(--primary)] block mb-3">{c.label}</span>
                  <h3 className="text-xl mb-3 text-[var(--on-surface)]">{c.title}</h3>
                  <p className="font-serif text-[15px] text-[var(--on-surface-variant)] leading-relaxed mb-5">
                    {c.body}
                  </p>
                  <div className="space-y-2 border-t border-[var(--outline-variant)] pt-4">
                    {c.artifacts.map((a, j) => (
                      <div key={j} className="text-xs">
                        <code className="text-[var(--secondary)]">{a.name}</code>
                        <p className="text-[var(--on-surface-variant)] mt-0.5">{a.detail}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* === IDEA EVOLUTION === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §2 — IDEA EVOLUTION
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">How the canonical claims have moved</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Nine canonical hypotheses, in order of when they entered the testing lifecycle. The
              column on the right names the spinoff that survived — refutations are not dead
              ends; they reliably leave behind a narrower, defensible claim.
            </p>
          </div>

          <Card elevated noPadding className="overflow-x-auto">
            <DataList gridCols="grid-cols-[1fr_2fr_2fr_1fr_2fr]">
              <DataListHeader>
                <DataListHeaderCell>Round / Date</DataListHeaderCell>
                <DataListHeaderCell>Hypothesis</DataListHeaderCell>
                <DataListHeaderCell>Movement</DataListHeaderCell>
                <DataListHeaderCell>Verdict</DataListHeaderCell>
                <DataListHeaderCell>Spinoff</DataListHeaderCell>
              </DataListHeader>
              {ideaEvolutionRows.map((r, i) => (
                <DataListRow key={i} gridCols="grid-cols-[1fr_2fr_2fr_1fr_2fr]">
                  <DataListCell label="Round / Date" className="whitespace-nowrap">
                    <span className="mono-label text-[var(--on-surface-variant)] block">
                      {r.round}
                    </span>
                    <span className="font-mono text-xs text-[var(--on-surface-variant)]">
                      {r.date}
                    </span>
                  </DataListCell>
                  <DataListCell label="Hypothesis">
                    <strong className="text-[var(--on-surface)] block mb-1">{r.claim}</strong>
                    <span className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                      {r.framing}
                    </span>
                  </DataListCell>
                  <DataListCell label="Movement" className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {r.movement}
                  </DataListCell>
                  <DataListCell label="Verdict">
                    <span
                      className={`font-mono text-[10px] px-2 py-1 border uppercase tracking-wider whitespace-nowrap ${verdictPill(r.verdictTone)}`}
                    >
                      {r.verdict}
                    </span>
                  </DataListCell>
                  <DataListCell label="Spinoff" className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {r.spinoff}
                  </DataListCell>
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </section>

        {/* === CONVERGENCE DEMONSTRATION === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §3 — THE CONVERGENCE DEMONSTRATION
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">
              The same matched-n bootstrap caught two artifacts in two days
            </h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              This is the load-bearing claim about the system. Two independent hypotheses, in
              different domains (electronic-structure vs many-body rank), both turned out to be
              sample-size confounders rather than physical phenomena. The same deterministic
              method — restrict the analysis to a controlled subset or subsample to a matched n,
              then re-run — caught both.
            </p>
          </div>

          <div className="space-y-6">
            {convergenceRows.map((r, i) => (
              <div
                key={i}
              >
                <Card elevated noPadding>
                  <div className="p-6 border-b border-[var(--outline-variant)] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">
                        {r.date}
                      </span>
                      <h3 className="font-serif text-xl text-[var(--on-surface)]">{r.case}</h3>
                    </div>
                    <span
                      className={`font-mono text-[10px] px-3 py-1.5 border uppercase tracking-wider whitespace-nowrap ${verdictPill('primary')}`}
                    >
                      Sample-size confounder
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">
                        Apparent finding
                      </span>
                      <p className="text-sm text-[var(--on-surface)] leading-relaxed">
                        {r.apparent}
                      </p>
                    </div>
                    <div>
                      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">
                        Matched-n test
                      </span>
                      <p className="text-sm text-[var(--on-surface)] leading-relaxed">
                        {r.matchedN}
                      </p>
                    </div>
                    <div>
                      <span className="mono-label text-[var(--on-surface-variant)] block mb-1">
                        What was revealed
                      </span>
                      <p className="text-sm text-[var(--on-surface)] leading-relaxed">
                        {r.revealed}
                      </p>
                    </div>
                    <div className="bg-[var(--surface-container-high)] p-4 border-l-2 border-[var(--secondary)]">
                      <span className="mono-label text-[var(--secondary)] block mb-1">
                        Residual surviving claim
                      </span>
                      <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
                        {r.residual}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <div className="mt-8 glass-panel p-6 border-l-2 border-[var(--primary)]">
            <h4 className="mono-label text-[var(--primary)] mb-3">The system property being demonstrated</h4>
            <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
              The same operator (matched-n bootstrap, no LLM in the loop) refuted two hypotheses in
              different scientific domains using the same artifact pattern. That is not a one-off —
              it is the harden stage doing its job repeatedly, and it is what makes the loop
              self-correcting rather than just a fancier version of cherry-picking. Every additional
              round adds another opportunity for the loop to catch itself.
            </p>
          </div>
        </section>

        {/* === PROJECTION === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §4 — THE X-SCALE, Y-ITERATION PROJECTION
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">
              What this looks like at full corpus + thousands of rounds
            </h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              The point of demonstrating self-correction at small scale is to motivate the cost of
              running it at full scale. If a five-round, ~10⁴-record system already catches its
              own confounders, a ~10⁷-record, thousand-round system should produce a measurable
              self-correction rate — a KPI for autonomous science itself.
            </p>
          </div>

          <Card elevated noPadding className="overflow-x-auto">
            <DataList gridCols="grid-cols-[1fr_2fr_2fr_1fr]">
              <DataListHeader>
                <DataListHeaderCell>Axis</DataListHeaderCell>
                <DataListHeaderCell>Today (May 2026)</DataListHeaderCell>
                <DataListHeaderCell>Grand finale</DataListHeaderCell>
                <DataListHeaderCell>Enabler</DataListHeaderCell>
              </DataListHeader>
              {projectionRows.map((r, i) => (
                <DataListRow key={i} gridCols="grid-cols-[1fr_2fr_2fr_1fr]">
                  <DataListCell label="Axis">
                    <strong className="text-[var(--on-surface)] whitespace-nowrap">{r.axis}</strong>
                  </DataListCell>
                  <DataListCell label="Today (May 2026)" className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {r.today}
                  </DataListCell>
                  <DataListCell label="Grand finale" className="text-xs text-[var(--on-surface)] leading-relaxed">
                    {r.grandFinale}
                  </DataListCell>
                  <DataListCell label="Enabler" className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                    {r.enabler}
                  </DataListCell>
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </section>

        {/* === GRAND FINALE === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">
              §5 — GRAND FINALE INFRASTRUCTURE
            </span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">BigQuery + GCP, mapped to the loop</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Cloudflare D1 has carried us through ~10⁴ records and is the right system of record at
              that scale. Beyond ~10⁶ records we will hit D1's storage and query limits, and the
              analytical workloads (SQL aggregations across hypotheses, claim_types, agents,
              timestamps) belong in a columnar warehouse. The migration plan keeps D1 as the
              real-time ledger and adds BigQuery as the analytical mirror, with Cloud Storage for
              artifacts and Cloud Run + Cloud Tasks for the iterate worker fleet.
            </p>
          </div>

          <Card elevated>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <span className="mono-label text-[var(--primary)] block mb-2">Organize</span>
                <h3 className="font-serif text-base text-[var(--on-surface)] mb-2">
                  BigQuery + Cloud Storage
                </h3>
                <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                  A nightly Pub/Sub job mirrors every D1 row into a partitioned BigQuery table
                  (claims, hypotheses, insights, hits). Cloud Storage holds raw simulation outputs,
                  preprint PDFs, and intermediate JSON artifacts referenced by{' '}
                  <code>artifact_uri</code> in the claim row.
                </p>
              </div>
              <div>
                <span className="mono-label text-[var(--primary)] block mb-2">Harden</span>
                <h3 className="font-serif text-base text-[var(--on-surface)] mb-2">
                  Cloud Run + Vertex AI
                </h3>
                <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                  Deterministic statistical jobs (bootstrap, permutation, matched-n controls) run as
                  containerized Cloud Run jobs reading from BigQuery, writing closure claims back via
                  the existing /claims/ingest endpoint. M2.7 reasoning workloads run on Vertex AI
                  managed-model endpoints with a token budget per round.
                </p>
              </div>
              <div>
                <span className="mono-label text-[var(--primary)] block mb-2">Evaluate</span>
                <h3 className="font-serif text-base text-[var(--on-surface)] mb-2">
                  Looker + scheduled iterate
                </h3>
                <p className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                  Looker dashboards on BigQuery surface convergence rate, hypothesis half-life,
                  refutation-per-round, and confounder-catch-rate. Cloud Scheduler fires
                  /admin/iterate on every proposed hypothesis weekly. Lean-readiness gate failures
                  become a SQL query, not a manual inspection.
                </p>
              </div>
            </div>
          </Card>

          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mt-6 max-w-3xl">
            Detailed migration plan in <code>docs/plans/grand_finale_gcp.md</code> — schema mappings,
            cost projections, rollout phases, and a tracer-bullet smoke test that proves the
            organize-stage mirror works before the full migration begins.
          </p>
        </section>

        {/* === CTA === */}
        <section className="glass-panel p-8 text-center">
          <h3 className="text-2xl mb-4">The ledger is public — read it directly</h3>
          <p className="text-[var(--on-surface-variant)] mb-6 max-w-2xl mx-auto">
            Every hypothesis, claim, synthesis, and research note referenced on this page is a row
            in a public Cloudflare D1 database. The loop ran in the open and the trail is auditable.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="https://glim-think-v1.aw-ab5.workers.dev/hypotheses"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-mono text-sm uppercase tracking-[0.08em] hover:opacity-90 transition-opacity"
            >
              Hypotheses ledger
            </a>
            <a
              href="https://glim-think-v1.aw-ab5.workers.dev/claims/research_note_meam_bootstrap_2026_05_05"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-mono text-sm uppercase tracking-[0.08em] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors"
            >
              Most recent closure
            </a>
            <a
              href="/process"
              className="px-6 py-3 border border-[var(--outline)] text-[var(--on-surface)] font-mono text-sm uppercase tracking-[0.08em] hover:bg-[var(--surface-container-high)] transition-colors"
            >
              Operating report
            </a>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
