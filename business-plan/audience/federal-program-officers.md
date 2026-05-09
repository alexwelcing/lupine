# For: Federal Program Officers (NSF, DOE, DARPA, ARPA-E, NIST)

This is the same plan as the rest of this folder, recut for federal-
proposal reading flow. The emphasis shifts from valuation and exit to
scientific merit, MGI alignment, broader impact, and cost-effective
infrastructure.

## The 30-second pitch

Lupine is an open-core (Apache 2.0), Rust-implemented, peer-reviewed
materials simulation engine that unifies DFT, ML interatomic
potentials, and molecular dynamics in a single pipeline. The
methodology — sloppy-model geometry, multi-fidelity uncertainty
quantification, and Simpson's-paradox detection in pooled benchmark
data — is published in *Integrating Materials and Manufacturing
Innovation* (2026, in press). The engine is operational; the next
24 months extend it to a production DFT solver and full ML pipeline,
producing infrastructure aligned with the 2025 MGI Strategic Plan and
ASCR Applied Mathematics priorities.

## MGI alignment

| 2021 MGI goal | Lupine contribution |
|----------------|----------------------|
| Unify the Materials Innovation Infrastructure | DFT + ML + MD in one engine; LAMMPS, VASP, OpenKIM interoperability |
| Harness the power of materials data | Standardized validation suite (23 × 12K phonon benchmark); FAIR-ready data outputs |
| Educate, train, and connect the workforce | Open-source curricula, conference tutorials, browser-deployed tools that lower the entry cost for materials simulation |

| 2025-2026 MGI priority | Lupine contribution |
|--------------------------|----------------------|
| AI integration across MII | Foundation MLIP-agnostic hosting; active learning loop |
| Autonomous experimentation | Differentiable simulation primitives compatible with self-driving lab loops |
| Multi-fidelity UQ across scales | Direct lineage from DARPA EQUiPS to PRIME; methodology peer-reviewed |
| Cross-database interoperability | Materials Project, OpenKIM, JARVIS-DFT integration as core feature |

Source on agency commitments: `data/federal_funding_programs.csv`.

## Specific FOA / solicitation alignment

### NSF DMREF
- Closed-loop integration of theory, computation, and experiment is
  the program's central methodology requirement
  ([data:federal_funding_programs.csv:nsf-dmref]).
- Lupine ships the closed loop: validated DFT → MLIP fitting → MD →
  experimental comparison.
- UQ and error propagation in multi-scale models is a 2025-2026
  priority; this is exactly the IMMI paper.

### NSF CSSI
- "Open-source materials informatics software development and
  maintenance with sustainability planning"
  ([data:federal_funding_programs.csv:nsf-cssi]) — Lupine open core
  with explicit revenue model funding sustainability.

### DOE BES Computational Materials Sciences
- "Exascale-ready software development with deployment on leadership
  computing facilities, validation against experimental data,
  open-source release"
  ([data:federal_funding_programs.csv:doe-bes-cms]) — direct match.

### DOE ASCR Applied Mathematics
- Multi-fidelity methods, Bayesian inference, surrogate modeling are
  long-standing program priorities.
- Lupine integrates these into a production engine; not a research
  prototype.

### DARPA Defense Sciences Office
- EQUiPS → SURGE → PRIME methodology lineage
  ([data:federal_funding_programs.csv:darpa-equips, darpa-prime])
  is Lupine's research foundation.
- Open-core licensing is the right transition vehicle for methodology
  produced under DARPA programs.

### ARPA-E (CATALCHEM-E, MAGNITO, OPEN+)
- Active-learning + foundation-MLIP-agnostic engine fits AI/ML-
  accelerated materials discovery directly
  ([data:federal_funding_programs.csv:arpa-e-catalchem]).
- STTR mechanism is the natural entry point for academic + Lupine
  partnerships.

## Scientific merit

The methodology is grounded in three converging research traditions
(see `lit-review.md`):

1. **Sloppy-model theory.** Brown & Sethna (2003), Waterfall et al.
   (2006), Gutenkunst et al. (2007), Transtrum / Machta / Sethna
   (2010-2015), Quinn et al. (2019, 2023). Foundation work showing
   that interatomic potentials exhibit hyper-ribbon manifold
   structure with bounded effective dimensionality.
2. **Causal inference + Simpson's paradox.** Simpson (1951), Bickel et
   al. (1975), Pearl (2014). Pooled error correlations across
   chemically distinct elements can reverse direction without
   stratification.
3. **Random-effects meta-analysis.** Hedges & Olkin (1985),
   DerSimonian & Laird (1986), Higgins et al. (2003), Welz et al.
   (2022). The correct framework for combining group-specific
   correlations.

The Welcing 2026 paper unifies these into a single methodological
contribution: the *Causal Geometry of Prediction Errors in
Interatomic Potentials*, with FCC effective dimensionality ~1.66/3
and BCC Simpson's-paradox detection, both validated on OpenKIM-
archived potentials.

## Broader impact

| Audience | Impact |
|----------|--------|
| Academic researchers | Apache 2.0 access to a unified simulation engine; lowers the cost barrier for sub-R1 institutions |
| National laboratories | Cooperative-agreement-eligible infrastructure with no Vienna licensing dependency |
| Industry (semiconductors, aerospace, energy) | ITAR-eligible deployment; CHIPS Act / IRA-aligned |
| K-12 / undergraduate education | WebGPU browser-deployed tools (Lupine View) make materials visualization accessible without HPC access |
| International collaboration | Open-core licensing supports MGI international partnerships (DMREF / NSERC / DFG / DST / BSF) |

## Sustainability plan

NSF CSSI explicitly requires a sustainability plan. Lupine's:

- **Year 1-2.** Funded by the seed round + non-dilutive federal
  awards (DMREF subaward, CSSI, SBIR/STTR).
- **Year 3-5.** Sustaining revenue from industry production tier
  ($750K-$1.5M ACV) and federal direct contracts.
- **Year 5+.** Revenue self-sustains the open core; foundation
  partnerships with academic institutions for educational use.
- **Open-source governance.** Apache 2.0 license; community contribution
  workflow; long-term archival in publications and federal data
  repositories.
- **Successor planning.** All methodology is published; methodology
  reproducibility is built into the test suite shipped with the
  engine.

## Vehicles for Lupine partnership

| Mechanism | Lupine role | Target award |
|-----------|--------------|--------------|
| NSF DMREF | Co-PI through academic anchor (MIT / Caltech / U Michigan) | $1.5-2.0M / 4 years |
| NSF CSSI | Lead institution candidate | $0.5-2M / 3-5 years |
| NSF SBIR/STTR | Direct as small business | $305K Phase I, $1.25M Phase II |
| DOE BES CMS | Co-PI on team-led award | $2-3M/yr |
| DOE SBIR/STTR | Direct as small business | $200-300K Phase I, $1M Phase II |
| DOE EXPRESS | PI as small business | $200K-$1M / 2 years |
| DARPA DSO BAA | Lead small business on PRIME-extension proposal | $5M+ / 4 years |
| ARPA-E CATALCHEM-E | STTR partner with Stanford SUNCAT or MIT | $1M+ / 2-3 years |
| NIST cooperative agreement | Direct cooperative for FAIR data ontology | $400K / multi-year |

## Cost-effectiveness

The federal taxpayer ROI per Lupine award is high. Specifically:

- An NSF DMREF $1.75M subaward funds engineering on infrastructure
  used by ~5,000 R1 research groups
  ([data:market_segments.csv:lammps-users-conservative]). That is
  ~$350 per researcher served, before any commercial monetization.
- A DOE BES CMS $2.5M/yr award funds an open-core engine that
  replaces $4,500/seat/yr commercial licensing across DOE-funded
  user facilities ([data:competitor_matrix.csv:vasp]). The
  Vienna-licensing offset alone justifies the investment.
- A DARPA $5M direct award funds methodology development that
  transitions to defense primes (GE, Pratt, Boeing, Lockheed) at
  zero additional licensing cost.

## What we will not do

In order to earn federal trust:

- Lupine will not gate methodology behind paid tiers. The Apache 2.0
  core is the methodology; commercial offerings are managed compute,
  enterprise support, and ITAR-eligible deployment.
- Lupine will not fork the open source as a way to monetize. All
  methodology improvements flow to the open core.
- Lupine will not lock data formats. We use FAIR-aligned formats
  (HDF5 + JSON + standard schemas) and document them.
- Lupine will not skip benchmark publication. Quarterly benchmark
  releases are public.

## Specific contact / proposal points

- Direct: founders@lupine.science (founder-led correspondence on
  early-stage proposal scoping).
- White paper turnaround: 2 weeks from program-officer contact.
- Full proposal turnaround: 4-8 weeks from white paper feedback.
- Indirect cost rate: TBD per institution rules; we are flexible on
  prime / sub structure.

## What success looks like federally

By end of FY28:
- 3+ federal awards active across NSF / DOE / DARPA / ARPA-E /
  NIST.
- Lupine engine in production at 2+ DOE national-lab user facilities.
- 50+ peer-reviewed publications citing Lupine in methodology section.
- Lupine cited as named tooling in 5+ federal proposals from
  external PIs.
- Annual benchmark public releases sustaining 24x12K material
  coverage with quarterly updates.

This is the federal infrastructure mandate. We are designed for it.
