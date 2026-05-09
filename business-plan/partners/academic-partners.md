# Academic & National-Lab Partners

Source data: `data/partner_targets.csv` (academic and national-lab
rows).

## Why academic + national-lab partners are infrastructure, not customers

Academic partners do three things that no industry partner can:

1. **Validate the science.** Co-authored peer-reviewed publications
   are the cheapest credibility we can buy. The IMMI paper plus
   subsequent collaboration is the foundation.
2. **Train the user base.** Every PhD student who used Lupine for
   their dissertation becomes either a Lupine industry sale in 5 years
   or a Lupine reference. This is the same flywheel that gave LAMMPS
   its position.
3. **Open the funding pipeline.** Federal proposals require academic
   PIs. Co-investigator status on a DMREF / DOE BES / DARPA award is
   how non-dilutive funding flows to a startup at our stage.

The economic ratio is upside-down on purpose: low ACV per partner, very
high strategic value per partner.

## Tier A: Anchor academic partnerships

These are the relationships we build first.

### MIT (Marzari / Kaxiras / Olivetti groups)
- Status: warm
- Unlock: DMREF co-PI candidacy; published validation in Lupine
  benchmark; user reference for the next round
- Year-1 contract potential: $150K (department site license + paid
  pilot of methodology in their group)
- Source: [data:partner_targets.csv:mit-dmref]

### Stanford SUNCAT + Stanford Materials Sciences
- Status: prospective
- Unlock: joint catalyst MLIP pilot in line with ARPA-E CATALCHEM-E
  [data:federal_funding_programs.csv:arpa-e-catalchem]; STTR-eligible
  partnership
- Year-1 contract potential: $250K (catalyst-focused pilot + STTR
  match)
- Source: [data:partner_targets.csv:stanford-suncat]

### Caltech Materials Science
- Status: prospective
- Unlock: DMREF lead-institution candidate; visible in MGI workshops;
  high-profile validation user
- Year-1 contract potential: $150K
- Source: [data:partner_targets.csv:caltech-materials]

### U Michigan PRIME (Sundararaghavan group)
- Status: prospective; direct DARPA program tie
- Unlock: DARPA SURGE/PRIME methodology extension
  [data:federal_funding_programs.csv:darpa-prime]; UQ workflow
  co-author; direct path to defense direct contracts
- Year-1 contract potential: $500K (program extension + named industry
  partner introductions)
- Source: [data:partner_targets.csv:umich-prime]

### Brown University (multi-fidelity UQ)
- Status: prospective
- Unlock: DARPA EQUiPS lineage co-author; methodology validation; paper
  citation pathways into the EQUiPS-derived community
  [data:federal_funding_programs.csv:darpa-equips]
- Year-1 contract potential: $150K
- Source: [data:partner_targets.csv:brown-multifidelity]

### Georgia Tech (phase-field UQ)
- Status: prospective
- Unlock: cross-scale validation partner (atomistic-to-mesoscale UQ
  pathway); DMREF co-PI candidate
- Year-1 contract potential: $150K
- Source: [data:partner_targets.csv:georgia-tech-phasefield]

## Tier B: National laboratory infrastructure

National labs are not customers in the SaaS sense. They are
infrastructure partners who buy via cooperative agreements / CRADAs.

### Materials Project (LBNL / NERSC)
- DOE BES core funding; the canonical materials database.
- Unlock: pymatgen workflow integration, our paper cites Materials
  Project, mutual benchmark interoperability.
- Vehicle: CRADA-style cooperative R&D agreement.
- Year-1 contract potential: $250K (cooperative; mostly in-kind).
- Source: [data:partner_targets.csv:materials-project]

### NIST Materials Measurement Laboratory
- $15M annual budget; FAIR data and autonomous lab coordination remit.
  [data:federal_funding_programs.csv:nist-mml]
- Unlock: reference data + ontology integration; MGI-aligned
  cooperative agreement.
- Year-1 contract potential: $400K
- Source: [data:partner_targets.csv:nist-mml]

### ORNL Center for Nanophase Materials Sciences
- Frontier exascale system; user proposal program.
- Unlock: beam-line + frontier compute access; SBIR Phase II
  co-investigator candidate.
- Year-1 contract potential: $750K (program-tied)
- Source: [data:partner_targets.csv:ornl-cnms]

### Argonne National Laboratory CNM
- Aurora exascale system, AI-optimized; ALCC gateway.
- Unlock: ALCC compute allocations, AI-materials workflow co-author.
- Year-1 contract potential: $750K (program-tied)
- Source: [data:partner_targets.csv:anl-cnm]

### Sandia National Laboratories
- LAMMPS home; Dakota UQ portfolio.
- Unlock: LAMMPS interoperability; UQ software portfolio collaboration.
- Vehicle: CRADA.
- Year-1 contract potential: $400K (mostly in-kind).
- Source: [data:partner_targets.csv:sandia]

### Lawrence Livermore National Laboratory
- Defense materials simulation; stockpile stewardship.
- Unlock: defense-eligible deployment proof point.
- Vehicle: SBIR Phase II co-investigator + CRADA.
- Year-1 contract potential: $400K
- Source: [data:partner_targets.csv:llnl]

## Tier C: Federal R&D agencies (program officers as partners)

These are the program officers we cultivate; the partnership is
proposal-by-proposal but cumulative.

### NSF DMREF program
- $50M+/yr; $1.5–2.0M per award over 4 years.
  [data:federal_funding_programs.csv:nsf-dmref]
- Lupine vehicle: co-PI on a DMREF award through MIT/Caltech/U Michigan.
- Cycle: annual solicitation.

### NSF CSSI program
- $0.5–2M per award over 3-5 years.
  [data:federal_funding_programs.csv:nsf-cssi]
- Lupine vehicle: direct CSSI award to fund open-core sustainability
  (we are squarely on-target for CSSI's "research software with
  sustainability planning" mandate).
- Cycle: every 18 months.

### DOE BES Computational Materials Sciences
- $30M+/yr; $2-3M per year, 3-5 years.
  [data:federal_funding_programs.csv:doe-bes-cms]
- Lupine vehicle: co-PI on integrated theory-computation-experiment
  team; explicit fit for "open-source community codes and validated
  databases."
- Cycle: ~2 year cadence.

### DARPA Defense Sciences Office (DSO)
- Office-wide BAA always open.
  [data:partner_targets.csv:darpa-dso]
- Lupine vehicle: white paper followed by full proposal targeting
  EQUiPS-PRIME methodology extension.
- Cycle: rolling, 6-12 months from white paper to award.

### ARPA-E
- Multiple program lines; OPEN+ rolling.
  [data:partner_targets.csv:arpa-e]
- Lupine vehicle: STTR Phase I/II on catalysis or magnets; CATALCHEM-E
  Jan 2026 deadline is our first explicit shot.
  [data:federal_funding_programs.csv:arpa-e-catalchem]

## How partnerships ladder into revenue

| Year | Anchor partnership effort | Concrete deliverable |
|------|---------------------------|----------------------|
| FY26 | MIT or Caltech co-PI on DMREF; Materials Project CRADA; ARPA-E STTR Phase I | First federal non-dilutive award; first national-lab integration; first peer-reviewed co-authored validation paper |
| FY27 | DARPA white paper on PRIME methodology extension; CSSI award; first national-lab deployment | Direct DARPA contract candidacy; Lupine cited in 3+ federal proposals as named tooling |
| FY28 | DARPA award; DOE BES CMS co-PI; 3+ national labs running Lupine in production user-facility workflows | Federal contract revenue at $4M+; named platform layer in MGI infrastructure |

The non-dilutive money funds the engineering that makes the industry
ACV achievable. Both ladders run in parallel.
