# Journal Targeting Strategy — the trilogy plus the law paper

Drafted 2026-06-11. Decisions marked RECOMMENDED are proposals for Alex's
sign-off, not commitments.

## Paper 2 — "The Projection Law" (the priority decision)

**RECOMMENDED primary: Physical Review X.**
Rationale: no length limit (the theorem chain + three evidence layers + honest
failure reporting need room); receptive to formal-plus-empirical "law" papers;
the sloppy-models lineage this work descends from published its landmarks in
APS journals, so the reviewer pool understands both the geometry and the
materials substrate; fully open access; preprint-friendly. Cost: REVTeX
reformat; PRX's bar is "broad interest + substantial advance" — the
cross-layer table and the consensus-inversion corollary are the case.

**Alternative A: PNAS (Direct Submission).** Precedent: Mao et al. 2024 (the
closest intellectual neighbor) is PNAS. Dual classification Applied Physical
Sciences / Statistics fits the cross-domain claim. Cost: ~9-page limit forces
the theory into SI; the Lean artifact becomes supplementary rather than
co-equal.

**Alternative B: Nature Computational Science.** Strong fit for the
reproducibility stack (pre-registration + tiered kit + machine-checked theory
is exactly their editorial taste). Cost: ~3,000-word main text — severe
compression; the law risks reading as a methods piece.

**Not recommended for P2:** npj Computational Materials (scopes the law down
to its substrate), JMLR/NeurIPS (the evidence is physical, the math is
classical), SIAM/ASA JUQ (right topic, wrong visibility for a flagship claim).

**Preprint plan:** arXiv simultaneous with submission. Primary
cond-mat.mtrl-sci, cross-list stat.ME and cs.LG (the audit showed the
adjacent audiences live in all three). Lean artifact: tagged release +
Zenodo DOI bundled with the replication kit, cited from the paper.

**Required before submission (any venue):**
1. Figures — the manuscript currently has none. Minimum four: (F1) schematic
   of the projection law and the three-layer stack; (F2) 4×2 cosine matrix
   (architecture × functional) with the anchors; (F3) ACWF pair matrix
   showing table-vs-code clustering, SIESTA visibly apart; (F4) the
   three-estimator consilience against the PR(ρ) curve.
2. Final DOI pass on references.bib (all entries verified against live
   sources 2026-06-11 except boe2018 page range and gao2015 — re-verify on
   format conversion).
3. The adversarial multi-agent review pass (ask #5) on the assembled
   manuscript.
4. Suggested reviewers: one from sloppy-models (Transtrum — framework
   lineage, not a collaborator), one from MLIP UQ (Ceriotti group), one from
   climate dependence (Abramowitz or Annan — the cross-domain claim should be
   reviewed by the community whose practices it touches), one from ACWF
   (data-reuse courtesy; check journal conflict rules — data authorship is
   not authorship).

## IMMI-formatted version of Paper 2 (prepared 2026-06-11)

`immi/projection-law-immi.tex` — same content as the master, reformatted to
IMMI conventions: structured abstract (Purpose/Methods/Results/Conclusion,
matching Paper 1's house style), keywords, numbered Springer citations
(unsrtnat), single column, full Declarations block (funding, competing
interests, data/code availability, author contributions, AI-use disclosure),
Discussion section retitled toward benchmarking/VVUQ, Huang 2025
transfer-learning tie-in added to the MLIP section. Keeps the option of
submitting Papers 1+2 as companions to the same journal. CONTENT SYNC RULE:
the PRX master (`projection-law.tex`) is canonical; propagate edits to the
IMMI copy before either submission. ORCID placeholder in the author block
needs Alex's real ORCID.

## Paper 1 — IMMI (locked; no change)

Decision already logged. Synergy note: arXiv Paper 1 at the same time as
Paper 2's preprint so the law paper's \citep{welcing2026instance} resolves to
a public document. Open items remain in the submission log.

## Paper 3 — the Lean formalization

When written, target **Certified Programs and Proofs (CPP)** or **ITP** for
the formalization-methods audience, or the **Journal of Automated Reasoning**
for an archival version. Angle: machine-checked epistemology of model
ensembles bound to live experiments by a contract — no precedent found in the
audit. Timing: after Paper 2 is public, so the formalized object has a
citable statement.

## Sequencing

1. Figures for P2 → adversarial review → arXiv (P2 + P1 together).
2. PRX submission; IMMI submission per its own checklist.
3. P3 drafted against the public P2.
