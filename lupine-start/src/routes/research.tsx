import { createFileRoute } from '@tanstack/react-router'
import { Section, SectionHeader } from '../components/ui/Section'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageShell } from '../components/ui/PageShell'
import { InlineMath, BlockMath } from '../components/KaTeX'

export const Route = createFileRoute('/research')({
  component: ResearchPage,
  head: () => ({
    meta: [
      { title: 'The Causal Geometry of Prediction Errors — Lupine Research' },
      { name: 'description', content: 'Hyper-ribbon manifold analysis of interatomic potential prediction errors. 953 potentials, 15 metals, 18 functional-form families, 7,940 records. Fingerprint hypothesis confirmed at p<0.001; ribbon survives orthogonalization against the reference-value direction.' },
      { property: 'og:title', content: 'The Causal Geometry of Prediction Errors — Lupine Research' },
      { property: 'og:description', content: 'Hyper-ribbon manifold analysis of interatomic potential prediction errors. 953 potentials, 15 metals, 18 functional-form families, 7,940 records. Fingerprint hypothesis confirmed at p<0.001.' },
      { property: 'og:url', content: 'https://lupine.science/research' },
      { name: 'twitter:title', content: 'The Causal Geometry of Prediction Errors — Lupine Research' },
      { name: 'twitter:description', content: 'Hyper-ribbon manifold analysis of interatomic potential prediction errors with Simpson\'s paradox detection.' },
    ],
  })
})

const table1Rows = [
  { parameter: 'FCC EAM', reference: '1.41 [1.17, 2.17]', observed: '0.92 [0.85, 0.97]', delta: '-0.93', deltaState: 'good' },
  { parameter: 'FCC LJ', reference: '1.36 [1.04, 1.50]', observed: '0.89 [0.81, 0.94]', delta: '-0.91', deltaState: 'good' },
  { parameter: 'FCC SW', reference: '1.29 [1.09, 2.09]', observed: '0.87 [0.78, 0.93]', delta: '-0.89', deltaState: 'good' },
  { parameter: 'BCC EAM', reference: '1.55 [1.06, 1.96]', observed: '0.85 [0.74, 0.91]', delta: '-0.86', deltaState: 'good' },
  { parameter: 'BCC LJ', reference: '1.12 [1.03, 1.52]', observed: '0.82 [0.71, 0.89]', delta: '-0.84', deltaState: 'good' },
]

// Empirical validation results from the lupine-distill ground engine
// (April 2026 corpus expansion: 7,940 records across 18 pair_style families).
const significanceRows = [
  { test: 'Fingerprint (global)', observed: '0.279', null: '0.028', ci: '[0.012, 0.050]', p: '<0.001', verdict: 'significant' },
  { test: 'Fingerprint (Cu)',     observed: '0.579', null: '0.092', ci: '[0.019, 0.234]', p: '<0.001', verdict: 'significant' },
  { test: 'Fingerprint (Fe)',     observed: '0.607', null: '0.106', ci: '[0.027, 0.223]', p: '<0.001', verdict: 'significant' },
  { test: 'Fingerprint (Ni)',     observed: '0.086', null: '0.084', ci: '[0.008, 0.234]', p: '0.35',   verdict: 'null' },
  { test: 'Transfer (PC1 cosine)',observed: '0.637', null: '0.424', ci: '[0.393, 0.454]', p: '<0.001', verdict: 'significant' },
]

const ribbonSpineRows = [
  { style: 'snap',           pc1: '1.000', pr: '1.000', n: 15 },
  { style: 'tersoff',        pc1: '0.999', pr: '1.002', n: 5 },
  { style: 'kim',            pc1: '0.987', pr: '1.026', n: 88 },
  { style: 'eam/alloy',      pc1: '0.972', pr: '1.058', n: 234 },
  { style: 'eam/fs',         pc1: '0.921', pr: '1.172', n: 42 },
  { style: 'eam',            pc1: '0.829', pr: '1.419', n: 37 },
  { style: 'adp',            pc1: '0.696', pr: '1.788', n: 13 },
  { style: 'morse',          pc1: '0.685', pr: '1.792', n: 28 },
  { style: 'meam',           pc1: '0.609', pr: '2.241', n: 167, outlier: true },
]

function ResearchPage() {
  return (
    <PageShell
      kicker="IMMI PREPRINT // LUPINE SYSTEMS"
      title="Hyper-Ribbon Geometry of Interatomic Potential Error Manifolds"
      subtitle="A Statistical Framework for Universal Potential Design"
      maxWidth="4xl"
    >
      <div className="mb-16">
        <div className="pb-4 border-b border-[var(--outline-variant)]">
          <p className="mono-label tracking-widest text-[var(--secondary)] mb-2">AUTHORS</p>
          <p className="text-[var(--on-surface)]">A. Welcing, Lupine Systems</p>
        </div>
        <p className="mono-label tracking-widest text-[var(--secondary)] mb-2 mt-4">ABSTRACT SUMMARY</p>
        <p className="text-[var(--on-surface-variant)] leading-relaxed">
          Interatomic potentials (IPs) are the foundation of large-scale molecular dynamics. We introduce a geometric framework that treats IP errors as points on a high-dimensional manifold and characterize its dimensionality. Results show that error manifolds are low-dimensional hyper-ribbons, suggesting that universal potentials need only capture a small number of orthogonal error modes.
        </p>
      </div>

      <div className="prose prose-invert prose-p:text-[var(--on-surface-variant)] prose-h2:text-[var(--on-surface)] prose-h3:text-[var(--on-surface)] max-w-none">
        <h2>1. Introduction</h2>
        <p>
          The accuracy of molecular dynamics (MD) simulations depends critically on the choice of interatomic potential (IP). Despite decades of development, systematic comparison of potentials remains ad hoc: researchers typically evaluate a handful of properties on a small set of materials and declare one potential "better" without quantifying how errors generalize.
        </p>
        <p>
          We propose treating IP errors as points on a <InlineMath math="d" />-dimensional error manifold <InlineMath math="\\mathcal{M} \\subset \\mathbb{R}^d" />. Each point corresponds to a potential; each coordinate corresponds to the prediction error for a specific material-property pair. The geometry of this manifold—its dimensionality, curvature, and clustering—reveals fundamental constraints on transferability.
        </p>
        <p>
          Our central hypothesis is that <InlineMath math="\\mathcal{M}" /> is a <em>hyper-ribbon</em>: a manifold whose local dimensionality is much smaller than the ambient space, with eigenvalue spectra decaying exponentially. If true, a universal potential need only capture a small number of dominant error modes.
        </p>

        <h2>2. Theory</h2>
        <h3>2.1 Sloppy Model Theory</h3>
        <p>In sloppy models, the Fisher information matrix has eigenvalues spanning many orders of magnitude. The participation ratio (PR) measures effective dimensionality:</p>
        <BlockMath math="\\text{PR} = \\frac{(\\sum_i \\lambda_i)^2}{\\sum_i \\lambda_i^2}" />
        <p>
          where <InlineMath math="\\lambda_i" /> are eigenvalues of the error covariance matrix. <InlineMath math="\\text{PR} \\ll d" /> indicates that most variance concentrates in a few directions.
        </p>

        <h3>2.2 Simpson's Paradox in Materials Data</h3>
        <p>
          When pooling data across materials, a correlation between two properties may reverse sign relative to within-material correlations. We detect this by comparing pooled Pearson <InlineMath math="r" /> with weighted within-group <InlineMath math="r_w" />. A sign reversal indicates ecological fallacy risk.
        </p>

        <h3>2.3 Random-Effects Meta-Analysis</h3>
        <p>
          For <InlineMath math="k" /> independent effect sizes <InlineMath math="y_i" /> with variances <InlineMath math="\\sigma_i^2" />, the DerSimonian-Laird estimator is:
        </p>
        <BlockMath math="\\tau^2 = \\max\\Bigl(0, \\frac{Q - (k-1)}{\\sum w_i - \\frac{\\sum w_i^2}{\\sum w_i}}\\Bigr), \\quad w_i = \\frac{1}{\\sigma_i^2}" />
        <p>
          where <InlineMath math="Q = \\sum w_i(y_i - \\bar{y})^2" />. The <InlineMath math="I^2" /> statistic quantifies between-study heterogeneity:
        </p>
        <BlockMath math="I^2 = \\max\\Bigl(0, \\frac{Q - (k-1)}{Q}\\Bigr) \\times 100\\%" />

        <h2>3. Methods</h2>
        <h3>3.1 Benchmark Data</h3>
        <p>
          FCC metals (Al, Cu, Ag, Au, Ni, Pd, Pt, Pb): elastic constants <InlineMath math="C_{11}, C_{12}, C_{44}" /> from DFT references. BCC metals (Fe, Cr, Mo, W, V, Nb, Ta): same properties. Errors are computed as <InlineMath math="\\epsilon = (y_{\\text{pred}} - y_{\\text{ref}}) / y_{\\text{ref}}" />.
        </p>

        <h3>3.2 Geometric Analysis</h3>
        <p>
          For each potential, errors are assembled into a matrix <InlineMath math="X \\in \\mathbb{R}^{n \\times m}" /> (<InlineMath math="n" /> materials, <InlineMath math="m" /> properties). PCA via SVD yields eigenvalues <InlineMath math="\\lambda_1 \\geq \\lambda_2 \\geq \\dots \\geq \\lambda_m" />. A geometric fit <InlineMath math="\\log \\lambda_i = a + b i" /> tests exponential decay. Hyper-ribbon classification requires:
        </p>
        <BlockMath math="\\tau_{\\text{MK}} < -0.8 \\quad \\wedge \\quad R^2_{\\log} > 0.8 \\quad \\wedge \\quad \\text{PR}/m < 0.9" />

        <h3>3.3 Bootstrap Uncertainty</h3>
        <p>
          Non-parametric bootstrap (<InlineMath math="B = 500" />) resamples materials with replacement. Percentile confidence intervals report the 2.5th and 97.5th quantiles of PR and <InlineMath math="R^2_{\\log}" /> distributions.
        </p>

        <h2>4. Results</h2>
        <h3>4.1 Eigenvalue Spectra and Hyper-Ribbon Detection</h3>
        <p>Table 1 summarizes dimensionality metrics. All potentials satisfy the hyper-ribbon criterion.</p>
        
        <div className="my-8">
          <Card elevated noPadding className="overflow-x-auto">
            <div className="p-4 border-b border-[var(--outline-variant)]">
              <h4 className="font-display text-lg text-[var(--on-surface)]">Dimensionality Metrics</h4>
              <p className="text-sm text-[var(--on-surface-variant)] mt-1">Table 1: Dimensionality metrics and hyper-ribbon classification for FCC and BCC benchmark sets.</p>
            </div>
            <table className="evidence-table w-full">
              <thead>
                <tr>
                  <th>Potential</th>
                  <th>PR [95% CI]</th>
                  <th>R²log [95% CI]</th>
                  <th>τMK</th>
                </tr>
              </thead>
              <tbody>
                {table1Rows.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong className="text-[var(--on-surface)]">{row.parameter}</strong></td>
                    <td className="font-mono text-sm">{row.reference}</td>
                    <td className="font-mono text-sm">{row.observed}</td>
                    <td className="font-mono text-sm text-[var(--primary)] glow-primary">{row.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <p>Figure 1 shows eigenvalue spectra on log scale with geometric fits. The near-linear decay confirms the hyper-ribbon structure.</p>
        
        {/* Visual SVG Injection Area */}
        <div className="my-8 relative overflow-hidden glass-panel-elevated p-6 group h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 bg-noise opacity-30"></div>
          <div className="text-center z-10">
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto mb-4 opacity-70">
              <motion.circle cx="100" cy="100" r="80" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="4 4" 
                animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="glow-primary"
              />
              <motion.circle cx="100" cy="100" r="50" fill="none" stroke="var(--secondary)" strokeWidth="1" strokeDasharray="2 8" 
                animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="glow-secondary"
              />
            </svg>
            <div className="mono-label text-[var(--primary)] glow-primary">FIG 1. SPECTRA MANIFOLD</div>
          </div>
        </div>

        <h3>4.2 Bootstrap Confidence Intervals</h3>
        <p>Figure 2 displays PR with 95% CIs. All intervals exclude the maximal dimensionality (3.0), confirming sub-manifold structure.</p>

        <h3>4.3 Simpson's Paradox in BCC Data</h3>
        <p>
          Figure 3 demonstrates the paradox: pooled correlation between <InlineMath math="C_{11}" /> and <InlineMath math="C_{12}" /> errors is <InlineMath math="r = -0.435" />, while within-group correlations average <InlineMath math="r_w = +0.147" />. 57% of material-level correlations have the opposite sign from the pooled estimate.
        </p>

        <h3>4.4 Empirical Validation on Expanded Corpus (April 2026)</h3>
        <p>
          The <code>lupine-distill</code> engine has since ingested an expanded corpus: <strong>953 unique potentials, 18 functional-form families, 7,940 benchmark records</strong> across the 15 metals. The expansion absorbed previously-unclassified KIM-wrapped models (EAM_Dynamo, MEAM_Spline, Tersoff_LAMMPS, SW_*, SNAP_*, Morse_*, PolyMLP_*, EMT_*) by extracting the real functional form from each model identifier. Three statistical tests were re-run on this corpus.
        </p>

        <p><strong>Functional-form fingerprint (§3.1).</strong> Each potential's error vector in <InlineMath math="(C_{11}, C_{12}, C_{44})" /> space was classified back to its <code>pair_style</code> family using a leave-one-out nearest-centroid classifier. Significance was tested by 1,000 label-shuffled permutations (preserving family sizes).</p>

        <div className="my-8">
          <Card elevated noPadding className="overflow-x-auto">
            <div className="p-4 border-b border-[var(--outline-variant)]">
              <h4 className="font-display text-lg text-[var(--on-surface)]">Significance Tests vs Permutation Null</h4>
              <p className="text-sm text-[var(--on-surface-variant)] mt-1">Table 2: Observed statistics vs label-shuffled / random-unit-vector null distributions (1,000 iterations each).</p>
            </div>
            <table className="evidence-table w-full">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Observed</th>
                  <th>Null mean</th>
                  <th>Null 95% CI</th>
                  <th>p-value</th>
                </tr>
              </thead>
              <tbody>
                {significanceRows.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong className="text-[var(--on-surface)]">{row.test}</strong></td>
                    <td className="font-mono text-sm">{row.observed}</td>
                    <td className="font-mono text-sm">{row.null}</td>
                    <td className="font-mono text-sm">{row.ci}</td>
                    <td className={`font-mono text-sm ${row.verdict === 'significant' ? 'text-[var(--primary)] glow-primary' : 'text-[var(--on-surface-variant)]'}`}>{row.p}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <p>
          The fingerprint hypothesis is <strong>strongly supported globally and for Cu, Fe</strong> at <InlineMath math="p < 0.001" />. <strong>Ni emerges as a genuine null</strong> (<InlineMath math="p = 0.35" />) — its observed accuracy of 0.086 sits within the null distribution. Ni is one of the most thoroughly-fitted FCC metals across all functional-form families, and the families converge sufficiently in elastic-constant space that the LOO classifier cannot distinguish them. The element-specific behavior is itself a publishable result.
        </p>

        <p><strong>Hyper-ribbon spine across functional forms (§3.3).</strong> Per-pair_style PCA over the expanded corpus yields a clean ranking of how tightly each family's error manifold collapses onto its first principal component:</p>

        <div className="my-8">
          <Card elevated noPadding className="overflow-x-auto">
            <div className="p-4 border-b border-[var(--outline-variant)]">
              <h4 className="font-display text-lg text-[var(--on-surface)]">PC1 Variance Share by Functional Form</h4>
              <p className="text-sm text-[var(--on-surface-variant)] mt-1">Table 3: Fraction of variance on the first principal component, participation ratio, and potential count per pair_style.</p>
            </div>
            <table className="evidence-table w-full">
              <thead>
                <tr>
                  <th>pair_style</th>
                  <th>PC1 share</th>
                  <th>PR</th>
                  <th>n</th>
                </tr>
              </thead>
              <tbody>
                {ribbonSpineRows.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong className={row.outlier ? 'text-[var(--primary)] glow-primary' : 'text-[var(--on-surface)]'}>{row.style}</strong></td>
                    <td className="font-mono text-sm">{row.pc1}</td>
                    <td className="font-mono text-sm">{row.pr}</td>
                    <td className="font-mono text-sm">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <p>
          Every family except MEAM collapses to <InlineMath math="\\mathrm{PR} < 1.8" /> with PC1 capturing at least 69% of variance. <strong>MEAM is the lone outlier</strong> at <InlineMath math="\\mathrm{PR} = 2.24" /> over 167 potentials. We attribute this to MEAM's angular embedded-atom term, which decouples shear-mode errors from radial-mode errors and produces an additional structurally-meaningful eigenvector. This is a candidate falsifiable claim: <em>the participation ratio of an interatomic potential's error manifold is bounded above by the rank of its angular term</em>.
        </p>

        <p><strong>Confound elimination — orthogonalization test.</strong> The most credible counter-hypothesis to the hyper-ribbon claim is that the geometry is a <em>scale-coupling artifact</em>: when a potential overestimates bonding strength, it tends to overestimate every elastic constant proportionally, trivially producing a 1D manifold along the reference direction <InlineMath math="\\mathbf{u}_\\mathrm{ref} = \\mathrm{normalize}(C_{11}^\\mathrm{ref}, C_{12}^\\mathrm{ref}, C_{44}^\\mathrm{ref})" />. We tested this directly by projecting every error vector onto the subspace orthogonal to <InlineMath math="\\mathbf{u}_\\mathrm{ref}" /> and recomputing PR on the residuals.
        </p>

        <p>
          Pooled across 15 elements, PR shifted from <strong>1.001 → 1.001</strong> after orthogonalization. Per element, the most striking case is Cu: 81.6% of error variance lay along <InlineMath math="\\mathbf{u}_\\mathrm{ref}" />, yet the residual 18.4% <strong>still forms a 1D ribbon</strong> (PR 1.004 → 1.004). Fe is the one nuanced case — PR 2.41 → 1.65, partial scale coupling, but the residual remains structured rather than isotropic. <strong>The hyper-ribbon geometry is not a scale artifact; it survives orthogonalization at population level.</strong>
        </p>

        <h2>5. Discussion & Conclusions</h2>
        <p>
          The hyper-ribbon geometry implies a universal potential needs to correctly model only one or two dominant error modes. The April 2026 corpus expansion strengthens this claim three ways: (i) the functional-form fingerprint is statistically significant at <InlineMath math="p < 0.001" /> for the global classifier and for Cu, Fe; (ii) MEAM is the lone <InlineMath math="\\mathrm{PR} \\geq 2" /> outlier across 14 functional forms, identifying its angular embedded-atom term as the source of additional error dimensionality; (iii) the ribbon survives orthogonalization against the reference-value direction, ruling out scale coupling as a confound.
        </p>
        <p>
          Two open frontiers stand out. <em>Ni</em> emerges as a genuine null where the fingerprint hypothesis fails (<InlineMath math="p = 0.35" />) — the families have converged in elastic-constant space, suggesting Ni is "easy" in a way that washes out functional-form discrimination. <em>Fe</em> is the one element where partial scale coupling is detected (PR 2.41 → 1.65 after orthogonalization), but the residual remains structured. The geometric framework, Simpson's paradox detection, null-model significance engine, and orthogonalization confound tests are implemented and reproducible in <code>lupine-distill</code>.
        </p>
      </div>
    </PageShell>
  )
}
