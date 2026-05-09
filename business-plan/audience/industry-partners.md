# For: Industry Partners (OEMs, Defense Primes, Battery / Energy)

This is the same plan as the rest of this folder, recut for the
operating reality of an industrial materials buyer: what does Lupine
do for our cycle time, our cost base, our risk posture, and our
sovereign supply.

## The 30-second pitch

Lupine is an open-core, Rust-implemented materials simulation engine
that ships a unified DFT → ML → MD pipeline with peer-reviewed
uncertainty quantification. We deploy on-premise (ITAR-eligible) or
in cloud, run any foundation MLIP (MACE, NequIP, MatterSim, ORB,
OMat24, eqV2), and produce contractable, error-bounded results in
weeks rather than months.

Our paid pilot ($150K, 3 months) takes your specific materials,
benchmarks them in our published 23-potential / 12,000-material
framework, and returns a documented UQ-bounded report your team can
sign on. If the pilot succeeds, the production deployment is
$750K-$1.5M annual.

## Why an industrial partner cares

Three things move:

### 1. Cycle time

For a battery startup or a turbine-alloy program, the materials
qualification cycle is the gate item. Lupine compresses it via:

- **MLIP fine-tuning** — 60-140 GPU-hours per model
  ([data:market_segments.csv:mlip-finetune-cost]) to specialize a
  foundation MLIP on your materials, with 55% improvement in phonon
  properties [data:market_segments.csv:mlip-finetune-improvement].
- **Active learning loop** — DFT calls only when the MLIP is
  uncertain. 100x speedup at near-DFT accuracy is the steady-state
  for production materials.
- **Bit-identical force verification** against LAMMPS ensures your
  existing analysis pipelines do not have to change.

### 2. Cost base

The procurement math is direct:

- VASP: $4,500/seat/yr academic, multi-tier commercial
  ([data:competitor_matrix.csv:vasp]).
- OVITO Pro: $1,200/seat/yr per user ([data:competitor_matrix.csv:ovito]).
- Schrödinger materials suite: $15K+/seat for full functionality
  ([data:competitor_matrix.csv:schrodinger]).
- Lupine open-core: $0 license; $5K-$40K academic-tier; industry
  $150K-$1.5M ACV depending on scope.

For a 50-engineer materials group, the legacy stack is approximately
$300-500K/yr in seat licenses *before* compute. Lupine's industry
production tier replaces that with a single $750K-$1.5M agreement
covering the unified engine, support, and managed compute access
[data:unit_economics.csv:acv-industry-prod, acv-industry-enterprise].

### 3. Sovereignty and ITAR

For CHIPS-funded foundries, defense primes, and sovereign-mandated
research:

- Apache 2.0 license; no Vienna dependency.
- Rust implementation; full source-code review available.
- On-premise deployment with no telemetry; air-gapped option.
- US/Five-Eyes developed; no jurisdictional friction.

This is the procurement story that VASP cannot match.

## What a paid pilot looks like

Standard Phase 1 paid POC structure
([data:unit_economics.csv:acv-industry-pilot]):

| Phase | Week | Lupine deliverable | Customer activity |
|-------|------|---------------------|---------------------|
| Scoping | -2 to 0 | Joint statement of work; defined success metric; materials list | Identify champion; designate technical evaluator |
| Kickoff | 1 | Onboarding; access to engine; benchmark scope confirmed | Provide test materials (50-200 structures) |
| Phase 1a | 2-6 | Run customer materials through validated benchmark; UQ-bounded reports | Review interim findings |
| Phase 1b | 7-10 | Foundation MLIP fine-tuning if scoped; documented model artifacts | Compare to incumbent toolchain |
| Phase 1c | 11-12 | Final report; production-deployment recommendation | Decision on Phase 2 production |

Outcome of every Phase 1: a contractable artifact (signed report,
reproducible benchmark, fine-tuned model with documented UQ bounds)
that the customer team owns regardless of conversion to production.

## Sector-specific value

### Semiconductors

Process material qualification, 3D NAND scaling, advanced node
materials. CHIPS Act tailwind
[data:market_segments.csv:chips-act-rd]. Year-1 ACV target $1.2-1.5M
[data:partner_targets.csv:tsmc, intel-foundry, samsung-semi].

### Aerospace and defense

Single-crystal turbine alloys, hypersonics thermal protection, AM
qualification. Direct DARPA SURGE/PRIME methodology lineage
[data:federal_funding_programs.csv:darpa-prime]. Year-1 ACV target
$1.0-1.5M [data:partner_targets.csv:ge-aerospace, rolls-royce,
pratt-whitney, boeing, lockheed-skunkworks].

### Battery and clean energy

Solid-state electrolytes, anodes, cathodes, iron-air batteries. IRA
tailwind [data:market_segments.csv:ira-clean-energy]. Year-1 ACV
target $0.3-0.75M [data:partner_targets.csv:qsa-lithium, form-energy,
tesla-energy].

### Catalysis

Heterogeneous catalysis, CCS catalysts, emissions catalysts. ARPA-E
CATALCHEM-E mechanism available [data:federal_funding_programs.csv:arpa-e-catalchem].
Year-1 ACV target $0.8-1.0M [data:partner_targets.csv:exxon-low-c,
basf-rd].

## How co-development works mechanically

Standard partnership IP framework (see also
`partners/partnership-economics.md`):

| Asset | Owned by Lupine | Owned by partner |
|-------|------------------|-------------------|
| Lupine engine source | yes (Apache 2.0 core; enterprise add-ons separately licensed) | no |
| Pre-existing methodology IP | yes | no |
| Customer data and inputs | no | yes |
| Customer-derived parameters | no | yes |
| Customer-funded extensions to open core | yes (after embargo) | partner (during embargo) |
| Joint publications | shared author list | shared author list |

Standard embargo on customer-funded extensions: 6-12 months. ITAR /
ECCN-eligible deployments are containerized and run on-premise with
no telemetry.

## Sponsored research model

Beyond paid pilots and production licenses, we structure sponsored
research engagements where the customer co-funds methodology
development on a problem of mutual interest. Standard structure:

- 12-24 month engagement.
- Customer pays $500K-$2M depending on scope.
- Lupine commits dedicated engineering hours (typically 1-2 FTE).
- Joint authorship on published methodology; embargo on
  customer-specific findings.
- Production-deployment terms negotiated at engagement end.

Sponsored research is the highest-value engagement type when both
parties are aligned on a hard methodology problem. Examples:
- Improvement of MLIP UQ bounds for a specific chemical class.
- Extension of `atlas-distill` Simpson's-paradox detection to a
  customer's specific benchmark.
- Active-learning loop tuning on customer materials with proprietary
  labels.

## Why us versus the alternatives

| Alternative | Why Lupine wins |
|-------------|-----------------|
| Continue with VASP + LAMMPS + custom scripts | Vienna sovereignty risk; conversion losses between tools; no UQ; high seat-license aggregate cost |
| Schrödinger Materials Science | Closed-source; commercial license; not sovereignty-friendly; no Rust safety story; no foundation-MLIP-agnostic hosting |
| Citrine Informatics | Workflow layer, not engine; rides on legacy DFT tooling that we replace |
| Build internally | 18-36 month engineering cost; methodology IP we already shipped; not your core competency |
| Microsoft Azure Quantum Elements | Hyperscaler-locked; no open-source code review; not yet methodology-deep |
| Hire a foundation MLIP company | Single-model commitment; no DFT validation layer; no UQ stack |

## What we ask in return

Beyond contract revenue:

- **Reference availability.** A short conversation with prospective
  customers on the structure of our partnership.
- **Co-authored case study.** A 1-2 page anonymized case study (we
  manage IP / data sensitivity) that shows the engagement value.
- **Methodology citation.** When publishing on methodology developed
  in collaboration, cite the IMMI 2026 paper and the Lupine engine.

Industry partners are how we earn the academic and federal credibility
to fund the next round. The partnership is not transactional — it's
a multi-year structural commitment to a sovereign, unified materials
infrastructure.

## How to start

1. **30-minute scoping call.** Founder + your technical lead.
2. **Statement of work draft.** 1-week turnaround.
3. **Procurement.** 4-12 weeks depending on customer process.
4. **Phase 1 paid POC kickoff.** Standard 3-month engagement.

Email: founders@lupine.science.
