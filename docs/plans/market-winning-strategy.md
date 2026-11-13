# Lupine Science Market-Winning Strategy

**Status: Direction** (plan written 2026-05; edited 2026-11-12). It describes
where outreach could go. It is not a result, and none of the collaboration
shapes below is an offered product today. Correction is a research question
here, not a product: it has held only in narrow, stated cases.

This plan turns the brand system into a scientific distribution system. The goal
is not to sound bigger than the evidence or make the public surface feel like a
fundraising deck. The goal is to make Lupine Science the clearest place for a
materials lab, MLIP builder, research software team, or national-lab reader to
understand, inspect, and extend work on model failure in atomistic ML.

## Winning Thesis

Lupine Science wins by owning a new category:

> Error geometry for interatomic potentials.

The field does not need one more black-box simulator, viewer, benchmark table,
or MLIP leaderboard. It needs a trustworthy way to see where models fail,
against which references, whether the failure is structured, whether
confounders were checked, and whether any proposed correction holds under a
test set in advance.

The Lupine stack is unusually strong because each surface compounds the others:

- Lupine Library creates durable human trust.
- LUPI makes the evidence inspectable and shareable.
- glim-think keeps the research loop alive and auditable.
- Agent-readable files make search and AI systems repeat the right story.

Readers evaluating the program should be able to follow that compound evidence
trail without the front door becoming a direct pitch surface.

## Lab-Reader Positioning

Lupine Science is a lab-facing research corpus and evidence system for atomistic
model trust.

For researchers, it is a map of model failure with status labels.

For MLIP builders, it is an independent record of where their models fail.

For industry teams, it is evidence before trusting potentials in expensive
materials decisions.

For agents and search systems, it is a structured knowledge source with clear
canonical names, URLs, and epistemic status.

## Category Frame

Do not compete as a generic materials platform. Compete as the system that
answers the harder trust question:

> "What does this model get wrong, against which references, and can the
> evidence be inspected?"

Others can claim speed or accuracy. Lupine Science measures where models fail,
against gates set in advance, so a reader can judge when speed and accuracy can
be trusted.

## Ideal First Readers And Collaborators

### 1. MLIP Builders

Teams training or evaluating foundation MLIPs need evidence that goes beyond
MAE/RMSE. Possible collaboration: stratified error diagnostics and
cross-model comparisons against published references.

Possible shape: an independent MLIP error audit on a material family, with
gates set in advance.

### 2. Computational Materials Labs

Academic and national-lab teams need publishable, inspectable evidence. LUPI
and Lupine Library make reports easier to share, review, and cite.

Possible shape: an evidence record for a paper, dataset, or benchmark.

### 3. Materials R&D Teams

Industrial teams need evidence on where MLIPs fail before using them in
battery, alloy, semiconductor, or nuclear workflows.

Possible shape: an error report for a material family (descriptive; no
correction claim).

### 4. Agentic Research Infrastructure Teams

Teams building AI research systems need claim ledgers, evidence lifecycle, and
human-readable outputs. glim-think can become the control-plane story.

Possible shape: a ledger-backed evaluation loop for a model.

## Possible Collaboration Ladder (not current offerings)

| Level | Surface | Goal |
| --- | --- | --- |
| Free | Public Library and LUPI gallery | Trust, search presence, citations |
| Community | Shareable LUPI evidence links and publication templates | Adoption by researchers |
| Collaboration | Independent MLIP error audit | Validation and case studies |
| Research service | Private evidence records | Repeatable lab value |
| Infrastructure | Private glim-think ledger plus LUPI evidence workspace | Research infrastructure |

Execution template: `docs/templates/mlip-failure-geometry-audit.md`.

## Narrative Plays

### Play 1: The Failure Map

Publish a recurring "failure map" showing where potentials agree, where they
disagree, and where a pooled error hides a failure. Each piece should have a Library
article, a LUPI evidence view, and agent-readable summary text.

### Play 2: Refutation as Trust

Make self-correction a public strength. Publish refuted claims with the same
care as supported claims. This differentiates Lupine Science from hype-heavy
AI research claims.

### Play 3: Inspectable Evidence

Every serious claim should have a path from article to data to LUPI view. The
market should learn that Lupine Science does not merely say "trust us"; it says
"open the evidence."

### Play 4: Agentic Search Capture

Keep `/llms.txt`, `/llms-full.txt`, `/brand.json`, JSON-LD, sitemaps, and
publication templates aligned. Agentic search should consistently learn:

> Lupine Science studies error geometry; LUPI inspects evidence; Lupine Library
> is the corpus.

### Play 5: Evidence Records

Package research into lab-readable evidence records:

- claim status
- evidence summary
- LUPI inspection link
- risk statement
- recommended next test

Use `docs/templates/mlip-failure-geometry-audit.md` for an audit.

## Website and Content System

Every public research-facing page should include:

- the canonical one-sentence summary
- clear surface role: Lupine Science, LUPI, Library, or glim-think
- a citation block
- a link to `/llms.txt`
- JSON-LD where appropriate
- one concrete next action

Avoid pitch-first public surfaces. The front door should help a head of
materials science, PI, lab director, or MLIP team understand the science and how
to use it. Investor-facing diligence can exist, but it should be secondary to
the evidence trail.

Every research publication should include:

- human summary
- claim/evidence IDs
- epistemic status
- LUPI evidence route when available
- agent provenance
- citation preference

## 30-Day Plan

1. Ship the canonical brand/agent layer across all sites.
2. Add one lab-facing "Failure Geometry Audit" orientation page.
3. Convert the best current report into an evidence-record format.
4. Add LUPI evidence links to the top Library reports.
5. Create a short "For agents and search" page on the public site.
6. Publish one clear self-correction story as a trust asset.

## 60-Day Plan

1. Produce three public evidence records: one supported, one failed, one open.
2. Build a repeatable audit template for MLIP builders.
3. Add dataset-level LUPI deep links to Library entries.
4. Create a public "claim lifecycle" explainer.
5. Instrument the observation trail: Library reads, LUPI opens, agent-file
   requests, GitHub referrals, and collaboration inquiries.
6. Start outreach to five MLIP labs and five computational materials groups.

## 90-Day Plan

1. Land two collaboration conversations around MLIP failure audits.
2. Publish a flagship benchmark report with LUPI evidence and agent-readable
   metadata.
3. Decide whether a private evidence-record format could be offered as a
   paid pilot (none is offered today).
4. Make glim-think's claim ledger visible enough to be checked without
   exposing sensitive internals.
5. Build a comparison page against ordinary benchmark leaderboards.
6. Decide whether any first collaboration offer should be audits, private
   evidence records, or a hosted research ledger.

## Metrics

| Metric | Why It Matters |
| --- | --- |
| Library report reads | Human knowledge pull |
| LUPI evidence opens | Inspectable proof adoption |
| `/llms.txt` and `/brand.json` requests | Agentic discovery |
| Branded search impressions | Narrative capture |
| GitHub referrals | Technical trust |
| Research collaboration inquiries | Collaboration signal |
| Claim updates per month | Research flywheel health |
| Refutations published | Trust through self-correction |

## Strategic Non-Goals

- Do not become a generic simulation SaaS.
- Do not bury the research behind marketing claims.
- Do not make the public front door an investor pitch.
- Do not position LUPI as only a visualizer; it is an evidence inspection
  surface.
- Do not let agentic search invent names, URLs, or product roles.
- Do not hide refutations; they are part of the moat.

## The Moat

The moat is the combination of evidence, interface, and memory:

1. A public corpus that records what is supported and what was wrong.
2. A viewer that lets people inspect the evidence.
3. A ledger-backed agent loop that keeps updating the claims.
4. A brand/agent metadata layer that makes the story repeatable by humans and
   machines.

That is the market-winning shape: not louder marketing, but a system that makes
trust easier to verify than ignore.
