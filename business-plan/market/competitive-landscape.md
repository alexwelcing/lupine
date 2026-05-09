# Competitive Landscape

Source data: `data/competitor_matrix.csv`. Every competitor is named,
licensed, priced where public, and tied to its corporate status and
funding history.

## The structural map

The market sorts cleanly into five archetypes:

| Archetype | Example | Lupine relationship | Threat tier |
|-----------|---------|---------------------|-------------|
| Commercial DFT incumbent | VASP | We replace them in the long arc; sovereignty wedge | Direct (long-term) |
| Open-source DFT incumbent | Quantum ESPRESSO, ABINIT, GPAW | We bundle / interop, not displace | Adjacent |
| Open-source MD incumbent | LAMMPS | We are LAMMPS-compatible; we ride the user base | Friendly |
| Foundation MLIP (research → product) | MACE, NequIP, MatterSim, ORB, OMat24 | We host any of them; the platform layer | Co-opetitive |
| Materials informatics SaaS | Schrödinger, Citrine, Mat3ra | We are open-core where they are closed; we are an engine where they are a workflow | Direct (mid-term) |
| Hyperscaler play | Microsoft Azure Quantum Elements, IBM, Google DeepMind | Strategic acquirer or partner | Strategic |

## Where we win on the matrix

| Capability | VASP | LAMMPS | QE | OpenMM | Schrödinger | Citrine | Lupine |
|------------|------|--------|----|----|-------------|---------|--------|
| Plane-wave DFT | yes | — | yes | — | yes (proprietary) | — | yes (planned, roadmap FY27) |
| Classical MD | — | yes | — | yes | partial | — | yes |
| ML potentials native | — | plugin | — | partial | partial | — | yes (core) |
| Full DFT → ML → MD pipeline | — | — | — | — | partial | — | yes |
| Active learning loop | — | — | — | — | partial | yes | yes |
| Rust safety | — | — | — | — | — | — | yes |
| WebGPU visualization | — | — | — | — | — | — | yes |
| Apache 2.0 / permissive | — | GPL | GPL | MIT | commercial | commercial | yes |
| UQ / sloppy-model methodology | — | — | — | — | — | partial | yes (peer-reviewed) |

The "full pipeline + permissive license + UQ as first-class" combination
is unoccupied. Schrödinger is the closest commercial player but
operates a closed-source proprietary stack with a different price point
and data-rights model. Citrine is the closest informatics SaaS but does
not own the simulation engine — they ride on top of legacy DFT.

## Funding context for direct competitors

| Competitor | Latest round | Year | Amount (USD) | Source |
|------------|--------------|------|--------------|--------|
| Schrödinger | Public (NASDAQ:SDGR) | 2020 IPO | $3B IPO valuation | [data:comparable_exits.csv:schrodinger-ipo] |
| Citrine Informatics | Series C | 2022 | ~$25M (cumulative ~$100M) | [data:competitor_matrix.csv:citrine] |
| Orbital Materials | Series A | 2024 | $20M | [data:competitor_matrix.csv:orb] |
| Mat3ra (Exabyte.io) | Seed/A | n/a | undisclosed | [data:competitor_matrix.csv:exabyte-mat3ra] |

This shapes the comp set we cite when defending Lupine's $100–200M
post-money seed valuation. Orbital at $80M post-money on Series A with
no product is the lower bound. Schrödinger at $3B IPO is the upper.

## Where the hyperscalers fit

Hyperscalers are the structural acquirer set. They are not yet a sales
threat at the SAM scope we serve, but they will be by 2028:

- **Microsoft Azure Quantum Elements** ([data:competitor_matrix.csv:microsoft-azure-quantum])
  launched 2023 as a hyperscaler bundle. They have distribution but
  not the methodology depth.
- **IBM Research Materials** ([data:competitor_matrix.csv:ibm-rxn])
  is a research org rather than a productized offering.
- **Google DeepMind GNoME**
  ([data:competitor_matrix.csv:google-deepmind-gnome]) is the most
  aggressive science play but has not yet shipped a customer-facing
  product.

We position Lupine as the **infrastructure layer** any of these
hyperscalers would license or acquire. Open-core makes us licensable;
the IMMI paper makes us defensible IP; the WebGPU + Rust posture makes
us hyperscaler-compatible.

## The Orbital question

Orbital Materials is the most-similar company on stage and shape:
Series A, foundation MLIP, well-funded, technically credible. The
critical difference:

- **Orbital** sells a model and the inference of that model. They
  succeed if the world standardizes on their MLIP.
- **Lupine** sells the platform that hosts any MLIP and unifies it with
  DFT and MD in one engine. We succeed if MLIPs proliferate.

These are not zero-sum. We expect Orbital to be a partner / interop
target, not a head-on competitor. The matrix above is true today;
co-opetition is the long arc.

## What incumbents will do to us

If we succeed, here is what the incumbents do:

1. **VASP.** Cannot change pricing fast enough; sovereignty drag is
   permanent. Likely outcome: continued slow loss of academic share,
   stable industry hold.
2. **LAMMPS.** Not a competitor — partner. The Sandia governance model
   is compatible with our open core.
3. **Schrödinger.** Could acquire us (most likely) or build a Rust
   competitor (slow, expensive, off-mission). Most likely outcome:
   acquisition conversation by FY28 at scale.
4. **Citrine.** Layer above us. Possible OEM partnership.
5. **Orbital / MatterSim / OMat24.** Co-opetitive. Standardize on a
   hosting interface. Lupine is the engine; they are the model.
6. **Microsoft / IBM / Google.** Wait until we have ARR + revenue
   trajectory; either acquire or copy. Sovereignty narrative
   complicates a hyperscaler cloning strategy because the open-core
   community moats accumulate.

The race we are running is not "be the best simulation engine." It is
"be the platform layer with sufficient mass that strategic acquirers
have to come to us." That is the moonshot path in
`thesis/moonshot-math.md`.
