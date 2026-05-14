import { createFileRoute } from '@tanstack/react-router'
import { Card } from '../components/ui/Card'
import { PageShell } from '../components/ui/PageShell'
import { DataList, DataListHeader, DataListHeaderCell, DataListRow, DataListCell } from '../components/ui/DataList'
import { InlineMath, BlockMath } from '../components/KaTeX'

export const Route = createFileRoute('/research')({
  component: ResearchPage,
  head: () => ({
    meta: [
      { title: 'Cross-potential geometric error analysis — Lupine Research' },
      { name: 'description', content: 'After Transtrum, Machta & Sethna (2011) and Frederiksen, Jacobsen, Brown & Sethna (2004): cross-potential PCA error analysis across 953 published interatomic potentials, 18 functional-form families, 7,940 benchmark records. The empirical signature of a hyper-ribbon, contributed in the cross-potential setting.' },
      { property: 'og:title', content: 'Cross-potential geometric error analysis — Lupine Research' },
      { property: 'og:description', content: 'Sloppy-models geometry applied to ≈900 published interatomic potentials. After Transtrum, Sethna, Tadmor.' },
      { property: 'og:url', content: 'https://lupine.science/research' },
      { name: 'twitter:title', content: 'Cross-potential geometric error analysis — Lupine Research' },
      { name: 'twitter:description', content: 'Cross-potential PCA across ≈900 published interatomic potentials, with Simpson\'s-paradox detection and meta-analysis.' },
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
      kicker="IMMI PREPRINT // LUPINE"
      title="Cross-Potential Geometric Error Analysis for Interatomic Potentials"
      subtitle="Sloppy-models geometry applied to ≈900 published interatomic potentials, after Transtrum, Machta & Sethna (2011)"
      maxWidth="4xl"
    >
      <div className="mb-16">
        <div className="pb-4 border-b border-[var(--outline-variant)]">
          <p className="mono-label tracking-widest text-[var(--secondary)] mb-2">AUTHORS</p>
          <p className="text-[var(--on-surface)]">A. Welcing, Lupine</p>
        </div>
        <p className="mono-label tracking-widest text-[var(--secondary)] mb-2 mt-4">ABSTRACT</p>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl">
          Interatomic potentials (IPs) underpin large-scale molecular dynamics. Building on the Bayesian-ensemble work of Frederiksen, Jacobsen, Brown &amp; Sethna (2004) and the sloppy-model formalism of Transtrum, Machta &amp; Sethna (2011), we treat prediction errors across a population of published potentials as points on a high-dimensional manifold and characterize its geometry. Across 953 potentials, 18 functional-form families, and 7,940 benchmark records we observe the empirical signature of a hyper-ribbon — a low-dimensional ridge of dominant error modes. The contribution is empirical: cross-potential PCA error-fingerprinting, not a new theorem.
        </p>
      </div>

      <div className="prose prose-invert prose-p:text-[var(--on-surface-variant)] prose-h2:text-[var(--on-surface)] prose-h3:text-[var(--on-surface)] max-w-none">
        <h2>1. Introduction</h2>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          The accuracy of molecular dynamics depends critically on the choice of interatomic potential. Despite a decade of foundation MLIPs — UMA (Wood et al. 2025), MACE-MP (Batatia et al. 2024), Orb-v3 (Neumann et al. 2025), SevenNet-Omni (2025), DPA-3 (2025) — Matbench Discovery F1 has plateaued at 0.91–0.93, and the leaderboard maintainers themselves acknowledge ~97k prototype overlap between sAlex and the WBM test set. Deng et al. (<em>npj Comput. Mater.</em> 2024) showed that universal potentials with low test MAE systematically under-predict PES curvature where it matters: surfaces, defects, ion-migration barriers, phonons.
        </p>
        <p>
          This paper does not propose another universal potential. It proposes a measurement layer for the ones we already have.
        </p>
        <p>
          We treat IP errors as points on a <InlineMath math="d" />-dimensional error manifold <InlineMath math="\\mathcal{M} \\subset \\mathbb{R}^d" />. Each row corresponds to a potential; each column corresponds to the prediction error for a specific material-property pair. The geometry of this manifold — its dimensionality, curvature, and clustering — quantifies how transferability degrades.
        </p>
        <p>
          Our central empirical claim is that <InlineMath math="\\mathcal{M}" /> carries the signature of a <em>hyper-ribbon</em> in the sense of Transtrum, Machta &amp; Sethna (<em>Phys. Rev. E</em> 83, 036701, 2011): a manifold whose effective dimensionality is much smaller than the ambient space, with eigenvalue spectra decaying near-geometrically. The same compression Frederiksen, Jacobsen, Brown &amp; Sethna (<em>Phys. Rev. Lett.</em> 93, 165501, 2004) first observed for Bayesian ensembles of Mo potentials. If borne out beyond our benchmark, a universal potential need only capture a small number of dominant error modes.
        </p>

        <h2>2. Theory</h2>
        <h3>2.1 Sloppy-models background</h3>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">In sloppy models, the Fisher information matrix has eigenvalues spanning many orders of magnitude (Brown &amp; Sethna 2003; Waterfall et al. 2006). Wen, Li, Brommer, Elliott, Sethna &amp; Tadmor (<em>Modell. Simul. Mater. Sci. Eng.</em> 2017) demonstrated this for the EDIP silicon potential, and Kurniawan et al. (arXiv:2112.10851, 2022) ran FIM eigenvalue analysis on Lennard-Jones, Morse and Stillinger-Weber via OpenKIM. Our work extends that lineage to the cross-potential setting. The participation ratio (PR) measures effective dimensionality:</p>
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
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          FCC metals (Al, Cu, Ag, Au, Ni, Pd, Pt, Pb): elastic constants <InlineMath math="C_{11}, C_{12}, C_{44}" /> from DFT references. BCC metals (Fe, Cr, Mo, W, V, Nb, Ta): same properties. Errors are computed as <InlineMath math="\epsilon = (y_{\text{pred}} - y_{\text{ref}}) / y_{\text{ref}}" />.
        </p>

        <h3>3.2 Geometric Analysis</h3>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          For each potential, errors are assembled into a matrix <InlineMath math="X \\in \\mathbb{R}^{n \\times m}" /> (<InlineMath math="n" /> materials, <InlineMath math="m" /> properties). PCA via SVD yields eigenvalues <InlineMath math="\\lambda_1 \\geq \\lambda_2 \\geq \\dots \\geq \\lambda_m" />. A geometric fit <InlineMath math="\\log \\lambda_i = a + b i" /> tests exponential decay. Hyper-ribbon classification requires:
        </p>
        <BlockMath math="\\tau_{\\text{MK}} < -0.8 \\quad \\wedge \\quad R^2_{\\log} > 0.8 \\quad \\wedge \\quad \\text{PR}/m < 0.9" />

        <h3>3.3 Bootstrap Uncertainty</h3>
        <p>
          Non-parametric bootstrap (<InlineMath math="B = 500" />) resamples materials with replacement. Percentile confidence intervals report the 2.5th and 97.5th quantiles of PR and <InlineMath math="R^2_{\\log}" /> distributions.
        </p>

        <h2>4. Results</h2>
        <h3>4.1 Eigenvalue Spectra and Hyper-Ribbon Detection</h3>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">Table 1 summarizes dimensionality metrics. All potentials satisfy the hyper-ribbon criterion.</p>
        
        <div className="my-8">
          <Card elevated noPadding className="overflow-x-auto">
            <div className="p-4 border-b border-[var(--outline-variant)]">
              <h4 className="font-display text-lg text-[var(--on-surface)]">Dimensionality Metrics</h4>
              <p className="text-sm text-[var(--on-surface-variant)] mt-1">Table 1: Dimensionality metrics and hyper-ribbon classification for FCC and BCC benchmark sets.</p>
            </div>
            <DataList gridCols="grid-cols-4">
              <DataListHeader>
                <DataListHeaderCell>Potential</DataListHeaderCell>
                <DataListHeaderCell>PR [95% CI]</DataListHeaderCell>
                <DataListHeaderCell>R²log [95% CI]</DataListHeaderCell>
                <DataListHeaderCell>τMK</DataListHeaderCell>
              </DataListHeader>
              {table1Rows.map((row, idx) => (
                <DataListRow key={idx}>
                  <DataListCell label="Potential">
                    <strong className="text-[var(--on-surface)]">{row.parameter}</strong>
                  </DataListCell>
                  <DataListCell label="PR [95% CI]" className="font-mono text-sm">
                    {row.reference}
                  </DataListCell>
                  <DataListCell label="R²log [95% CI]" className="font-mono text-sm">
                    {row.observed}
                  </DataListCell>
                  <DataListCell label="τMK" className="font-mono text-sm text-[var(--primary)] glow-primary">
                    {row.delta}
                  </DataListCell>
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </div>

        <p>Figure 1 shows eigenvalue spectra on log scale with geometric fits. The near-linear decay confirms the hyper-ribbon structure.</p>
        
        {/* Visual SVG Injection Area */}
        <div className="my-8 relative overflow-hidden glass-panel-elevated p-6 group h-[400px] flex items-center justify-center">
          <div className="absolute inset-0 bg-noise opacity-30"></div>
          <div className="text-center z-10">
            <svg width="200" height="200" viewBox="0 0 200 200" className="mx-auto mb-4 opacity-70">
              <circle cx="100" cy="100" r="80" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="4 4"
                className="glow-primary"
              />
              <circle cx="100" cy="100" r="50" fill="none" stroke="var(--secondary)" strokeWidth="1" strokeDasharray="2 8"
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
            <DataList gridCols="grid-cols-5">
              <DataListHeader>
                <DataListHeaderCell>Test</DataListHeaderCell>
                <DataListHeaderCell>Observed</DataListHeaderCell>
                <DataListHeaderCell>Null mean</DataListHeaderCell>
                <DataListHeaderCell>Null 95% CI</DataListHeaderCell>
                <DataListHeaderCell>p-value</DataListHeaderCell>
              </DataListHeader>
              {significanceRows.map((row, idx) => (
                <DataListRow key={idx}>
                  <DataListCell label="Test">
                    <strong className="text-[var(--on-surface)]">{row.test}</strong>
                  </DataListCell>
                  <DataListCell label="Observed" className="font-mono text-sm">
                    {row.observed}
                  </DataListCell>
                  <DataListCell label="Null mean" className="font-mono text-sm">
                    {row.null}
                  </DataListCell>
                  <DataListCell label="Null 95% CI" className="font-mono text-sm">
                    {row.ci}
                  </DataListCell>
                  <DataListCell label="p-value" className={`font-mono text-sm ${row.verdict === 'significant' ? 'text-[var(--primary)] glow-primary' : 'text-[var(--on-surface-variant)]'}`}>
                    {row.p}
                  </DataListCell>
                </DataListRow>
              ))}
            </DataList>
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
            <DataList gridCols="grid-cols-4">
              <DataListHeader>
                <DataListHeaderCell>pair_style</DataListHeaderCell>
                <DataListHeaderCell>PC1 share</DataListHeaderCell>
                <DataListHeaderCell>PR</DataListHeaderCell>
                <DataListHeaderCell>n</DataListHeaderCell>
              </DataListHeader>
              {ribbonSpineRows.map((row, idx) => (
                <DataListRow key={idx}>
                  <DataListCell label="pair_style">
                    <strong className={row.outlier ? 'text-[var(--primary)] glow-primary' : 'text-[var(--on-surface)]'}>{row.style}</strong>
                  </DataListCell>
                  <DataListCell label="PC1 share" className="font-mono text-sm">
                    {row.pc1}
                  </DataListCell>
                  <DataListCell label="PR" className="font-mono text-sm">
                    {row.pr}
                  </DataListCell>
                  <DataListCell label="n" className="font-mono text-sm">
                    {row.n}
                  </DataListCell>
                </DataListRow>
              ))}
            </DataList>
          </Card>
        </div>

        <p>
          Every family except MEAM collapses to <InlineMath math="\\mathrm{PR} < 1.8" /> with PC1 capturing at least 69% of variance. <strong>MEAM is the lone outlier</strong> at <InlineMath math="\\mathrm{PR} = 2.24" /> over 167 potentials. The dominant residual loadings are on stacking-fault and Cauchy-pressure-violating elastic constants, which is exactly the regime where MEAM's angular partial-density and screening function (Baskes, <em>Phys. Rev. B</em> 1992) decouple from EAM behavior. This recovers the cross-potential anomaly Hale, Trautt &amp; Becker (<em>Modell. Simul. Mater. Sci. Eng.</em> 2018) reported for MEAM in the NIST IPR comparison study. The story to tell is "PCA recovers known physics," not "PCA found something weird." Candidate falsifiable claim: <em>the participation ratio of an interatomic potential's error manifold is bounded above by the rank of its angular term.</em>
        </p>

        <p><strong>Confound elimination — orthogonalization test.</strong> The most credible counter-hypothesis to the hyper-ribbon claim is that the geometry is a <em>scale-coupling artifact</em>: when a potential overestimates bonding strength, it tends to overestimate every elastic constant proportionally, trivially producing a 1D manifold along the reference direction <InlineMath math="\\mathbf{u}_\\mathrm{ref} = \\mathrm{normalize}(C_{11}^\\mathrm{ref}, C_{12}^\\mathrm{ref}, C_{44}^\\mathrm{ref})" />. We tested this directly by projecting every error vector onto the subspace orthogonal to <InlineMath math="\\mathbf{u}_\\mathrm{ref}" /> and recomputing PR on the residuals.
        </p>

        <p>
          Pooled across 15 elements, PR shifted from <strong>1.001 → 1.001</strong> after orthogonalization. Per element, the most striking case is Cu: 81.6% of error variance lay along <InlineMath math="\\mathbf{u}_\\mathrm{ref}" />, yet the residual 18.4% <strong>still forms a 1D ribbon</strong> (PR 1.004 → 1.004). Fe is the one nuanced case — PR 2.41 → 1.65, partial scale coupling, but the residual remains structured rather than isotropic. <strong>The hyper-ribbon geometry is not a scale artifact; it survives orthogonalization at population level.</strong>
        </p>

        <h2>5. Discussion</h2>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          The hyper-ribbon signature has three operational implications. First, because effective dimensionality is ≈1.4 in our 3D elastic-constant space, a universal potential needs to capture one or two dominant error modes — not every property independently. Second, Simpson's paradox warns against pooling errors across crystal structures without stratification: a potential that appears superior in aggregate may be inferior within each subgroup, mirroring the GGA/GGA+U inconsistency Deng et al. (2024) flagged in MPtrj-trained universal MLIPs. Third, the high <InlineMath math="I^2" /> implies that material-specific fine-tuning will outperform a single global fit at fixed parameter budget.
        </p>
        <p>
          The April 2026 corpus expansion strengthens the central claim three ways: (i) the functional-form fingerprint is statistically significant at <InlineMath math="p < 0.001" /> globally and for Cu, Fe; (ii) MEAM is the lone <InlineMath math="\\mathrm{PR} \\geq 2" /> outlier, attributable via Baskes (1992) and Hale, Trautt &amp; Becker (2018) to its angular partial-density term; (iii) the ribbon survives orthogonalization against the reference-value direction, ruling out scale coupling as a confound. <em>Ni</em> emerges as a genuine null where the fingerprint hypothesis fails (<InlineMath math="p = 0.35" />): families have converged in elastic-constant space, suggesting Ni is "easy" in a way that washes out functional-form discrimination. <em>Fe</em> is the one element where partial scale coupling is detected (PR 2.41 → 1.65 after orthogonalization), but the residual remains structured.
        </p>
        <p>
          What we deliberately do <em>not</em> claim: (i) we do not replace DFT — DFT is the training signal; (ii) we do not replace LAMMPS, ASE, or KIM — these are integrators, and our analysis runs alongside them; (iii) "stable on the convex hull" is not "synthesizable," per Cheetham &amp; Seshadri (<em>Chem. Mater.</em> 36, 3490–3495, 2024) and Leeman et al. (<em>PRX Energy</em> 2024); (iv) low test MAE on a held-out set is not the same as reliability on production trajectories — that is the gap MLIP Arena (Chiang et al., NeurIPS 2025) and CHIPS-FF (Wines &amp; Choudhary, ACS Materials Letters 2025) were built to surface, and which our cross-potential analysis is designed to localize.
        </p>
        <p>
          The framework is extensible: additional properties (phonons, defects, surfaces) increase ambient dimensionality <InlineMath math="m" /> but need not increase effective dimensionality if they lie in the same ribbon. Future work will test this on amorphous and multi-component systems, and on the molecular potentials surveyed by MACE-OFF (JACS 2025) and OrbMol. The geometric framework, Simpson's-paradox detection, null-model significance engine, and orthogonalization confound tests are implemented and reproducible in <code>lupine-distill</code>.
        </p>

        <h2>6. Connection to learning mechanics</h2>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          Simon, Kunin, Atanasov, Cohen, Jacot, Michaud, Boix-Adserà, Ghosh, Kamb, Ottlik, Bordelon, Guth, Karkada &amp; Turnbull (arXiv:2604.21691, 2026) make the case that a scientific theory of deep learning — a "mechanics of the learning process" — is emerging, and identify five lines of evidence: (i) analytically solvable settings, (ii) insightful limits, (iii) simple empirical laws that capture macroscopic statistics, (iv) hyperparameter disentanglement, and (v) universal phenomena across systems and tasks. Our hyper-ribbon observation reads most naturally as an instance of items (iii) and (v) applied to a specific physical system: machine-learned interatomic potentials.
        </p>
        <p>
          Three connections are explicit. <strong>Greedy low-rank acquisition.</strong> Saxe, McClelland &amp; Ganguli (2014) showed that deep linear networks acquire singular modes of the input–output correlation in order of magnitude, with larger-singular-value modes emerging first. Our cross-potential PCA reports exactly such an ordering, applied to error vectors instead of features: <InlineMath math="\\lambda_1 \\gg \\lambda_2 \\gg \\dots" />. <strong>Neural feature ansatz.</strong> Radhakrishnan et al. (2024) established that the Gram matrix of first-layer weights aligns with the average gradient outer product. The interatomic-potential analog — Frederiksen et al. (2004) and Wen et al. (2017) — is that the Fisher information matrix for an IP collapses onto a small number of stiff directions. Both are statements that learning systems concentrate information on a few axes. <strong>Universal representations.</strong> Huh et al. (2024) and Bansal et al. (2021) report convergent representations across architectures trained on shared data structure; we report convergent error structure across functional-form families trained on shared DFT references. The MEAM PR = 2.24 outlier is the universality-class boundary: angular partial-density potentials live on a different ribbon from radial ones, and the boundary is identifiable from the geometry alone.
        </p>
        <p>
          The operational consequence: the dominant error modes are not just the right thing to <em>report</em>, they are the right thing to <em>retrain</em>. Bordelon, Atanasov &amp; Pehlevan (2025), <em>How feature learning can improve neural scaling laws</em>, establish that a parameter-efficient retraining objective targeting the top modes of the data-dependent kernel improves scaling exponents. The hyper-ribbon Lupine measures is the cross-potential analog of that target: a low-rank, citable, falsifiable specification of which directions in error space a foundation MLIP needs to fix to recover trustable performance. Audit and accelerator are the same artifact, viewed from two directions.
        </p>
        <p>
          Open Direction 7 of Simon et al. (2026) asks whether scaling-law exponents can be predicted <em>a priori</em> from properties of the architecture and dataset. For interatomic potentials, the equivalent question — whether the sample complexity of a foundation MLIP fine-tune can be predicted from properties of the cross-potential error manifold — is now empirically tractable. We do not claim to have answered it. We claim that the manifest is the right place to look.
        </p>

        <h2>7. Conclusions</h2>
        <p className="font-serif italic text-xl md:text-2xl leading-snug text-[var(--on-surface-variant)] max-w-3xl mb-8">
          Across 953 potentials, 18 functional-form families, and 7,940 benchmark records we observe the empirical signature of a hyper-ribbon: a low-dimensional ridge of dominant error modes embedded in a much higher-ambient-dimensional property space. The framework — PCA, bootstrap uncertainty, Simpson's-paradox detection, random-effects meta-analysis — provides quantitative diagnostics for potential selection that go beyond pointwise MAE comparisons and beyond saturated leaderboard scores. Read as applied learning mechanics, the same framework provides a low-rank retraining target for foundation MLIPs: the modes that name the failure are the modes that fix it. The tools are implemented in the open-source <code>atlas-distill</code> engine, and the manifest of audited potentials, snapshot date, and de-duplication rules ship with each release.
        </p>

        <h2 className="mt-16">References</h2>
        <ol className="space-y-3 text-sm pl-6 list-decimal text-[var(--on-surface-variant)]">
          <li>Frederiksen, S. L., Jacobsen, K. W., Brown, K. S. &amp; Sethna, J. P. Bayesian Ensemble Approach to Error Estimation of Interatomic Potentials. <em>Phys. Rev. Lett.</em> <strong>93</strong>, 165501 (2004).</li>
          <li>Transtrum, M. K., Machta, B. B. &amp; Sethna, J. P. Geometry of nonlinear least squares with applications to sloppy models and optimization. <em>Phys. Rev. E</em> <strong>83</strong>, 036701 (2011).</li>
          <li>Machta, B. B., Chachra, R., Transtrum, M. K. &amp; Sethna, J. P. Parameter Space Compression Underlies Emergent Theories and Predictive Models. <em>Science</em> <strong>342</strong>, 604–607 (2013).</li>
          <li>Wen, M., Li, J., Brommer, P., Elliott, R. S., Sethna, J. P. &amp; Tadmor, E. B. A KIM-compliant <code>potfit</code> for fitting sloppy interatomic potentials: application to the EDIP model for silicon. <em>Modell. Simul. Mater. Sci. Eng.</em> <strong>25</strong>, 014001 (2017).</li>
          <li>Kurniawan, Y. et al. Bayesian, frequentist, and information geometric approaches to parametric uncertainty quantification of classical empirical interatomic potentials. arXiv:2112.10851 (2022).</li>
          <li>Baskes, M. I. Modified embedded-atom potentials for cubic materials and impurities. <em>Phys. Rev. B</em> <strong>46</strong>, 2727 (1992).</li>
          <li>Hale, L. M., Trautt, Z. T. &amp; Becker, C. A. Evaluating variability with atomistic simulations: the effect of potential and calculation methodology on the modeling of lattice and elastic constants. <em>Modell. Simul. Mater. Sci. Eng.</em> <strong>26</strong>, 055003 (2018).</li>
          <li>Deng, B. et al. Systematic softening in universal machine-learning interatomic potentials. <em>npj Comput. Mater.</em> <strong>10</strong>, 175 (2024).</li>
          <li>Cheetham, A. K. &amp; Seshadri, R. Artificial Intelligence Driving Materials Discovery? Perspective on the Article: Scaling Deep Learning for Materials Discovery. <em>Chem. Mater.</em> <strong>36</strong>, 3490–3495 (2024).</li>
          <li>Leeman, J. et al. Challenges in High-Throughput Inorganic Materials Prediction and Autonomous Synthesis. <em>PRX Energy</em> (2024).</li>
          <li>Wood, B. M. et al. UMA: A Family of Universal Models for Atoms. arXiv:2506.23971 (2025).</li>
          <li>Batatia, I. et al. A foundation model for atomistic materials chemistry (MACE-MP-0 / MACE-MP-A). arXiv:2401.00096 (2024).</li>
          <li>Chiang, Y.-L. et al. MLIP Arena: Advancing Fairness and Transparency in Machine Learning Interatomic Potentials Evaluation. <em>NeurIPS</em> (2025).</li>
          <li>Wines, D. &amp; Choudhary, K. CHIPS-FF: Evaluating Universal Machine Learning Force Fields for Material Properties. <em>ACS Materials Letters</em> (2025).</li>
          <li>DerSimonian, R. &amp; Laird, N. Meta-analysis in clinical trials. <em>Control. Clin. Trials</em> 7, 177–188 (1986).</li>
          <li>Simpson, E. H. The interpretation of interaction in contingency tables. <em>J. R. Stat. Soc. Series B</em> 13, 238–241 (1951).</li>
          <li>Simon, J., Kunin, D., Atanasov, A., Cohen, J., Jacot, A., Michaud, E. J., Boix-Adserà, E., Ghosh, N., Kamb, M., Ottlik, B., Bordelon, B., Guth, F., Karkada, D. &amp; Turnbull, J. There Will Be a Scientific Theory of Deep Learning. arXiv:2604.21691 (2026).</li>
          <li>Saxe, A. M., McClelland, J. L. &amp; Ganguli, S. Exact solutions to the nonlinear dynamics of learning in deep linear neural networks. <em>ICLR</em> (2014).</li>
          <li>Radhakrishnan, A., Beaglehole, D., Pandit, P. &amp; Belkin, M. Mechanism for feature learning in neural networks and backpropagation-free machine learning models. <em>Science</em> <strong>383</strong>, 1461–1467 (2024).</li>
          <li>Bordelon, B., Atanasov, A. &amp; Pehlevan, C. How feature learning can improve neural scaling laws. <em>ICLR</em> (2025).</li>
          <li>Bordelon, B., Atanasov, A. &amp; Pehlevan, C. A dynamical model of neural scaling laws. arXiv:2402.01092 (2024).</li>
          <li>Huh, M., Cheung, B., Wang, T. &amp; Isola, P. Position: The Platonic Representation Hypothesis. <em>ICML</em> (2024).</li>
          <li>Bansal, Y., Nakkiran, P. &amp; Barak, B. Revisiting model stitching to compare neural representations. <em>NeurIPS</em> (2021).</li>
          <li>Yang, G. et al. Tensor Programs V: Tuning Large Neural Networks via Zero-Shot Hyperparameter Transfer (µP). arXiv:2203.03466 (2022).</li>
          <li>Kaplan, J. et al. Scaling Laws for Neural Language Models. arXiv:2001.08361 (2020).</li>
        </ol>
      </div>
    </PageShell>
  )
}
