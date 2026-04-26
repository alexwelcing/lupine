import { createFileRoute } from '@tanstack/react-router'
import { Section, SectionHeader } from '../components/ui/Section'
import { motion } from 'framer-motion'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useEffect } from 'react'
import { PageShell } from '../components/ui/PageShell'

export const Route = createFileRoute('/research')({
  component: ResearchPage,
  head: () => ({
    links: [
      { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css' }
    ],
    scripts: [
      { src: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js', defer: true },
      { src: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js', defer: true }
    ]
  })
})

const table1Rows = [
  { parameter: 'FCC EAM', reference: '1.41 [1.17, 2.17]', observed: '0.92 [0.85, 0.97]', delta: '-0.93', deltaState: 'good' },
  { parameter: 'FCC LJ', reference: '1.36 [1.04, 1.50]', observed: '0.89 [0.81, 0.94]', delta: '-0.91', deltaState: 'good' },
  { parameter: 'FCC SW', reference: '1.29 [1.09, 2.09]', observed: '0.87 [0.78, 0.93]', delta: '-0.89', deltaState: 'good' },
  { parameter: 'BCC EAM', reference: '1.55 [1.06, 1.96]', observed: '0.85 [0.74, 0.91]', delta: '-0.86', deltaState: 'good' },
  { parameter: 'BCC LJ', reference: '1.12 [1.03, 1.52]', observed: '0.82 [0.71, 0.89]', delta: '-0.84', deltaState: 'good' },
]

function ResearchPage() {
  useEffect(() => {
    const renderMath = () => {
      // @ts-ignore
      if (window.renderMathInElement) {
        // @ts-ignore
        window.renderMathInElement(document.body)
      } else {
        setTimeout(renderMath, 200)
      }
    }
    renderMath()
  }, [])

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
        <p dangerouslySetInnerHTML={{ __html: "We propose treating IP errors as points on a \\(d\\)-dimensional error manifold \\(\\mathcal{M} \\subset \\mathbb{R}^d\\). Each point corresponds to a potential; each coordinate corresponds to the prediction error for a specific material-property pair. The geometry of this manifold—its dimensionality, curvature, and clustering—reveals fundamental constraints on transferability." }} />
        <p dangerouslySetInnerHTML={{ __html: "Our central hypothesis is that \\(\\mathcal{M}\\) is a <em>hyper-ribbon</em>: a manifold whose local dimensionality is much smaller than the ambient space, with eigenvalue spectra decaying exponentially. If true, a universal potential need only capture a small number of dominant error modes." }} />

        <h2>2. Theory</h2>
        <h3>2.1 Sloppy Model Theory</h3>
        <p>In sloppy models, the Fisher information matrix has eigenvalues spanning many orders of magnitude. The participation ratio (PR) measures effective dimensionality:</p>
        <div className="my-6 p-6 glass-panel-elevated text-center" dangerouslySetInnerHTML={{ __html: "\\[\\text{PR} = \\frac{(\\sum_i \\lambda_i)^2}{\\sum_i \\lambda_i^2}\\]" }} />
        <p dangerouslySetInnerHTML={{ __html: "where \\(\\lambda_i\\) are eigenvalues of the error covariance matrix. \\(\\text{PR} \\ll d\\) indicates that most variance concentrates in a few directions." }} />

        <h3>2.2 Simpson's Paradox in Materials Data</h3>
        <p dangerouslySetInnerHTML={{ __html: "When pooling data across materials, a correlation between two properties may reverse sign relative to within-material correlations. We detect this by comparing pooled Pearson \\(r\\) with weighted within-group \\(r_w\\). A sign reversal indicates ecological fallacy risk." }} />

        <h3>2.3 Random-Effects Meta-Analysis</h3>
        <p dangerouslySetInnerHTML={{ __html: "For \\(k\\) independent effect sizes \\(y_i\\) with variances \\(\\sigma_i^2\\), the DerSimonian-Laird estimator is:" }} />
        <div className="my-6 p-6 glass-panel-elevated text-center" dangerouslySetInnerHTML={{ __html: "\\[\\tau^2 = \\max\\Bigl(0, \\frac{Q - (k-1)}{\\sum w_i - \\frac{\\sum w_i^2}{\\sum w_i}}\\Bigr), \\quad w_i = \\frac{1}{\\sigma_i^2}\\]" }} />
        <p dangerouslySetInnerHTML={{ __html: "where \\(Q = \\sum w_i(y_i - \\bar{y})^2\\). The \\(I^2\\) statistic quantifies between-study heterogeneity:" }} />
        <div className="my-6 p-6 glass-panel-elevated text-center" dangerouslySetInnerHTML={{ __html: "\\[I^2 = \\max\\Bigl(0, \\frac{Q - (k-1)}{Q}\\Bigr) \\times 100\\%\\]" }} />

        <h2>3. Methods</h2>
        <h3>3.1 Benchmark Data</h3>
        <p dangerouslySetInnerHTML={{ __html: "FCC metals (Al, Cu, Ag, Au, Ni, Pd, Pt, Pb): elastic constants \\(C_{11}, C_{12}, C_{44}\\) from DFT references. BCC metals (Fe, Cr, Mo, W, V, Nb, Ta): same properties. Errors are computed as \\(\\epsilon = (y_{\\text{pred}} - y_{\\text{ref}}) / y_{\\text{ref}}\\)." }} />

        <h3>3.2 Geometric Analysis</h3>
        <p dangerouslySetInnerHTML={{ __html: "For each potential, errors are assembled into a matrix \\(X \\in \\mathbb{R}^{n \\times m}\\) (\\(n\\) materials, \\(m\\) properties). PCA via SVD yields eigenvalues \\(\\lambda_1 \\geq \\lambda_2 \\geq \\dots \\geq \\lambda_m\\). A geometric fit \\(\\log \\lambda_i = a + b i\\) tests exponential decay. Hyper-ribbon classification requires:" }} />
        <div className="my-6 p-6 glass-panel-elevated text-center" dangerouslySetInnerHTML={{ __html: "\\[\\tau_{\\text{MK}} < -0.8 \\quad \\wedge \\quad R^2_{\\log} > 0.8 \\quad \\wedge \\quad \\text{PR}/m < 0.9\\]" }} />

        <h3>3.3 Bootstrap Uncertainty</h3>
        <p dangerouslySetInnerHTML={{ __html: "Non-parametric bootstrap (\\(B = 500\\)) resamples materials with replacement. Percentile confidence intervals report the 2.5th and 97.5th quantiles of PR and \\(R^2_{\\log}\\) distributions." }} />

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
        <p dangerouslySetInnerHTML={{ __html: "Figure 3 demonstrates the paradox: pooled correlation between \\(C_{11}\\) and \\(C_{12}\\) errors is \\(r = -0.435\\), while within-group correlations average \\(r_w = +0.147\\). 57% of material-level correlations have the opposite sign from the pooled estimate." }} />

        <h2>5. Discussion & Conclusions</h2>
        <p dangerouslySetInnerHTML={{ __html: "The hyper-ribbon geometry implies a universal potential needs to correctly model only one or two dominant error modes. Second, Simpson's paradox warns against pooling errors across crystal structures. The geometric framework provides quantitative diagnostics for potential selection beyond pointwise comparisons, implemented in <code>atlas-distill</code>." }} />
      </div>
    </PageShell>
  )
}
