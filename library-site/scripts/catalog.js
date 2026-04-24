// Curated catalog. Order here = order on the shelf.
// Categories drive the "shelves" layout on the home screen.

export const CATALOG = {
  categories: [
    {
      id: 'foundations',
      label: 'Foundations',
      blurb: 'Start here — orientation, vision, and shared vocabulary.',
    },
    {
      id: 'uq',
      label: 'Uncertainty & Error',
      blurb: 'How we measure, predict, and correct potential error at scale.',
    },
    {
      id: 'validation',
      label: 'Validation & Benchmarking',
      blurb: 'Phonons, force fields, and what "good enough" really means.',
    },
    {
      id: 'theory',
      label: 'Theory',
      blurb: 'Coarse-graining, sloppy models, information-theoretic bounds.',
    },
    {
      id: 'ecosystem',
      label: 'Ecosystem & Funding',
      blurb: 'The people, labs, and programs behind computational materials.',
    },
    {
      id: 'formalization',
      label: 'Formalization',
      blurb: 'Theorem-driven validation, build-locking contracts, and the epistemic gap.',
    },
    {
      id: 'meta',
      label: 'Meta',
      blurb: 'Navigation, extraction logs, and how this library was built.',
    },
  ],

  entries: [
    // ── Foundations ─────────────────────────────────────────────────
    {
      id: 'research-index',
      source: 'docs/research-index.md',
      title: 'Research Index',
      subtitle: 'Annotated catalog of every research, planning, and presentation document.',
      category: 'foundations',
      tags: ['index', 'overview'],
    },
    {
      id: 'navigation',
      source: 'docs/navigation.md',
      title: 'Repo Navigation Guide',
      subtitle: 'Quick-search codemap for finding things fast across the workspace.',
      category: 'foundations',
      tags: ['navigation', 'reference'],
    },
    {
      id: 'glossary',
      source: 'GLOSSARY.md',
      title: 'Glossary',
      subtitle: 'Terminology index for materials science, MD, DFT, and MLIPs.',
      category: 'foundations',
      tags: ['glossary', 'reference'],
    },
    {
      id: 'readme',
      source: 'README.md',
      title: 'Workspace README',
      subtitle: 'What glim is, what is built vs. planned, and where to start.',
      category: 'foundations',
      tags: ['overview'],
    },
    {
      id: 'design-guide',
      source: 'DESIGN_GUIDE.md',
      title: 'Atomic Understanding — Design Guide',
      subtitle: 'Visual identity, tokens, and component architecture for all Lupine UIs.',
      category: 'foundations',
      tags: ['design', 'ui'],
    },

    // ── Uncertainty & Error ─────────────────────────────────────────
    {
      id: 'glimmer-multifidelity-uq',
      source: 'docs/multi_fidelity_uq_glimMER_report.md',
      title: 'Multi-Fidelity UQ & the glimMER Paradigm',
      subtitle: 'Cross-potential meta-analysis and PCA-based error correction operators.',
      category: 'uq',
      tags: ['uq', 'multi-fidelity', 'glimMER'],
    },
    {
      id: 'bayesian-active-learning',
      source: 'docs/bayesian_active_learning_report.md',
      title: 'Bayesian Active Learning for Potential Selection',
      subtitle: 'Gaussian Process surrogates across 23 potentials × 12,000 materials.',
      category: 'uq',
      tags: ['bayesian', 'active-learning'],
    },
    {
      id: 'weather-climate-ensembles',
      source: 'docs/weather_climate_ensembles_report.md',
      title: 'Ensemble Methods from Climate Science',
      subtitle: 'Transferring weighting strategies from weather to atomistic simulation.',
      category: 'uq',
      tags: ['ensembles', 'climate'],
    },
    {
      id: 'gnn-error-prediction',
      source: 'docs/gnn_error_prediction_report.md',
      title: 'GNNs for Predicting Potential Errors',
      subtitle: 'Predicting where a potential will fail from crystal-structure topology.',
      category: 'uq',
      tags: ['gnn', 'error-prediction'],
    },
    {
      id: 'tda-error-landscapes',
      source: 'docs/tda_error_landscapes_report.md',
      title: 'Topological Data Analysis of Error Landscapes',
      subtitle: 'Persistent homology for high-dimensional error surfaces.',
      category: 'uq',
      tags: ['tda', 'topology'],
    },

    // ── Validation & Benchmarking ──────────────────────────────────
    {
      id: 'phonon-benchmarking',
      source: 'docs/phonon_benchmarking_report.md',
      title: 'Phonon Frequency Benchmarking',
      subtitle: 'Second-derivative tests as the gold standard for potential validation.',
      category: 'validation',
      tags: ['phonon', 'benchmark'],
    },
    {
      id: 'key-findings',
      source: 'docs/KEY_FINDINGS_SUMMARY.md',
      title: 'Phonon Benchmarking — Key Findings',
      subtitle: 'Executive summary of the most consequential phonon findings for GLIM.',
      category: 'validation',
      tags: ['summary', 'phonon'],
    },

    // ── Theory ──────────────────────────────────────────────────────
    {
      id: 'rg-coarsegraining',
      source: 'docs/rg_coarsegraining_report.md',
      title: 'Renormalization Group Coarse-Graining',
      subtitle: 'Systematically deriving effective potentials via partition-function matching.',
      category: 'theory',
      tags: ['rg', 'coarse-graining'],
    },
    {
      id: 'sloppy-models',
      source: 'docs/sloppy_models_report.md',
      title: 'Sloppy Models & Potential Transferability',
      subtitle: 'Fisher Information eigenvalue analysis — stiff vs. sloppy directions.',
      category: 'theory',
      tags: ['sloppy', 'fim'],
    },
    {
      id: 'info-theoretic',
      source: 'docs/info_theoretic_report.md',
      title: 'Information-Theoretic Bounds on Model Error',
      subtitle: 'Kolmogorov complexity, rate-distortion, and Shannon entropy for model selection.',
      category: 'theory',
      tags: ['information-theory'],
    },

    // ── Ecosystem & Funding ────────────────────────────────────────
    {
      id: 'funding-landscape',
      source: 'docs/funding_landscape_report.md',
      title: 'Federal Funding Landscape (2025–2026)',
      subtitle: 'NSF DMREF, DOE BES, DARPA SURGE/PRIME, and MGI strategic priorities.',
      category: 'ecosystem',
      tags: ['funding', 'policy'],
    },

    // ── Formalization ───────────────────────────────────────────────
    {
      id: 'formal-manifesto',
      source: 'docs/formal-manifesto.md',
      title: 'The Executable Manifesto',
      subtitle: '47 theorems, 1,499 build targets, and a build-locking epistemic contract.',
      category: 'formalization',
      tags: ['lean', 'formal-spec', 'manifesto'],
    },
    {
      id: 'formal-methodology',
      source: 'docs/formal-methodology.md',
      title: 'In the In Between',
      subtitle: 'Why we formalize before we simulate. A methodology for theorem-driven validation.',
      category: 'formalization',
      tags: ['lean', 'methodology', 'epistemology'],
    },
    {
      id: 'formal-audit',
      source: 'docs/formal-audit.md',
      title: 'Formal Audit Report',
      subtitle: 'Split verdict: Simpson\'s paradox fabricated, hyper-ribbon consistent but ungrounded.',
      category: 'formalization',
      tags: ['lean', 'audit', 'verification'],
    },
    {
      id: 'formal-hypotheses',
      source: 'docs/formal-hypotheses.md',
      title: 'Six Meta-Scientific Hypotheses',
      subtitle: 'From validation incompleteness to bootstrap collapse — the new research agenda.',
      category: 'formalization',
      tags: ['lean', 'hypotheses', 'meta-science'],
    },

    // ── Meta ────────────────────────────────────────────────────────
    {
      id: 'extraction-complete',
      source: 'docs/EXTRACTION_COMPLETE.md',
      title: 'Extraction — Complete',
      subtitle: 'How the PDFs/DOCX were turned into this library.',
      category: 'meta',
      tags: ['meta', 'build'],
    },
    {
      id: 'extraction-report',
      source: 'docs/EXTRACTION_REPORT.md',
      title: 'Extraction — Report',
      subtitle: 'Conversion statistics and fidelity notes.',
      category: 'meta',
      tags: ['meta', 'build'],
    },
    {
      id: 'extraction-notes',
      source: 'docs/EXTRACTION_NOTES.md',
      title: 'Extraction — Notes',
      subtitle: 'Edge cases encountered and how they were handled.',
      category: 'meta',
      tags: ['meta', 'build'],
    },
  ],
};
