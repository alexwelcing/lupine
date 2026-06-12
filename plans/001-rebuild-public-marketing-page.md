# Plan 001: Rebuild the public marketing page (deck/public/index.html) as a restrained editorial prospectus, delete the retired landing, and put the deck surfaces under the pitch-claims guard

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2be41fd3b..HEAD -- deck/public/index.html deck/public/landing.html tools/validate_pitch_claims.py`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (static HTML rewrite + one allow-list addition; server untouched)
- **Depends on**: none
- **Category**: direction / docs (public-surface quality + factual-claims compliance)
- **Planned at**: commit `2be41fd3b`, 2026-06-10

## Why this matters

`deck/public/index.html` is the page served at `/` of the public "deck" Cloud
Run service — the marketing front door for Lupine Science's investor
narrative. The maintainer explicitly dislikes the current page's design
decisions: it is a dense, dark, seven-section scroller with three font
families, animated SVG orbit rings, gradient headline text, and scroll-reveal
JS. Worse, it makes **forbidden factual claims**: it describes the research
paper as "peer-reviewed … in press" at a named journal, names the journal, and
uses the phrase "founding team" — all of which `brand.config.json` (the single
source of truth) and `tools/validate_pitch_claims.py` explicitly forbid on
public surfaces. The validator never caught this because `deck/public/` is not
in its scan list. Finally, `deck/public/landing.html` is an unreferenced dead
file carrying the *retired* "Unified Engine for Materials Discovery" narrative,
which contradicts the adopted "Step 1 of a real-world Replicator" frame.

After this plan: one public marketing page with a clean, light, editorial
"research prospectus" design; every factual claim compliant with
`brand.config.json`; the dead retired-narrative file deleted; and the deck's
public pages permanently guarded by the pitch-claims validator in CI.

## Current state

Files and roles:

- `deck/server.mjs` — zero-dependency Node HTTP server. Route mapping at
  line 339: `const effectivePath = pathname === '/' ? '/index.html' : pathname === '/access' ? '/access.html' : pathname;`
  It serves files from `deck/public/`, gates `/deck.html` behind a password
  (HTTP 303 to the access gate when unauthenticated), and serves `/health`
  with HTTP 200. **Do not modify this file.**
- `deck/public/index.html` (734 lines) — the current marketing page. Single
  self-contained HTML file, inline `<style>`, small inline `<script>` (scroll
  progress bar, IntersectionObserver reveals, smooth anchor scroll). This is
  the file you will fully rewrite.
- `deck/public/landing.html` (1308 lines) — retired "Unified Engine" pitch.
  Referenced **nowhere** (no link from any page, server, test, or workflow).
  Title at line 6: `<title>Lupine Science — The Future of Computational Materials</title>`.
  You will delete it.
- `deck/public/access.html`, `deck/public/one-pager.html`, `deck/public/deck.html`
  — password gate page, printable one-pager, gated slide deck. **Content out
  of scope** (do not edit), but `access.html` and `one-pager.html` get added
  to the validator's scan list (they are currently clean — verified at plan
  time).
- `deck/server.test.mjs` — node test suite (3 tests) for path normalization
  and password rules. Must keep passing; no changes needed.
- `tools/validate_pitch_claims.py` — CI guard (workflow
  `.github/workflows/pitch-content-validation.yml`). Scans listed surfaces for
  forbidden claims. `SURFACES_STRICT` (lines 28–39) lists files where the
  journal acronym "IMMI" must not appear at all and no `CLAIM_PHRASES` may
  appear. The deck pages are absent from this list.
- `brand.config.json` — single source of truth for brand facts. Key fields:
  - `publication` (lines 114–120): title "The Causal Geometry of Prediction
    Errors in Interatomic Potentials", `status: "in preparation"`,
    `statusLabel: "Working paper"`, and the note: *"do not describe it as
    published, submitted, reviewed, accepted, or assigned to any journal or
    venue."*
  - `founder` (lines 121–126): Alex Welcing, sole founder, contact
    `founders@lupine.science`, note: *"There is ONE founder and no other team
    to mention. Do not present multiple people, a team, or advisors in public
    materials."*
  - `organization.name`: **"Lupine Science"** (the current page's hero eyebrow
    and footer say "Lupine Materials Science" — wrong).

### The factual violations in the current page (all must be absent from the new page)

- `deck/public/index.html:436` (credo card 03): "The first artifact was a
  peer-reviewed paper — *Integrating Materials and Manufacturing Innovation*
  2026, in press."
- `deck/public/index.html:459` and `:507`: "IMMI 2026 paper" / "IMMI 2026"
  as evidence labels.
- `deck/public/index.html:669`: "The capital funds the founding team…"
- `deck/public/index.html:675`: founder bio — "Authored the peer-reviewed
  IMMI 2026 methodology paper … builds the founding team … with advisors from
  the materials-ML community."
- `deck/public/index.html:395` hero eyebrow and `:696` footer: "Lupine
  Materials Science".
- `deck/public/index.html:697` footer: cites `business-plan/value-model/*.csv`
  as source of truth — that directory does not exist in this repo; drop the
  path reference.

### What must be PRESERVED (adopted narrative — do not regress)

The "Step 1 of a real-world Replicator" floor+ceiling narrative is a
deliberate, adopted decision. Keep the narrative structure and these exact
data points (they are the tiered value model):

- Headline frame: "Step 1 of a real-world Replicator." Five phases:
  Phase 1 2025–2030 Trustworthy prediction (← we are here) · Phase 2 2028–2034
  Generative matter · Phase 3 2032–2042 Closed-loop synthesis · Phase 4
  2040–2055 Programmable matter · Phase 5 2050–2080 Quantum-enabled materials.
- Tier discipline with five tiers: Verified (primary source) · Disclosed
  (public filing) · Triangulated (cross-checked) · Projection (modeled) ·
  Directional (30-yr thesis). Every quantitative claim keeps its tier tag.
- The 5-layer matter stack (Application surfaces / Generative matter /
  **Validation & error-correction = Lupine** / Compute substrate / Physical
  reality) with the "observability became its own discipline" structural bet.
- Why-now: three curves (Atomistic ML: MACE → MatterSim → OMat24; Autonomous
  synthesis: A-Lab → MGI 2031; Sovereignty: CHIPS/IRA, "$700B+ announced US
  capex"), "sub-2 meV/atom" foundation-MLIP benchmark point.
- Ceiling: **$7.0T conditional weighted EV** across seven scenarios
  (SaaS-of-record $0.3B/25% → TCP/IP-for-designed-matter $72.0T/4%; copy the
  seven scenario rows' names, horizons, addressables, capture rates,
  multiples, probabilities, and EVs exactly from current index.html lines
  595–601). ~$3.5T unconditional (×50%). Phase-4 addressable ~$4.1T/yr with
  the nine-segment breakdown (lines 551–559). Capture-rate comp table
  (GitHub 0.02% … Synopsys 1.40%, medians 0.22% / 1.15%; lines 572–583).
  Four named acquirers (Microsoft AQE ~$8.0B, Google DeepMind ~$6.0B,
  Synopsys/Cadence ~$6.0B, Schrödinger ~$3.0B; median ~$4.5B).
- Floor: **$332M base DCF** (Bear $37M / Base $332M / Bull $1.62B), worst
  sensitivity corner $234M (+56% over the $150M proposed post), **+39%
  probability-weighted 5-yr IRR with 50% Pr(zero) priced**, five-row outcome
  distribution (Zero 50%/$0 … Asymmetric tail 3%/$15.0B; lines 651–655).
- Ask: **Seed $8M**. Three milestones: Month 12 federal direct contract in
  flight · Month 18 two paid pilots converted to production ($750K–$1.5M ACV)
  · Month 24 DFT engine alpha + open benchmark published.
- Links that must exist on the new page: `mailto:founders@lupine.science`,
  `/access.html?next=%2Fdeck.html` (slide deck), `/one-pager.html`.
- Credo ideas (compress 7 → 5 short entries, keep these): scarcity is an
  engineering problem · the audit layer is a public good (Apache 2.0) · truth
  before product · the right timescale is 30 years · step 1 is unfashionable.

### Corrected replacement copy (use verbatim where the old claim appeared)

- Paper, everywhere it is mentioned: **"the methodology working paper —
  *The Causal Geometry of Prediction Errors in Interatomic Potentials*
  (in preparation)"**. Never "IMMI", never a journal name, never
  "peer-reviewed / in press / submitted". Tier any claim that depended on
  peer-review status as `Directional`, not `Verified`.
- Credo "Truth before product" body: "The first artifact is the methodology
  working paper and the open audit engine, built before raising a dollar.
  The methodology will be cited longer than any single deployment of it. We
  measure the physics first, then we build the engine."
- Founder block: "**Alex Welcing — Founder.** Authored the methodology
  working paper and built the atlas-distill audit engine (Rust) before
  raising a dollar — truth before product. This round builds the team around
  a de-risked thesis: senior MLIP/DFT engineering, scientific software, and
  the first commercial hire." (No "founding team", no advisors.)
- Ask lead: "The capital funds the team, the engineering, and the methodology
  publications that make phase 1 trustworthy…"
- Brand name everywhere: "Lupine Science". Footer line: "Lupine Science ·
  the audit substrate for matter · 2026" followed by: "The floor is a 5-year
  DCF; the ceiling is a probability-weighted 30-year scenario model. Every
  claim is tiered — verified, disclosed, triangulated, projection, or
  directional."
- Phase-1 role line (30-yr arc): "Lupine ships the audit substrate — the
  atlas-distill engine and the methodology working paper — that names where
  simulations fail and compresses that failure into closed-loop
  self-correction."

## The new design (the actual deliverable)

Replace the current dark scroller with a **light editorial prospectus**. The
page should read like a serious research memorandum, not a startup splash
page. Concrete spec — follow it exactly; do not re-introduce elements from
the old design:

**Format**: one self-contained HTML file (`deck/public/index.html`), inline
`<style>`, **zero JavaScript** (`<script>` tags forbidden; use
`html { scroll-behavior: smooth }` for anchors). No external assets except at
most ONE Google Fonts stylesheet request. Total file size ≤ 90 KB.

**Design tokens** (define as CSS custom properties on `:root`):

- Ground: `--paper: #faf9f6` (page), `--paper-deep: #f1efe9` (alternating
  band sections).
- Ink: `--ink: #16181f` (headings/body), `--ink-soft: #5c5f6b` (secondary),
  `--hairline: rgba(22,24,31,0.14)`.
- Single accent, used sparingly (links, "we are here" marker, the Lupine
  layer of the stack): `--lupine: #3d4db3`; hover/dark variant
  `--lupine-deep: #2e3a87`.
- Tier tints (outline-style tags, not filled pills): verified `#1f7a4d`,
  disclosed `#8a6d1f`, triangulated `#705a9e`, projection `#9a5a2e`,
  directional `#5c5f6b`. Tags are 10px uppercase letter-spaced monospace with
  a 1px border in the tint color and transparent background.
- Type: display serif **"Newsreader"** (the one Google Fonts request; opsz
  axis, weights 400/500 + italic 400) for `h1`/`h2` and pull-quote numbers;
  body `system-ui, -apple-system, "Segoe UI", sans-serif`; labels and data
  `ui-monospace, "Cascadia Mono", "SF Mono", monospace`.

**Layout system**:

- Prose measure: max-width `70ch`, left-aligned, centered column
  (`margin-inline: auto`) with `padding-inline: 24px`.
- Data exhibits (tables, scenario lists, the stack) may widen to
  `max-width: 1040px`.
- Section rhythm: each section opens with a monospace section label
  (`01 — The thesis` style, 11px, letter-spacing 0.18em, uppercase,
  `--ink-soft`) above a hairline rule, then a Newsreader `h2`
  (clamp(28px, 4vw, 44px), weight 400, line-height 1.15, `--ink`), then lead
  paragraph(s) at 17–18px / line-height 1.75. Vertical padding
  `clamp(72px, 10vw, 140px)`.
- Tables: real `<table>` semantics, hairline horizontal rules only (no
  vertical rules, no zebra), 14px body, monospace numerals
  (`font-variant-numeric: tabular-nums`), right-aligned numeric columns.
- Scenario/probability rows: replace the old animated gradient "prob-fill"
  bars with a thin (4px) static track in `--paper-deep` and fill in
  `--lupine` at the stated percentage width — pure CSS, no animation.
- Motion: **none**. No reveal-on-scroll, no progress bar, no animated SVG.
  A static bluebonnet/orbit SVG mark in the header is allowed (reuse the
  petal paths from the old hero SVG at lines 384–393, strokes recolored to
  `--lupine`/`--ink-soft`, with all `<animateTransform>` elements removed).
- Mobile: single column below 720px; tables get
  `overflow-x: auto` wrappers; phase strip wraps to a vertical list.
- Accessibility: exactly one `h1`; landmark elements (`header`, `main`,
  `nav`, `footer`); WCAG AA contrast (the tokens above pass on `--paper`);
  `:focus-visible` outlines in `--lupine`.

**Page structure** (in order — 6 sections, down from 7; total copy roughly
40% shorter than the current page):

1. **Masthead/hero** (`header`): small static SVG mark, eyebrow
   "Lupine Science — audit substrate for the matter stack", `h1`
   "Step 1 of a real-world Replicator." (the word "Replicator" in Newsreader
   italic, `--lupine`), two short lead paragraphs (adapt hero copy from
   current lines 398–402, with corrected claims), then the five-phase strip
   as a single hairline-ruled horizontal band (each phase: mono years +
   name; Phase 1 marked "◉ we are here" in `--lupine`).
2. **01 — The thesis** (`#thesis`): five compressed credo entries as a
   numbered list (two-column grid ≥ 900px), each ≤ 45 words with its tier
   tag. Use the corrected "Truth before product" copy above.
3. **02 — The stack** (`#stack`): five-layer table (Layer 5 → Layer 1), the
   Lupine row emphasized with a left `3px solid var(--lupine)` border and
   "this is Lupine" label; close with the "structural bet" paragraph
   (observability analogy) as a block quote with hairline left rule.
4. **03 — Why now** (`#why-now`): three curves as three short ruled columns
   (Atomistic ML / Autonomous synthesis / Sovereignty mandate), preserving
   the data points listed above.
5. **04 — The model** (`#model`): merge old sections 05+06. Open with the
   tier legend (one mono line). Sub-block A "The ceiling — $7.0T conditional
   weighted EV": nine-segment phase-4 addressable as a compact two-column
   table (segment / $), the capture-rate comp table (all 12 rows), the
   seven-scenario distribution with thin static bars, the "what this number
   means" paragraph, and the four acquirer entries as a two-column grid of
   ruled cards (name, ~$ price, two sentences each). Sub-block B "The floor —
   the conservative cross-check": Bear/Base/Bull DCF as three ruled stat
   blocks, the +39% IRR / 2.5% capture / 15.5× comp-median / $99B unlock stat
   row, and the five-row floor outcome distribution. Keep the "floor measures
   the wrong altitude" framing sentence.
6. **05 — The ask** (`#ask`): "Seed $8M — to build the team and ship the
   audit substrate." Corrected ask lead and founder block (copy above), the
   three milestones as a ruled three-column row, then the CTA row: a solid
   `--lupine` button `founders@lupine.science →` (mailto) and two hairline
   secondary links (slide deck via `/access.html?next=%2Fdeck.html`,
   one-pager via `/one-pager.html`).

Footer (`footer`): corrected footer line + tier sentence + links
(`#thesis` "Top", slide deck, one-pager).

`<head>` requirements: `<title>Lupine Science — Step 1 of a real-world
Replicator</title>`; meta description and `og:title`/`og:description`
adapted from the current ones (lines 7–9) **minus** any claim that the audit
layer is peer-reviewed; `<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
`lang="en"`.

## Commands you will need

| Purpose | Command (run from repo root) | Expected on success |
|---|---|---|
| Deck tests | `cd deck && npm test` | `pass 3`, `fail 0` |
| Claims guard | `python tools/validate_pitch_claims.py` | `PITCH CLAIM GUARD: PASS`, exit 0 |
| Local smoke | `cd deck && INVESTOR_DECK_PASSWORD=test-only-local node server.mjs` (background), then curl as in Step 5 | see Step 5 |

There is no build/lint/typecheck step for `deck/` — it is dependency-free
static HTML + one server file.

## Scope

**In scope** (the only files you may modify/create/delete):

- `deck/public/index.html` — full rewrite.
- `deck/public/landing.html` — delete.
- `tools/validate_pitch_claims.py` — add three entries to `SURFACES_STRICT`.
- `plans/README.md` — status row update at the end.

**Out of scope** (do NOT touch, even though they look related):

- `deck/server.mjs`, `deck/server.test.mjs` — the serving contract is
  correct as-is.
- `deck/public/deck.html`, `deck/public/one-pager.html`,
  `deck/public/access.html` — separate surfaces; content edits are a
  follow-up.
- `.github/workflows/*` — the deploy and validation workflows already cover
  the changed paths.
- `library-site/`, `atlas/`, `raise/`, `brand.config.json` — other surfaces
  and the source of truth itself.

## Git workflow

- Work on the current branch of your (isolated) worktree; do not push, do
  not open a PR.
- Conventional commits, matching repo style (e.g. `feat(deck): …`,
  `chore(deck): …` — see `git log --oneline -5`). One commit per step or one
  commit overall is acceptable.

## Steps

### Step 1: Drift check and baseline

Run the drift check from the header. Then confirm baselines:

**Verify**: `cd deck && npm test` → `pass 3, fail 0`.
**Verify**: `python tools/validate_pitch_claims.py` → exit 0.

### Step 2: Delete the retired landing page

Delete `deck/public/landing.html`.

**Verify**: `grep -rn "landing.html" deck/ .github/` → no matches.

### Step 3: Rewrite `deck/public/index.html`

Write the new page exactly per "The new design" section above, preserving
every data point in "What must be PRESERVED" and using the corrected copy
verbatim where specified.

**Verify** (all from repo root):
- `grep -cin "in press\|in-press\|submitted\|Integrating Materials\|IMMI\|founding team\|co-founder\|advisor\|Lupine Materials Science\|business-plan/" deck/public/index.html` → `0`
- `grep -c "<script" deck/public/index.html` → `0`
- `grep -c "<h1" deck/public/index.html` → `1`
- `grep -c 'mailto:founders@lupine.science' deck/public/index.html` → at least 1
- `grep -c 'access.html?next=%2Fdeck.html' deck/public/index.html` → at least 1
- `grep -c 'one-pager.html' deck/public/index.html` → at least 1
- For each of these strings, `grep -c "<string>" deck/public/index.html` ≥ 1:
  `$7.0T`, `$332M`, `+39%`, `$8M`, `$4.5B`, `sub-2 meV/atom`, `Apache 2.0`,
  `2025–2030`, `2050–2080`
- File size: `wc -c deck/public/index.html` → ≤ 92160 bytes.

### Step 4: Add the deck's public pages to the claims guard

In `tools/validate_pitch_claims.py`, append to `SURFACES_STRICT` (after line
38's last entry, keeping list style):

```python
    "deck/public/index.html",
    "deck/public/access.html",
    "deck/public/one-pager.html",
```

**Verify**: `python tools/validate_pitch_claims.py` → `PITCH CLAIM GUARD:
PASS`, exit 0. If it FAILS citing `access.html` or `one-pager.html`, that is
a STOP condition (those files were clean at plan time — they have drifted).

### Step 5: Serve and smoke-test

From `deck/`: start `INVESTOR_DECK_PASSWORD=test-only-local PORT=8787 node server.mjs`
in the background, then:

- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/` → `200`
- `curl -s http://localhost:8787/ | grep -c "Step 1 of a real-world"` → ≥ 1
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/health` → `200`
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/deck.html` → `303`
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/landing.html` → `404`

Stop the server afterwards.

**Verify**: all five status codes/counts as listed.

## Test plan

No new automated tests: the page is static HTML with zero JS, and the
serving contract is already covered by `deck/server.test.mjs` (which must
keep passing — that is the regression gate for Step 2's deletion and the
server-contract assumption). The grep gates in Step 3 are this plan's
content-regression tests; the validator addition in Step 4 makes the factual
gates permanent in CI (`.github/workflows/pitch-content-validation.yml`).

## Done criteria

ALL must hold:

- [ ] `cd deck && npm test` → `pass 3, fail 0`
- [ ] `python tools/validate_pitch_claims.py` → exit 0, with
      `deck/public/index.html` present in `SURFACES_STRICT`
- [ ] `deck/public/landing.html` does not exist
- [ ] Every grep/curl gate in Steps 3 and 5 passes
- [ ] `git status` shows changes only to in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The drift check shows `deck/public/index.html` or
  `tools/validate_pitch_claims.py` changed since `2be41fd3b`.
- `cd deck && npm test` fails **before** you make any change (broken
  baseline).
- Step 4's validator run flags `access.html` or `one-pager.html`.
- Any verification fails twice after a reasonable fix attempt.
- You find a reference to `landing.html` anywhere outside `deck/public/`
  (it was unreferenced at plan time).
- Preserving a required data point would force you to exceed the 90 KB
  budget — report rather than silently dropping data.

## Maintenance notes

- `brand.config.json` `publication.statusLabel` is the single source of
  truth for paper status. When the paper's status changes, update
  `brand.config.json` first, then this page — never the reverse.
- The validator now scans the deck's three public pages; any future copy
  edit there that mentions the journal, paper status, or team size will fail
  CI (`pitch-content-validation.yml`) — that is intended.
- The deck deploys from the `deck` branch via
  `.github/workflows/deploy-deck.yml`; merging to `main` alone does not ship
  it.
- Deferred follow-ups (intentionally out of scope): restyling
  `access.html` / `one-pager.html` / `deck.html` to the new design language;
  adding `deck.html` (gated) to the claims guard.
- Reviewer scrutiny: confirm the seven ceiling scenarios and five floor
  outcomes were carried over without transcription errors, and that no
  "peer-reviewed"/journal language crept back into meta tags.
