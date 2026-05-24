import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/lineage')({
  component: LineagePage,
  head: () => ({
    meta: [
      { title: 'Lineage — sloppy-models materials science meets learning mechanics' },
      { name: 'description', content: 'The 22-year sloppy-models lineage (Frederiksen 2004 → Transtrum/Sethna 2011 → Wen et al. 2017 → Kurniawan 2022 → Deng 2024) intersected with the emerging learning-mechanics program (Simon et al. 2026, Bordelon/Atanasov/Pehlevan 2025, Saxe et al. 2014). The narrow novelty Lupine contributes sits at the intersection.' },
      { property: 'og:title', content: 'Lineage — sloppy-models materials science meets learning mechanics' },
      { property: 'og:description', content: 'The lineage we cite is the lineage we extend. Two parallel programs, one applied wedge.' },
      { property: 'og:url', content: 'https://lupine.science/lineage' },
    ],
  }),
})

const PRIORS = [
  {
    year: '2003',
    cite: 'Brown & Sethna',
    venue: 'Phys. Rev. E',
    title: 'Statistical mechanical approaches to models with many poorly known parameters',
    note: "First systematic treatment of 'sloppy' parameter spaces — eigenvalue spectra of the Fisher information matrix span many orders of magnitude. The starting point.",
    role: 'prior',
  },
  {
    year: '2004',
    cite: 'Frederiksen, Jacobsen, Brown & Sethna',
    venue: 'Phys. Rev. Lett. 93, 165501',
    title: 'Bayesian Ensemble Approach to Error Estimation of Interatomic Potentials',
    note: 'Demonstrated that ensembles of Mo potentials, fit with reasonable error tolerances, collapse to a low-effective-dimensionality structure. The first time the sloppy-models lens was turned on interatomic potentials specifically.',
    role: 'prior',
  },
  {
    year: '2011',
    cite: 'Transtrum, Machta & Sethna',
    venue: 'Phys. Rev. E 83, 036701',
    title: 'Geometry of nonlinear least squares with applications to sloppy models and optimization',
    note: 'Where the term "hyper-ribbon" was introduced — characterized by a geometric series of widths, extrinsic curvatures, and parameter-effect curvatures. Lupine borrows this terminology and cites it. Failing to cite would be embarrassing.',
    role: 'prior',
    pinned: true,
  },
  {
    year: '2013',
    cite: 'Machta, Chachra, Transtrum & Sethna',
    venue: 'Science 342, 604',
    title: 'Parameter Space Compression Underlies Emergent Theories and Predictive Models',
    note: 'Generalizes the geometry beyond physics to systems biology and beyond. Establishes the broader context for why low-effective-dimensionality is a recurring empirical pattern in calibrated scientific models.',
    role: 'prior',
  },
  {
    year: '2017',
    cite: 'Wen, Li, Brommer, Elliott, Sethna & Tadmor',
    venue: 'Modell. Simul. Mater. Sci. Eng. 25, 014001',
    title: 'A KIM-compliant potfit for fitting sloppy interatomic potentials: application to the EDIP model for silicon',
    note: 'Demonstrated EDIP for silicon is sloppy via OpenKIM. Tadmor and Elliott bring the OpenKIM infrastructure into the lineage; this is the bridge from the theory to the catalog Lupine\'s manifest sits on.',
    role: 'prior',
  },
  {
    year: '2022',
    cite: 'Kurniawan et al.',
    venue: 'arXiv:2112.10851',
    title: 'Bayesian, frequentist, and information-geometric approaches to parametric uncertainty quantification of classical empirical interatomic potentials',
    note: 'Ran FIM eigenvalue analysis on Lennard-Jones, Morse, and Stillinger-Weber via OpenKIM. The most direct methodological precursor to Lupine\'s cross-potential analysis — but conducted within a single functional form at a time, not across families.',
    role: 'prior',
  },
  {
    year: '2024',
    cite: 'Deng, Choudhary et al.',
    venue: 'npj Comput. Mater. 10, 175',
    title: 'Systematic softening in universal machine-learning interatomic potentials',
    note: 'The empirical motivation for the audit layer. CHGNet, M3GNet, MACE-MP-0 systematically under-predict PES curvature at surfaces, defects, and ion-migration barriers — exactly the regime where low test MAE fails to predict reliability. The accuracy/reliability gap, named.',
    role: 'context',
  },
  {
    year: '2024',
    cite: 'Cheetham & Seshadri',
    venue: 'Chem. Mater. 36, 3490',
    title: 'Artificial Intelligence Driving Materials Discovery? — perspective on Scaling Deep Learning for Materials Discovery',
    note: '"Stable on the convex hull" is not "synthesizable." The post-GNoME critique that retired the "AlphaFold for materials" frame. We do not invoke that frame.',
    role: 'context',
  },
  {
    year: '2024',
    cite: 'Leeman et al.',
    venue: 'PRX Energy',
    title: 'Challenges in High-Throughput Inorganic Materials Prediction and Autonomous Synthesis',
    note: 'Re-examined A-Lab\'s claimed novel syntheses. Most did not hold; a smaller number were correctly identified but already known. The reason a trust layer for simulation does not pretend to solve the sim-to-lab gap.',
    role: 'context',
  },
  {
    year: '2025',
    cite: 'Wood et al. (FAIR Chemistry)',
    venue: 'arXiv:2506.23971',
    title: 'UMA: A Family of Universal Models for Atoms',
    note: 'Mixture of Linear Experts trained on ~500M unique 3D structures, conditioned on charge, spin, and DFT settings. Representative of the foundation-MLIP race the audit layer measures.',
    role: 'context',
  },
  {
    year: '2025',
    cite: 'Chiang et al.',
    venue: 'NeurIPS',
    title: 'MLIP Arena: Advancing Fairness and Transparency in Machine Learning Interatomic Potentials Evaluation',
    note: 'Built specifically because Matbench Discovery scores do not predict real-world simulation reliability. Adjacent benchmark to the audit; complements rather than competes.',
    role: 'context',
  },
  {
    year: '2025',
    cite: 'Wines & Choudhary',
    venue: 'ACS Materials Letters',
    title: 'CHIPS-FF: Evaluating Universal Machine Learning Force Fields for Material Properties',
    note: 'Same motivation as MLIP Arena, different cut. Both are in the audit corner of the field, both worth integrating with.',
    role: 'context',
  },
  {
    year: '2025',
    cite: 'Bordelon, Atanasov & Pehlevan',
    venue: 'ICLR',
    title: 'How feature learning can improve neural scaling laws',
    note: 'Establishes that targeting the dominant modes of the data-dependent kernel improves scaling exponents — a parameter-efficient retraining objective rather than brute-force training. The deep-learning analog of what cross-potential PCA names for MLIPs.',
    role: 'context',
  },
  {
    year: '2026',
    cite: 'Simon, Kunin, Atanasov et al.',
    venue: 'arXiv:2604.21691',
    title: 'There Will Be a Scientific Theory of Deep Learning',
    note: 'Names the emerging "learning mechanics": five lines of evidence (solvable settings, simplifying limits, simple empirical laws, hyperparameter disentanglement, universal phenomena) that point at a coherent science of how neural networks train. Our hyper-ribbon observation reads as one specific instance of items (iii) and (v) for a specific physical system. The paper makes the audit-as-physics framing explicit; we ship the applied case for atomistic ML.',
    role: 'context',
    pinned: true,
  },
  {
    year: '2026',
    cite: 'Welcing (Lupine)',
    venue: 'IMMI preprint',
    title: 'Cross-potential geometric error analysis for interatomic potentials',
    note: 'The narrow novelty: PCA-based error-fingerprinting across the full population of ≈900 published interatomic potentials, interpreted through the sloppy-models geometric framework. Cross-potential, not within-potential. Empirical, not a theorem. Read alongside Simon et al. (2026), it is also a low-rank retraining target — the same modes that name the failure are the modes that fix it.',
    role: 'lupine',
    pinned: true,
  },
]

const CONTRIBUTION_BULLETS = [
  {
    label: 'What Lupine contributes',
    body: 'PCA-based error-fingerprinting across the population of published interatomic potentials simultaneously, interpreted through the sloppy-models geometric framework. Read as applied learning mechanics, the same artifact is a low-rank retraining target — the cross-potential analog of the kernel-mode targeting that Bordelon, Atanasov & Pehlevan (2025) show improves scaling exponents.',
    accent: 'var(--primary)',
  },
  {
    label: 'What Lupine borrows',
    body: '"Hyper-ribbon" terminology and the geometric framework (Transtrum, Machta & Sethna 2011). The Bayesian-ensemble framing for IPs (Frederiksen et al. 2004). The OpenKIM infrastructure (Tadmor / Elliott / Sethna). The "five lines of evidence" framing for an empirical-laws program (Simon et al. 2026).',
    accent: 'var(--secondary)',
  },
  {
    label: 'What Lupine does not claim',
    body: 'A new theorem about manifold dimensionality. A replacement for DFT, LAMMPS, ASE, or KIM. A new universal MLIP. A discovery of synthesizable materials. A scaling-law exponent prediction (yet — see Open Direction 7 of Simon et al. 2026). The novelty is empirical and narrow on purpose.',
    accent: 'var(--accent-cyan)',
  },
]

function LineagePage() {
  return (
    <PageShell
      kicker="LINEAGE · 2003 → 2026"
      title="Two lineages, one wedge."
      subtitle="The audit-and-accelerator position rests on the intersection of two parallel programs: the sloppy-models materials lineage (Frederiksen → Transtrum → Sethna → Tadmor → Wen → Kurniawan → Deng) and the learning-mechanics program named by Simon et al. (2026). Both ask the same empirical question — when do high-dimensional learning systems collapse onto a low-dimensional ridge? — and both answer in the same vocabulary. We name the chains because the chains are what make a narrow contribution credible."
      maxWidth="5xl"
    >
      <div className="space-y-20">
        {/* === CONTRIBUTION FRAME === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">§0 — FRAME</span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Borrowed, contributed, refused</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Three columns, all on one page, in the same place a reviewer would expect them. The most defensible scientific position is also the most narrow: take the existing geometric framework, point it at the population of published potentials, and report what it says.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CONTRIBUTION_BULLETS.map((c, i) => (
              <div
                key={c.label}
              >
                <Card elevated className="h-full" style={{ borderTop: `2px solid ${c.accent}` }}>
                  <span className="mono-label block mb-3" style={{ color: c.accent }}>{c.label}</span>
                  <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{c.body}</p>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* === TIMELINE === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">§1 — TIMELINE</span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Twenty-two years, in order</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Each entry below is a specific paper with a specific role. Pinned entries are the two
              load-bearing citations: Transtrum/Machta/Sethna (2011) for the geometric framework,
              and the Lupine 2026 entry for the cross-potential extension that sits on top.
            </p>
          </div>
          <div className="relative">
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[var(--outline-variant)]" />
            <div className="space-y-6">
              {PRIORS.map((p, i) => (
                <div
                  key={`${p.year}-${p.cite}`}
                  className="flex gap-6 items-start"
                >
                  <div
                    className="relative z-10 flex-shrink-0 w-9 h-9 rounded-md border flex items-center justify-center"
                    style={{
                      borderColor: p.role === 'lupine' ? 'var(--primary)' : 'var(--outline-variant)',
                      background: 'var(--surface)',
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background:
                          p.role === 'lupine'
                            ? 'var(--primary)'
                            : p.role === 'prior'
                              ? 'var(--secondary)'
                              : 'var(--on-surface-variant)',
                      }}
                    />
                  </div>
                  <Card
                    elevated={p.pinned}
                    className="flex-1"
                    style={p.pinned ? { borderTop: '2px solid var(--primary)' } : undefined}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                      <span className="font-mono text-base text-[var(--on-surface)]">
                        {p.year} · {p.cite}
                      </span>
                      <span className="mono-label text-[10px] text-[var(--on-surface-variant)]">
                        {p.venue}
                      </span>
                      {p.pinned && (
                        <span className="mono-label text-[10px] px-2 py-0.5 border border-[var(--primary)]/40 text-[var(--primary)]">
                          LOAD-BEARING
                        </span>
                      )}
                    </div>
                    <h3 className="text-base mb-2 italic text-[var(--on-surface)]">{p.title}</h3>
                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{p.note}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === WHAT THIS ENABLES === */}
        <section>
          <div className="mb-8">
            <span className="mono-label text-[var(--secondary)] block mb-3">§2 — IMPLICATION</span>
            <h2 className="font-serif tracking-tight text-4xl lg:text-5xl mb-6 leading-[1.05] text-[var(--on-surface)]">Why the lineage matters operationally</h2>
            <p className="text-[var(--on-surface-variant)] leading-relaxed mb-6">
              Three operational consequences of standing on this chain.
            </p>
          </div>
          <Card elevated>
            <ul className="space-y-5 text-[var(--on-surface-variant)] leading-relaxed">
              <li>
                <strong className="text-[var(--on-surface)]">Reviews go faster.</strong> Senior
                reviewers (Sethna, Tadmor, Elliott, Cheetham, Persson on the materials side; Simon,
                Kunin, Atanasov, Pehlevan on the deep-learning side) recognize the framework on
                page one, because they wrote it. The discussion can move directly to the empirical
                contribution rather than relitigating the foundations.
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">The OpenKIM hooks are free.</strong>{' '}
                Wen et al. (2017) made the KIM-compliant fitting layer; Kurniawan et al. (2022)
                showed the FIM analysis runs cleanly through it. We use the same plumbing rather
                than reinventing it.
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">The narrow claim is defensible.</strong>{' '}
                "Cross-potential PCA error-fingerprinting" is a well-defined empirical procedure
                with a clear precedent literature on both sides — sloppy-models materials science
                and learning mechanics. It is much easier to defend than "we rediscovered the
                geometry of sloppy models" or "we built a foundation MLIP."
              </li>
              <li>
                <strong className="text-[var(--on-surface)]">The audit becomes an accelerator.</strong>{' '}
                Bordelon, Atanasov &amp; Pehlevan (2025) prove that targeting the dominant kernel
                modes yields better scaling exponents than brute-force training; Saxe et al. (2014)
                prove that linear networks acquire those modes in order of magnitude anyway. The
                hyper-ribbon Lupine measures is the cross-potential analog of that target. The
                lineage is what makes that analogy honest rather than a stretch.
              </li>
            </ul>
          </Card>
        </section>

        {/* === CTA === */}
        <section className="glass-panel p-8 text-center">
          <h3 className="text-2xl mb-4 font-serif tracking-tight">Read the preprint that cites this chain</h3>
          <p className="text-[var(--on-surface-variant)] mb-6 max-w-2xl mx-auto">
            The preprint reproduces the lineage in a full reference list at the end of section 6,
            with the exact venues, page numbers, and arXiv identifiers.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/research"
              className="px-6 py-3 bg-[var(--primary)] text-[var(--on-primary)] font-mono text-sm uppercase tracking-[0.08em] hover:opacity-90 transition-opacity no-underline"
            >
              Open the preprint
            </Link>
            <Link
              to="/proof"
              className="px-6 py-3 border border-[var(--primary)] text-[var(--primary)] font-mono text-sm uppercase tracking-[0.08em] hover:bg-[var(--primary)] hover:text-[var(--on-primary)] transition-colors no-underline"
            >
              Research defense
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
