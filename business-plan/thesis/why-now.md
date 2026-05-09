# Why Now

Three independent forces converged in the 24 months before this round.
None of them is speculative. The window is open *now* because:

## 1. ML interatomic potentials cleared the science bar

By the end of 2024, the eight foundation MLIP families
([data:market_segments.csv:mlip-foundation]) had hit accuracy regimes
where:

- **Universal MLIPs** sit at 2–10 meV/atom error
  ([data:market_segments.csv:mlip-universal-error-mev]).
- **Fine-tuned MLIPs** routinely beat 1 meV/atom — the threshold below
  which downstream property predictions (phonons, elastic constants,
  thermodynamics) become indistinguishable from DFT
  ([data:market_segments.csv:mlip-finetune-error-mev]).
- A **$400 fine-tune** produces a 55% improvement in phonon properties
  on top of an off-the-shelf foundation model
  ([data:market_segments.csv:mlip-finetune-cost],
  [data:market_segments.csv:mlip-finetune-improvement]).

This is the difference between research curiosity and production
infrastructure. The science is settled. The tooling is not. That gap is
where Lupine plays.

## 2. WebGPU shipped browser-native scientific compute

WebGPU went stable in Chrome 113 (May 2023) and Safari 18 (2024). It is
the first time a working scientist can:

- Drop a LAMMPS dump file into a browser and get publication-quality
  rendering of 10M+ atoms at 60fps without installing anything.
- Run real GPU compute shaders for visualization and lightweight
  analysis without Python, CUDA, or a license server.

We built the first publication-grade materials-science application on
WebGPU. The economic claim is small: visualization is a wedge, not the
business. But it is a wedge that *replaces a $1,200/seat/yr commercial
license* ([data:competitor_matrix.csv:ovito]) with a URL, and the
distribution channel it opens — research-group adoption with zero
procurement friction — is the entry point for everything else we ship.

## 3. Sovereignty became a procurement requirement

Three policy events changed the materials-software market between 2022
and 2026:

- **CHIPS and Science Act** ($52.7B; $13.2B specifically for R&D and
  workforce; [data:market_segments.csv:chips-act-rd]). Every CHIPS-funded
  foundry now has a procurement directive to source U.S./allied software
  for the materials qualification work that VASP currently dominates.
- **Inflation Reduction Act** ($369B clean-energy authorization;
  [data:market_segments.csv:ira-clean-energy]). Battery and electrolyte
  research is suddenly the largest materials-simulation buyer in the
  market.
- **MGI 2021 Strategic Plan + 2025 priorities.** OSTP's Subcommittee on
  the Materials Genome Initiative now explicitly calls for AI
  integration, autonomous experimentation, and *open* infrastructure
  across NSF, DOE, NIST, DOD, and NASA
  ([data:federal_funding_programs.csv:mgi-cumulative]). The mandate
  language reads like a Lupine product spec.

VASP being held in Vienna is not, by itself, a problem. VASP being held
in Vienna *while ITAR-restricted programs at GE Aerospace, Pratt &
Whitney, Lockheed Skunk Works, and DARPA* are running materials
qualification is a problem
([data:partner_targets.csv:ge-aerospace], [data:partner_targets.csv:lockheed-skunkworks],
[data:partner_targets.csv:darpa-dso]). Lupine is permissively licensed
(Apache 2.0 core), Rust-implemented, and developed in the open. That is
the procurement story.

## Why these three together change the deal

Any one of these forces alone produces an interesting research question.
All three together produce a *market-making* moment:

- The science (foundation MLIPs) is settled, so the engineering bet is
  bounded.
- The distribution channel (WebGPU + open core) is structurally lower
  friction than incumbents.
- The buyer (federal programs + sovereign-mandated industry) has
  authorized budget *and* a procurement directive.

The companies that captured the previous market-making moments —
ANSYS in 1995's NASTRAN era, Synopsys in EDA's RTL transition,
Schrödinger in physics-based drug discovery — all had this same
structure: an underlying scientific transition + a distribution channel
+ a buyer with a budget. The asymmetry is that there is exactly one
seat per cycle. We are early enough to take it. The next 24 months
decide who ends up holding it.

## The closing window

By 2028 we expect:

- A hyperscaler (Microsoft Azure Quantum Elements is the front-runner,
  [data:competitor_matrix.csv:microsoft-azure-quantum]) will have a
  productized materials suite and will be selling on the same
  sovereignty story — though without the open-core moat.
- One of the foundation MLIP companies (Orbital Materials, MatterSim
  spinoff, or a new entrant) will have a productized inference-as-a-
  service offering. We co-opt rather than compete by being the
  platform layer.
- The DARPA SURGE/PRIME program transitions complete, and the next
  generation of UQ-for-AM programs launch with vendors picked.

Either we are the platform layer that hosts these moves by then, or we
are not. The next 24 months matter more than the 24 after.
