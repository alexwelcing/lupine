import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/pilots')({
  component: PilotsPage,
  head: () => ({
    meta: [
      { title: 'Pilots — audit, accelerator, three named wedges' },
      { name: 'description', content: 'Solid-state electrolytes, Ni-base superalloys, electrocatalysts. Three wedges where the cross-potential geometry pays off twice: once as a measured error budget and once as a low-rank retraining target that compresses MLIP fine-tunes to the modes that matter.' },
      { property: 'og:title', content: 'Pilots — audit, accelerator, three named wedges' },
      { property: 'og:description', content: 'Pick a wedge. We name the failure modes and hand you the retraining target. No swap-out.' },
      { property: 'og:url', content: 'https://lupine.science/pilots' },
    ],
  }),
})

const WEDGES = [
  {
    id: 'batteries',
    eyebrow: 'WEDGE 01 · ENERGY STORAGE',
    title: 'Solid-state electrolytes',
    accent: 'var(--lupine-400)',
    pain:
      'MLIP-driven NEB on Li-ion conductors is unstable exactly where it matters: at the migration saddle, where Deng et al. (2024) showed universal MLIPs systematically soften the PES.',
    deliverable:
      'Cross-potential audit across the customer-defined MLIP set (typically 6–10 candidates from UMA / MACE-MP / Orb / SevenNet plus internal fine-tunes), localized to migration-barrier curvature, written back as a per-trajectory error budget that travels with every NEB run — and as a 2–3 mode retraining target that compresses fine-tune compute against the modes that actually move test loss (cf. Bordelon, Atanasov & Pehlevan 2025).',
    metricLabel: 'Migration-barrier spread',
    metricValue: '0.1–0.3 eV',
    metricNote: 'The order of magnitude a typical pilot surfaces — small enough that the aggregate score looks like consensus, large enough that the within-MLIP disagreement flips a screening decision.',
  },
  {
    id: 'superalloys',
    eyebrow: 'WEDGE 02 · AEROSPACE',
    title: 'Ni-base γ/γ′ superalloys',
    accent: 'var(--violet-300)',
    pain:
      'Pooling errors across γ and γ′ phases is a textbook Simpson\'s paradox: a potential that wins in aggregate can be inferior on the property the customer cares about (γ/γ′ misfit strain, anti-phase boundary energy, creep activation enthalpy).',
    deliverable:
      'Phase-stratified random-effects meta-analysis with Simpson\'s-paradox detection. We refuse to declare a global winner when the within-phase evidence does not support one, report the within-phase ranking the aggregate would have hidden, and hand the customer a two-mode retraining objective that operates on the misfit-strain residual rather than re-fitting the whole γ/γ′ stack.',
    metricLabel: 'Effective dimensionality',
    metricValue: 'PR/m < 1',
    metricNote: 'The hyper-ribbon criterion (Transtrum, Machta & Sethna 2011) survives stratification by γ/γ′ phase across the customer\'s composition window. The per-phase ranking is the deliverable.',
  },
  {
    id: 'catalysis',
    eyebrow: 'WEDGE 03 · CATALYSIS',
    title: 'Heterogeneous electrocatalysis',
    accent: 'var(--accent-cyan)',
    pain:
      'GGA / GGA+U inconsistencies in MPtrj and Alexandria training data create spurious metal-oxide repulsion. The result is the cross-potential variance Deng et al. flagged — most damaging in adsorbate binding energies and surface reaction barriers.',
    deliverable:
      'OOD detection on adsorbate-coverage configurations, plus property-specific uncertainty for binding energies and reaction barriers. The customer keeps their MLIP; we attach a calibrated confidence to every screening prediction, plus a low-rank correction term that targets the binding-energy residual specifically — a small, sample-efficient fine-tune object instead of a full retrain.',
    metricLabel: 'Adsorbate OOD detector',
    metricValue: 'calibrated',
    metricNote: 'A receiver-operator curve on held-out adsorbate sites the universal MLIP was not trained on, calibrated against the customer\'s reference DFT. Per-pilot AUROC depends on coverage, MLIP, and reference quality — we report the curve, not a headline number.',
  },
]

function PilotsPage() {
  return (
    <PageShell
      kicker="PILOTS · AUDIT + ACCELERATOR"
      title="Pick a wedge. Get the audit and the retraining target."
      subtitle="We do not pilot 'materials informatics in general.' We pilot one named workflow at a time — solid-state electrolytes, Ni-base superalloys, electrocatalysis — and we run the cross-potential geometry against the MLIPs the customer already trusts. The same artifact pays off twice: as a measured error budget, and as a low-rank specification of which modes a fine-tune actually needs to fix. No migration, no swap-out, no synthesis claims."
      maxWidth="5xl"
    >
      <div className="space-y-12">
        <p className="text-[12px] font-mono uppercase tracking-widest text-[var(--on-surface-variant)] opacity-70 -mt-4">
          Illustrative wedges · the metric values describe the order of magnitude a typical pilot surfaces, not a published measurement on a specific customer's MLIP set.
        </p>
        {WEDGES.map((w, i) => (
          <section
            key={w.id}
          >
            <Card elevated style={{ borderTop: `2px solid ${w.accent}` }}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-7">
                  <span className="mono-label block mb-3" style={{ color: w.accent }}>{w.eyebrow}</span>
                  <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">{w.title}</h2>
                  <div className="space-y-5 text-[var(--on-surface-variant)]">
                    <div>
                      <span className="mono-label text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest block mb-1">The pain</span>
                      <p className="font-serif text-base leading-relaxed">{w.pain}</p>
                    </div>
                    <div>
                      <span className="mono-label text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest block mb-1">What Lupine delivers</span>
                      <p className="font-serif text-base leading-relaxed">{w.deliverable}</p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div
                    className="p-6 h-full flex flex-col justify-center rounded-md"
                    style={{
                      background: 'var(--surface-container-low)',
                      border: '1px solid var(--outline-variant)',
                    }}
                  >
                    <span className="mono-label text-[10px] text-[var(--on-surface-variant)] uppercase tracking-widest block mb-3">{w.metricLabel}</span>
                    <div className="font-serif text-3xl lg:text-5xl mb-4" style={{ color: w.accent }}>
                      {w.metricValue}
                    </div>
                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed italic">
                      {w.metricNote}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        ))}

        {/* === DUAL DELIVERABLE === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">WHY THE WEDGES PAY OFF TWICE</span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">The same geometry, two deliverables.</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              Cross-potential PCA returns a small number of dominant error directions and a much
              larger number of negligible ones. That is the same low-effective-dimensionality
              signature that Simon et al. (2026, <em>There Will Be a Scientific Theory of Deep
              Learning</em>) identify as the empirical mark of a learnable system — a "simple
              empirical law" of learning, in their language. For a customer, that mathematical
              shortcut translates to two distinct economic deliverables.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card elevated style={{ borderTop: '2px solid var(--lupine-400)' }}>
              <span className="mono-label text-[var(--lupine-400)] block mb-3">Deliverable A · the audit</span>
              <h3 className="text-xl mb-3 text-[var(--on-surface)] italic">A measured, citable error budget.</h3>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-3">
                Per-property residuals across the customer-defined MLIP set, with bootstrap CIs,
                Simpson's-paradox flags, and OOD detection. Travels as a structured JSON sidecar
                attached to every MD trajectory. Reviewable by a senior internal scientist or an
                external regulator.
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] italic">
                Pricing: per-workflow audit, fixed scope, four weeks.
              </p>
            </Card>
            <Card elevated style={{ borderTop: '2px solid var(--violet-300)' }}>
              <span className="mono-label text-[var(--violet-300)] block mb-3">Deliverable B · the accelerator</span>
              <h3 className="text-xl mb-3 text-[var(--on-surface)] italic">A low-rank retraining target.</h3>
              <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed mb-3">
                The dominant error directions, written as a parameter-efficient fine-tune objective
                — typically 2–3 modes rather than full-model retraining. The cross-potential analog
                of Bordelon, Atanasov &amp; Pehlevan (2025): target the modes that move test loss,
                ignore the rest. Saxe et al. (2014) implies that linear-network learning will
                acquire those modes first anyway; we just say which ones.
              </p>
              <p className="text-xs text-[var(--on-surface-variant)] italic">
                Pricing: ongoing audit subscription with retraining-target updates as the manifest grows.
              </p>
            </Card>
          </div>
        </section>

        {/* === HOW A PILOT RUNS === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">HOW A PILOT RUNS</span>
            <h2 className="font-display tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Four weeks. One workflow. No migration.</h2>
            <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
              Pilots are scoped tight on purpose. We do not promise material discoveries; we
              promise a measured error budget on the customer's own MLIP candidates, attached to
              the customer's own production trajectories.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { week: 'Week 1', title: 'Scope', body: 'Customer names the workflow, the MLIP candidates, the property targets, and the reference DFT (or the experimental anchor). Manifest snapshot date locked.' },
              { week: 'Week 2', title: 'Audit', body: 'Cross-potential PCA, FIM eigenvalues, bootstrap CIs, Simpson\'s-paradox detection, OOD calibration. Runs against the customer\'s benchmark in a single-tenant deployment.' },
              { week: 'Week 3', title: 'Localize', body: 'Per-property residual loadings, identification of the dominant failure modes, comparison against the customer\'s prior MLIP-selection rationale.' },
              { week: 'Week 4', title: 'Integrate', body: 'Per-trajectory error-budget sidecar wired into the customer\'s CI / orchestration. Pilot deliverable signed off; conversion to ongoing audit at customer\'s discretion.' },
            ].map((s, i) => (
              <div
                key={s.week}
              >
                <Card elevated className="h-full">
                  <span className="mono-label text-[var(--primary)] block mb-2">{s.week}</span>
                  <h3 className="text-lg mb-2 text-[var(--on-surface)]">{s.title}</h3>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{s.body}</p>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* === WHAT A PILOT IS NOT === */}
        <section>
          <Card elevated>
            <span className="mono-label text-[var(--secondary)] block mb-3">SCOPE</span>
            <h3 className="text-2xl mb-6 text-[var(--on-surface)]">What a pilot is not</h3>
            <ul className="space-y-4 text-[var(--on-surface-variant)] leading-relaxed">
              <li>
                <strong className="text-[var(--on-surface)]">Not a material-discovery engagement.</strong>{' '}
                Cheetham &amp; Seshadri (2024) settled the question of how seriously to take "stable on the convex hull" claims. We do not make them.
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">Not a synthesis engagement.</strong>{' '}
                Synthesis is somebody else's company — Periodic Labs, CuspAI, A-Lab. The audit
                layer pays for itself entirely upstream of the wet lab.
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">Not a migration.</strong> The
                customer keeps LAMMPS, ASE, KIM, and whichever MLIPs they currently trust. We
                attach. We do not replace.
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">Not a generalized "AI for materials" platform.</strong>{' '}
                Bryce Meredig was right that generalized AI materials platforms struggle to
                deliver venture returns. We are infrastructure for a specific named workflow,
                priced per workflow.
              </li>
            </ul>
          </Card>
        </section>

        {/* === CTA === */}
        <section className="glass-panel p-8 text-center">
          <h3 className="text-2xl mb-4">Pilot a wedge</h3>
          <p className="text-[var(--on-surface-variant)] mb-6 max-w-2xl mx-auto">
            One named workflow, four weeks, single-tenant deployment in your VPC or air-gapped on
            your hardware. Pick one of the three above or send us your own.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="mailto:alexwelcing@gmail.com?subject=Lupine%20pilot%20-%20wedge%20discussion"
              className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-mono text-sm uppercase tracking-widest hover:opacity-90 transition-opacity no-underline"
            >
              Email founders@lupine
            </a>
            <Link
              to="/research"
              className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-mono text-sm uppercase tracking-widest hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors no-underline"
            >
              Read the preprint first
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
