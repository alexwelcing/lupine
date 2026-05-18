// Curated catalog. Order here = order on the shelf.
// Categories drive the "shelves" layout on the home screen.

export const CATALOG = {
  categories: [
    {
      id: 'changelog',
      label: { en: 'Changelog & Progress', zh: '进展日志' },
      blurb: { en: 'The narrative spine — what changed, why, results, and next steps.', zh: '叙事主线 — 改变了什么、为什么、结果以及下一步。' },
    },
    {
      id: 'foundations',
      label: { en: 'Foundations', zh: '基础与愿景' },
      blurb: { en: 'Start here — orientation, vision, and shared vocabulary.', zh: '从这里开始 — 方向、愿景和共有词汇。' },
    },
    {
      id: 'decisions',
      label: { en: 'Decisions', zh: '决策记录' },
      blurb: { en: 'Architecture decision records — what we chose, the alternatives, and why.', zh: '架构决策记录 — 我们的选择、备选方案以及理由。' },
    },
    {
      id: 'uq',
      label: { en: 'Uncertainty & Error', zh: '不确定性与误差' },
      blurb: { en: 'How we measure, predict, and correct potential error at scale.', zh: '我们如何在大规模下测量、预测和纠正势函数误差。' },
    },
    {
      id: 'validation',
      label: { en: 'Validation & Benchmarking', zh: '验证与基准测试' },
      blurb: { en: 'Phonons, force fields, and what "good enough" really means.', zh: '声子、力场以及“足够好”的真正含义。' },
    },
    {
      id: 'theory',
      label: { en: 'Theory', zh: '理论' },
      blurb: { en: 'Coarse-graining, sloppy models, information-theoretic bounds.', zh: '粗粒化、sloppy模型、信息论边界。' },
    },
    {
      id: 'ecosystem',
      label: { en: 'Ecosystem & Funding', zh: '生态与资金' },
      blurb: { en: 'The people, labs, and programs behind computational materials.', zh: '计算材料科学背后的研究人员、实验室和项目。' },
    },
    {
      id: 'formalization',
      label: { en: 'Formalization', zh: '形式化' },
      blurb: { en: 'Theorem-driven validation, build-locking contracts, and the epistemic gap.', zh: '定理驱动验证、构建锁定契约和认知差距。' },
    },
    {
      id: 'meta',
      label: { en: 'Meta', zh: '元数据' },
      blurb: { en: 'Navigation, extraction logs, and how this library was built.', zh: '导航、提取日志以及该图书馆是如何构建的。' },
    },
  ],

  entries: [
    // ── Changelog & Progress ────────────────────────────────────────
    {
      id: 'changelog',
      source: 'CHANGELOG.md',
      title: 'Changelog & Progress',
      subtitle: 'What changed, why, results, and suggested next steps. Read this first.',
      category: 'changelog',
      tags: ['changelog', 'progress', 'narrative'],
    },
    {
      id: 'public-approach',
      source: 'docs/PUBLIC.md',
      title: 'Public Corpus & Documentation Approach',
      subtitle: 'How the corpus stays public — organization model, shelves, and roadmap.',
      category: 'changelog',
      tags: ['meta', 'strategy', 'roadmap'],
    },
    {
      id: 'phoenix-observability',
      source: 'docs/phoenix-observability.md',
      title: 'Phoenix: Making the Research Loop Observable',
      subtitle: 'Why we wired Phoenix, the Cloudflare edge limit we proved, and how to get more value from it.',
      category: 'changelog',
      tags: ['phoenix', 'observability', 'evals', 'featured'],
      featured: true,
    },
    {
      id: 'research-evolution',
      source: 'docs/research_evolution_2026_05_05.md',
      title: 'The Loop That Caught Itself',
      subtitle: 'Research evolution report — how the corpus refuted its own exciting findings.',
      category: 'changelog',
      tags: ['self-correction', 'research-evolution', 'narrative'],
    },

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
      id: 'internal-science-program',
      source: 'docs/internal-science-program.md',
      title: 'Internal Science Program',
      subtitle: 'The research agenda: what we are trying to learn and how the loop pursues it.',
      category: 'foundations',
      tags: ['program', 'agenda', 'vision'],
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
      title: 'Lupine — Project README',
      subtitle: 'The error-geometry program: what is established vs. conjectured, and where to start.',
      category: 'foundations',
      tags: ['overview'],
    },
    {
      id: 'design-guide',
      source: 'lupine-start/DESIGN.md',
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
    {
      id: 'lit-review-error-structure',
      source: 'lit-review.md',
      title: 'Error Structure in Interatomic Potentials — Literature Review',
      subtitle: 'Sloppy models, Simpson’s paradox, and FCC error manifolds: a 30-reference synthesis.',
      category: 'theory',
      tags: ['literature-review', 'sloppy', 'simpson', 'fcc'],
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
      id: 'formal-vision',
      source: 'docs/formal-vision.md',
      title: 'The Open Distillation Factory — Executable Vision',
      subtitle: '47 theorems, 1,499 build targets, and a build-locking epistemic contract.',
      category: 'formalization',
      tags: ['lean', 'formal-spec', 'vision'],
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

    // ── Decisions ───────────────────────────────────────────────────
    {
      id: 'adr-0001-storage',
      source: 'docs/decisions/0001-r2-over-bandwidth-alliance.md',
      title: 'ADR-0001 — Hybrid GCS + R2 Storage',
      subtitle: 'Why hybrid object storage, and why we deferred Cloudflare-fronted GCS.',
      category: 'decisions',
      tags: ['adr', 'infrastructure', 'storage'],
    },

    // ── Meta ────────────────────────────────────────────────────────
    {
      id: 'operating-system',
      source: 'docs/operating-system.md',
      title: 'GLIM Operating System',
      subtitle: 'How the pieces fit: the loop, the corpus, and the surfaces around them.',
      category: 'meta',
      tags: ['meta', 'system'],
    },
    {
      id: 'resource-fabric',
      source: 'docs/resource-fabric.md',
      title: 'GLIM Resource Fabric',
      subtitle: 'The infrastructure fabric — compute, storage, and deploy surfaces.',
      category: 'meta',
      tags: ['meta', 'infrastructure'],
    },
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

  // Language labels for UI chrome (used by build & runtime)
  languages: {
    en: { label: 'English', native: 'English' },
    zh: { label: 'Chinese', native: '中文' },
  },
};
