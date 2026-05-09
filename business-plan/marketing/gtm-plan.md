# Go-to-Market Plan

## The thesis

Lupine wins by laddering revenue surfaces through credibility tiers,
not by paid acquisition. The motion is: open-source community →
academic adoption → national-lab cooperation → federal proposal wins
→ industry pilot → industry production. Each tier underwrites the next.

Capital is allocated against this ladder in
`financials/use-of-funds.md`. The plan below is the *time-sequenced
execution* of that allocation.

## The 24-month sequencing

### Months 0-3 (FY26 Q1): Wedge

Goal: ship Lupine View 1.0 with adoption, establish the open-source
community channel, file the first federal proposal.

- Lupine View 1.0 GA: LAMMPS dump/log parsing, 10M+ atom rendering,
  publication-quality export.
- 50K+ unique users on lupine.science View by month 3 (baseline goal,
  comparable to NGLView early traction).
- File NSF CSSI proposal; submit ARPA-E STTR Phase I via Stanford
  SUNCAT collaboration (Jan 26 2026 deadline,
  [data:federal_funding_programs.csv:arpa-e-catalchem]).
- Sign first Materials Project CRADA conversation
  ([data:partner_targets.csv:materials-project]).

### Months 4-9 (FY26 Q2-Q3): First paid pilots

Goal: 2 paid industry pilots, 1 academic anchor partnership.

- Convert Lupine View user base into Tier 1/Tier 2 academic
  subscriptions; target 10 paying academic groups by month 9.
- Sign first paid industry pilot ($150K Phase 1
  [data:unit_economics.csv:acv-industry-pilot]); preferred targets
  are battery startups (Sila, Form Energy, QuantumScape) where the
  cycle-time pressure is highest
  ([data:partner_targets.csv:qsa-lithium, form-energy]).
- File DMREF proposal as co-PI through MIT or Caltech
  ([data:partner_targets.csv:mit-dmref, caltech-materials]).
- Begin DARPA white-paper drafting on PRIME methodology extension
  ([data:partner_targets.csv:darpa-dso]).

### Months 10-12 (FY26 Q4): MD engine alpha

Goal: ship MD engine alpha; first national-lab cooperative agreement.

- LAMMPS-compatible LJ/EAM/Tersoff potentials; bit-identical force
  verification.
- 2 paid industry pilots running; 1 academic Tier 2 site licensed.
- Materials Project CRADA signed.
- DMREF subaward decision (typical 6-9 month cycle).

### Months 13-18 (FY27 H1): Federal proposal cycle hits

Goal: first federal direct contract revenue; second industry pilot
batch; ML pipeline beta.

- ARPA-E STTR Phase II (typical $1M, 24 months
  [data:federal_funding_programs.csv:doe-sbir-2]).
- DARPA white paper → full proposal; 6-12 months from white paper to
  award.
- 5-10 paid industry pilots running (cumulative).
- ML inference pipeline beta: MACE / NequIP / ORB hosting; active
  learning loop.

### Months 19-24 (FY27 H2): DFT engine + first conversion

Goal: ship DFT engine alpha; first paid pilot converts to production;
non-dilutive bridge in place if needed.

- DFT engine alpha: PAW DFT, JTH datasets, validated against VASP on
  `atlas-distill` benchmark suite.
- First $750K production conversion (industry mid-tier).
- DARPA direct contract decision; if positive, $2M+/yr ACV begins.
- 1 enterprise pilot in flight (semi or aerospace prime).

## Channels

### Channel 1: Open-source community (no paid spend)

The dominant top-of-funnel. Operates through:

- GitHub: `atlas-distill`, `lupine-distill`, viewer engine.
  Tutorial repositories, benchmark replication kits, methodology
  notebooks.
- Conferences: APS March Meeting, MRS, Supercomputing, AIChE,
  TMS. Talk slots and tutorial sessions, not booth marketing.
- Academic publication: IMMI 2026 + 2-3 follow-on papers in 2026-2027
  on benchmark methodology, ML potential UQ, and sovereignty / open-
  source infrastructure for materials.
- Newsletter / blog: technical depth, monthly cadence, no marketing
  fluff. Sloppy-model methodology, benchmark releases, methodology
  defenses.

### Channel 2: Federal program officer relationships

Cultivated through:

- Direct meetings with NSF DMREF, DOE BES CMS, DARPA DSO, ARPA-E
  program officers.
- Workshop participation: MGI annual workshops, NIST Materials Data
  workshops, OpenKIM consortium meetings.
- White papers: 2-3 per year on infrastructure topics aligned with
  agency priorities (UQ, autonomous experimentation, FAIR data,
  ITAR-eligible deployment).

### Channel 3: Direct industry sales

Through:

- Targeted outreach to named accounts in `data/partner_targets.csv`.
- Champion-driven entry: technical champion at customer (typically
  a senior materials engineer or computational lead) → procurement
  → executive sponsor.
- Paid POC as standard entry: $150K Phase 1, 3 months, contractable
  deliverable.

We do not run paid digital advertising in years 1-2. CAC math
[data:unit_economics.csv:cac-academic, cac-industry-pilot,
cac-defense] does not justify it.

### Channel 4: Strategic-acquirer relationships

Cultivated as a long-arc channel for the asymmetric exit path:

- Bi-annual founder-level meetings with corporate development at
  Synopsys, Cadence, Schrödinger, Microsoft, IBM, Google.
- Selective co-marketing where natural (e.g. Microsoft Azure Quantum
  Elements joint webinar; Citrine workflow integration).
- These conversations don't drive year-1 revenue but they shape the
  exit landscape years 3-5.

## Sales process by deal type

### Academic Tier 1 / Tier 2

```
Lupine View user (community)
   -> Email signup + opt-in (newsletter)
      -> Free trial of paid tier
         -> Tier 1 conversion (self-serve checkout)
            -> Tier 2 upsell (named-account flow, 1 sales call)
```

Average sales cycle: 2-8 weeks. Self-serve up to Tier 2 mid-band.

### Industry pilot

```
Inbound or targeted outreach
   -> Discovery call (founder + tech lead from customer)
      -> Scoping memo (1 week)
         -> Statement of work + pricing (Phase 1 paid POC at $150K)
            -> Procurement (4-12 weeks)
               -> Phase 1 kickoff
                  -> Phase 1 delivery (3 months)
                     -> Phase 2 production proposal
```

Average sales cycle: 4-9 months from first call to Phase 1 kickoff.

### Federal direct contract

```
Program-officer meeting (founder)
   -> White paper (2 weeks of effort)
      -> Program-officer feedback
         -> Full proposal (4-8 weeks of effort, multi-PI assembly)
            -> Award decision (3-6 months)
               -> Award initiation
```

Average sales cycle: 9-15 months from initial meeting to award. Hit
rate at our stage: 25-35%.

## Lead-generation targets per quarter

| Source | Q1 leads | Q2 | Q3 | Q4 | Conversion target |
|--------|----------|-----|-----|-----|-------------------|
| Open-source community → academic | 50 | 100 | 200 | 400 | 5% to paid Tier 1 |
| Conference / publication → industry | 5 | 10 | 20 | 30 | 10% to paid pilot |
| Federal program officer | 2 | 4 | 6 | 8 | 30% to white paper, 25% white paper to award |
| Strategic acquirer relationship | 1 | 2 | 3 | 4 | not measured by conversion |

## Brand investments

In FY26-27 we invest in three brand assets:

1. **Lupine View at lupine.science** — the wedge. Ship continuously.
2. **The IMMI paper + 2-3 follow-on technical pieces** — the
   credibility floor.
3. **Quarterly benchmark releases** — the proof points. Publish
   improvements to the 23 × 12,000 phonon benchmark, MLIP fine-tuning
   reports, sovereign-deployment case studies.

We do *not* invest in: a brand video budget, a sales-ops platform,
paid-ads budget, demand-gen tooling. Those are FY28+ investments.

## Hiring plan tied to GTM

| FY | GTM hire | Trigger |
|----|----------|---------|
| 26 | Technical GTM #1 (sales engineer / customer success hybrid) | Day 1 of round |
| 27 | Technical GTM #2 + #3 | First paid industry pilot signed |
| 28 | Head of Sales (player-coach) | $5M ARR; second federal contract running |
| 29 | Channel partnerships lead | Hyperscaler co-marketing live |
| 30 | VP Sales | $25M ARR or scale-stage round |

The hiring discipline is: only hire when there is a deal in flight that
the role would close. Pre-hiring sales staff is the most common cause
of seed-stage burn we want to avoid.
